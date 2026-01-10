import React, { useEffect, useRef } from 'react';
import { Crumb } from '../types';

interface CrumbsProps {
  crumbs: Crumb[];
  onUpdate: (updatedCrumbs: Crumb[]) => void;
  gravity?: number;
  drag?: number;
}

export const Crumbs: React.FC<CrumbsProps> = ({ crumbs, onUpdate, gravity = 0.2, drag = 0.96 }) => {
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      const nextCrumbs = crumbs.map(crumb => {
          // Apply Drag (Air Resistance)
          const newVx = crumb.vx * drag;
          const newVy = (crumb.vy + gravity) * drag;

          return {
              ...crumb,
              x: crumb.x + newVx,
              y: crumb.y + newVy,
              vx: newVx,
              vy: newVy,
              rotation: crumb.rotation + crumb.rotationSpeed * drag, // Rotation slows down too
              // Fade out slowly
              life: crumb.life - 0.015
          };
      }).filter(c => c.life > 0); 

      if (crumbs.length > 0 || nextCrumbs.length > 0) {
          onUpdate(nextCrumbs);
      }
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crumbs, gravity, drag]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 479.3 481.2" preserveAspectRatio="xMidYMid meet">
        {crumbs.map(crumb => {
            const opacity = Math.min(1, crumb.life);
            
            if (crumb.shape === 'triangle') {
                const s = crumb.size;
                const h = s * (Math.sqrt(3)/2);
                const path = `M0,-${h/2} L${s/2},${h/2} L-${s/2},${h/2} Z`;
                return (
                    <path 
                        key={crumb.id}
                        d={path}
                        fill={crumb.color}
                        transform={`translate(${crumb.x}, ${crumb.y}) rotate(${crumb.rotation})`}
                        style={{ opacity }}
                    />
                );
            } else if (crumb.shape === 'circle') {
                return (
                    <circle
                        key={crumb.id}
                        cx={0} cy={0} r={crumb.size / 2}
                        fill={crumb.color}
                        transform={`translate(${crumb.x}, ${crumb.y})`}
                        style={{ opacity }}
                    />
                );
            } else {
                 return (
                    <rect
                        key={crumb.id}
                        x={-crumb.size/2} y={-crumb.size/2}
                        width={crumb.size}
                        height={crumb.size * (0.6 + Math.random() * 0.8)}
                        fill={crumb.color}
                        rx={crumb.size * 0.2}
                        transform={`translate(${crumb.x}, ${crumb.y}) rotate(${crumb.rotation})`}
                        style={{ opacity }}
                    />
                );
            }
        })}
      </svg>
    </div>
  );
};

export default Crumbs;