import React from 'react';
import { useShapeEater } from '../../hooks/useShapeEater';
import Crumbs from '../Crumbs';
import { ProgressCircleProps } from '../../types';

export const ProgressCircle: React.FC<ProgressCircleProps> = ({
  size = 100,
  progress,
  color = '#FF4785',
  backgroundColor = '#E5E7EB',
  strokeWidth = 8,
  showCrumbs = true,
  animated = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const { bites, crumbs } = useShapeEater({
    shape: 'circle',
    width: size,
    height: size,
    radius,
    progress: animated ? progress : undefined,
    color,
    showCrumbs: animated && showCrumbs,
    autoPlay: false
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <defs>
          <circle id="progressCircleBg" cx={size/2} cy={size/2} r={radius} fill="none" stroke={backgroundColor} strokeWidth={strokeWidth} />
          <circle id="progressCircleBody" cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <mask id="progressCircleMask">
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
        
        {/* Background circle */}
        <use href="#progressCircleBg" />
        
        {/* Progress circle with eating effect */}
        {animated ? (
          <g mask="url(#progressCircleMask)">
            <use href="#progressCircleBody" />
          </g>
        ) : (
          <circle
            cx={size/2}
            cy={size/2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
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
