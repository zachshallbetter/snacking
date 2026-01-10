import React, { useState, useRef, useEffect } from 'react';
import { useYumYum } from '../../hooks/useYumYum';
import Crumbs from '../Crumbs';
import { ImageEaterProps } from '../../types';
import { isDataURI } from '../../utils/image';

const GRID_CELL_SIZE = 10; // Match the hook's grid resolution

export const ImageEater: React.FC<ImageEaterProps & { onColorDominanceDetected?: (dominantColor: string) => void }> = ({
  src,
  maskPath,
  viewBox,
  width = '100%',
  height = '100%',
  colors,
  config,
  onColorDominanceDetected
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isEntering, setIsEntering] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const wasResetting = useRef(false);
  
  // For base64 images, we can pass src immediately (no CORS issues)
  const imageSrcForHook = imageLoaded || isDataURI(src) ? src : undefined;
  const { bites, crumbs, isResetting, scale, triggerBite, updateCrumbs, isFinished, nextBite, structure, colorDominanceData } = useYumYum(config, maskPath, viewBox, colors.crumbs, colors.base, imageSrcForHook);
  
  // Auto-set target color when dominant color is detected
  useEffect(() => {
    if (colorDominanceData && colorDominanceData.dominantColors.length > 0 && config.colorDominance?.enabled) {
      const mostDominant = colorDominanceData.dominantColors[0].color;
      if (onColorDominanceDetected) {
        onColorDominanceDetected(mostDominant, colorDominanceData.dominantColors);
      }
    }
  }, [colorDominanceData, config.colorDominance?.enabled, onColorDominanceDetected]);
  
  const itemKey = maskPath.substring(0, 15);

  useEffect(() => {
    if (wasResetting.current && !isResetting) {
      setIsEntering(true);
      const timer = setTimeout(() => setIsEntering(false), 500);
      return () => clearTimeout(timer);
    }
    wasResetting.current = isResetting;
  }, [isResetting]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    setMousePos({ x: svgP.x, y: svgP.y });
  };

  const handleManualBite = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    triggerBite({ x: svgP.x, y: svgP.y });
  };

  const resetDur = config.resetDuration || 800;
  const shouldShrink = config.animateExit ?? true;
  const shouldGrow = config.animateEnter ?? true;

  let duration = 150;
  let transformScale = scale;
  let opacity = 1;
  let timingFunction = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

  if (isResetting) {
    duration = resetDur * 0.8;
    transformScale = shouldShrink ? 0.05 : 1;
    opacity = 0;
    timingFunction = "ease-in-out";
  } else if (isEntering) {
    duration = shouldGrow ? 500 : 0;
    transformScale = 1;
    opacity = 1;
    timingFunction = "ease-out";
  }

  const transitionStyle = {
    transition: `transform ${duration}ms ${timingFunction}, opacity ${isResetting ? resetDur * 0.5 : 300}ms ease`,
    transform: `scale(${transformScale})`,
    opacity
  };

  const estimatedBiteR = (50 * (config.maxR / 240)) * (config.biteSizeScale || 1);
  
  const vb = viewBox.split(' ').map(Number);
  const vbWidth = vb[2] || 612.8;
  const vbHeight = vb[3] || 626.9;

  return (
    <div 
      className="relative w-full h-full cursor-none select-none touch-manipulation group" 
      onClick={handleManualBite}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <svg
        ref={svgRef}
        key={itemKey}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBox}
        className="w-full h-full drop-shadow-2xl"
        style={transitionStyle}
        onMouseMove={handleMouseMove}
      >
        <defs>
          <path id="imageBody" d={maskPath} />
          {imageLoaded && (
            <image
              id="eaterImage"
              href={src}
              x="0"
              y="0"
              width={vbWidth}
              height={vbHeight}
              preserveAspectRatio="xMidYMid meet"
            />
          )}
          <mask id="imageEaterMask">
            <rect x="-3000" y="-3000" width="10000" height="10000" fill="white" />
            {bites.map((bite) => (
              <path
                key={bite.id}
                d={bite.path}
                fill="black"
                transform={`translate(${bite.x}, ${bite.y}) rotate(${bite.rotation}) scale(${bite.scale})`}
              />
            ))}
          </mask>
          <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#3B82F6" />
          </marker>
        </defs>

        {/* Onion Skin (Original Shape) */}
        {config.showOnionSkin && !isResetting && !isEntering && (
          <path 
            d={maskPath} 
            fill={colors.base} 
            fillOpacity="0.1" 
            stroke={colors.base} 
            strokeWidth="2" 
            strokeDasharray="6,6"
            className="pointer-events-none"
          />
        )}

        {/* Main Image with Mask */}
        <g mask="url(#imageEaterMask)">
          {imageLoaded ? (
            <use href="#eaterImage" />
          ) : (
            <image
              href={src}
              x="0"
              y="0"
              width={vbWidth}
              height={vbHeight}
              preserveAspectRatio="xMidYMid meet"
              onLoad={() => setImageLoaded(true)}
            />
          )}
        </g>
        
        {/* Color Dominance Overlay - Shows all detected color regions */}
        {config.showColorDominance && colorDominanceData && !isResetting && !isEntering && (
          <g className="pointer-events-none">
            {colorDominanceData.regions.map((region, regionIdx) => 
              region.points.map((pt, ptIdx) => (
                <circle 
                  key={`cd-${regionIdx}-${ptIdx}`} 
                  cx={pt.x} 
                  cy={pt.y} 
                  r={GRID_CELL_SIZE / 2} 
                  fill={region.color} 
                  opacity={0.3}
                />
              ))
            )}
          </g>
        )}
        
        {/* Structure Overlay (Islands, Coastline, Tips) */}
        {config.showStructurePreview && !isFinished && !isResetting && (
          <g className="pointer-events-none">
            {structure.perimeter.map((pt, i) => (
              <circle key={`p-${i}`} cx={pt.x} cy={pt.y} r={2} fill="#06B6D4" opacity={0.6} />
            ))}
            {structure.tips?.map((pt, i) => (
              <circle key={`t-${i}`} cx={pt.x} cy={pt.y} r={4} fill="#D946EF" opacity={0.9} />
            ))}
            {structure.islands.map((pt, i) => (
              <circle key={`i-${i}`} cx={pt.x} cy={pt.y} r={3} fill="#EF4444" opacity={0.8} />
            ))}
          </g>
        )}

        {/* Next Bite Preview Overlay */}
        {nextBite && !isFinished && !isResetting && config.showNextBitePreview && (
          <g 
            transform={`translate(${nextBite.x}, ${nextBite.y}) rotate(${nextBite.rotation})`} 
            className="opacity-60 pointer-events-none transition-transform duration-300"
          >
            <path 
              d={nextBite.path} 
              fill="none" 
              stroke="#3B82F6" 
              strokeWidth="3" 
              strokeDasharray="6,4"
              strokeLinecap="round"
            />
            <line 
              x1="0" y1="20" 
              x2="0" y2="-15" 
              stroke="#3B82F6" 
              strokeWidth="3" 
              markerEnd="url(#arrowHead)" 
            />
          </g>
        )}

        {/* Debug Cursor */}
        {!isFinished && isHovering && config.showDebug && (
          <circle 
            cx={mousePos.x} 
            cy={mousePos.y} 
            r={estimatedBiteR} 
            fill="none" 
            stroke="white" 
            strokeWidth="2" 
            strokeDasharray="5,5"
            className="opacity-40 group-hover:opacity-80 transition-opacity duration-200"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>

      {/* Hidden image to trigger load */}
      <img
        src={src}
        alt=""
        className="hidden"
        onLoad={() => setImageLoaded(true)}
      />

      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <Crumbs 
          crumbs={crumbs} 
          onUpdate={updateCrumbs} 
          gravity={config.gravity || 0.2} 
          drag={config.drag || 0.96} 
        />
      </div>
    </div>
  );
};
