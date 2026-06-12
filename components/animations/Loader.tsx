import React from 'react';
import { useShapeEater } from '../../hooks/useShapeEater';
import Crumbs from '../Crumbs';
import { LoaderProps } from '../../types';

export const Loader: React.FC<LoaderProps> = ({
  size = 100,
  color = '#FF4785',
  speed = 200,
  showCrumbs = true,
  crumbColors = ['#FFFFFF', '#FF4785']
}) => {
  const { bites, crumbs, isFinished, reset } = useShapeEater({
    shape: 'circle',
    width: size,
    height: size,
    radius: size / 2 - 10,
    autoPlay: true,
    interval: speed,
    color,
    crumbColors,
    showCrumbs,
    onComplete: () => {
      // Auto-reset when finished
      setTimeout(() => reset(), 500);
    }
  });

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ filter: 'drop-shadow(0 10px 8px rgba(0, 0, 0, 0.04)) drop-shadow(0 4px 3px rgba(0, 0, 0, 0.1))' }}
      >
        <defs>
          <path id="loaderBody" d={`M ${size/2} ${size/2} m -${size/2 - 10} 0 a ${size/2 - 10} ${size/2 - 10} 0 1 0 ${size - 20} 0 a ${size/2 - 10} ${size/2 - 10} 0 1 0 -${size - 20} 0`} />
          <mask id="loaderMask">
            <rect x="0" y="0" width={size} height={size} fill="white" />
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
        
        <g mask="url(#loaderMask)">
          <use href="#loaderBody" fill={color} />
        </g>
      </svg>
      
      {showCrumbs && crumbs.length > 0 && (
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <Crumbs crumbs={crumbs} onUpdate={() => {}} gravity={0.2} drag={0.96} />
        </div>
      )}
    </div>
  );
};
