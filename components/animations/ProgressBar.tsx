import React, { useEffect } from 'react';
import { useShapeEater } from '../../hooks/useShapeEater';
import Crumbs from '../Crumbs';
import { ProgressBarProps } from '../../types';

export const ProgressBar: React.FC<ProgressBarProps> = ({
  width = 300,
  height = 20,
  progress,
  color = '#FF4785',
  backgroundColor = '#E5E7EB',
  showCrumbs = true,
  animated = true
}) => {
  const numericWidth = typeof width === 'string' ? parseInt(width) : width;
  
  const { bites, crumbs, takeBite } = useShapeEater({
    shape: 'line',
    width: numericWidth,
    height: height * 3, // Extra height for crumbs
    progress: animated ? progress : undefined,
    color,
    showCrumbs: animated && showCrumbs,
    autoPlay: false
  });

  // Trigger bites based on progress (non-animated mode)
  useEffect(() => {
    if (!animated && progress > 0) {
      // Calculate how many bites to take based on progress
      const biteCount = Math.floor(progress * (numericWidth / 50));
      // This is a simplified approach - in practice, you'd want more control
    }
  }, [progress, animated, numericWidth]);

  return (
    <div className="relative" style={{ width: numericWidth, height }}>
      {/* Background bar */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor }}
      />
      
      {/* Progress bar with eating effect */}
      <svg
        width={numericWidth}
        height={height}
        viewBox={`0 0 ${numericWidth} ${height}`}
        className="absolute inset-0"
      >
        <defs>
          <rect id="progressBarBody" x="0" y={height * 0.2} width={numericWidth} height={height * 0.6} rx={height * 0.3} />
          <mask id="progressBarMask">
            <rect x="0" y="0" width={numericWidth} height={height} fill="white" />
            {bites.map((bite) => (
              <path
                key={bite.id}
                d={bite.path}
                fill="black"
                transform={`translate(${bite.x}, ${bite.y}) rotate(${bite.rotation}) scale(${bite.scale})`}
              />
            ))}
          </mask>
        </defs>
        
        <g mask="url(#progressBarMask)">
          <use href="#progressBarBody" fill={color} />
        </g>
        
        {/* Fallback progress fill for non-animated mode */}
        {!animated && (
          <rect
            x="0"
            y={height * 0.2}
            width={numericWidth * progress}
            height={height * 0.6}
            rx={height * 0.3}
            fill={color}
          />
        )}
      </svg>
      
      {showCrumbs && animated && crumbs.length > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Crumbs crumbs={crumbs} onUpdate={() => {}} gravity={0.2} drag={0.96} />
        </div>
      )}
    </div>
  );
};
