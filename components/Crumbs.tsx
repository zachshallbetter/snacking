/**
 * Crumbs — Canvas-based particle system for rendering crumb debris.
 *
 * Renders falling, rotating particles using SVG elements. Accepts a
 * `viewBox` prop to correctly position crumbs relative to the parent shape.
 */

import React, { useEffect, useRef } from 'react';
import { Crumb } from '../types';

interface CrumbsProps {
  /** Array of active crumb particles. */
  crumbs: Crumb[];
  /** Callback to update crumbs after physics tick. */
  onUpdate: (updatedCrumbs: Crumb[]) => void;
  /** SVG viewBox string to match crumb coordinates to the parent shape. */
  viewBox?: string;
  /** Downward acceleration (default 0.2). */
  gravity?: number;
  /** Air resistance multiplier (default 0.96). */
  drag?: number;
}

export const Crumbs: React.FC<CrumbsProps> = ({
  crumbs,
  onUpdate,
  viewBox = '0 0 479.3 481.2',
  gravity = 0.2,
  drag = 0.96,
}) => {
  const requestRef = useRef<number | undefined>(undefined);
  const crumbsRef = useRef(crumbs);

  // Keep ref in sync with latest crumbs prop to avoid stale closures
  useEffect(() => {
    crumbsRef.current = crumbs;
  }, [crumbs]);

  useEffect(() => {
    let prevTime: number | undefined;

    const animate = (time: number) => {
      if (prevTime !== undefined) {
        const currentCrumbs = crumbsRef.current;
        const nextCrumbs = currentCrumbs
          .map(crumb => {
            const newVx = crumb.vx * drag;
            const newVy = (crumb.vy + gravity) * drag;
            return {
              ...crumb,
              x: crumb.x + newVx,
              y: crumb.y + newVy,
              vx: newVx,
              vy: newVy,
              rotation: crumb.rotation + crumb.rotationSpeed * drag,
              life: crumb.life - 0.015,
            };
          })
          .filter(c => c.life > 0);

        if (currentCrumbs.length > 0 || nextCrumbs.length > 0) {
          onUpdate(nextCrumbs);
        }
      }
      prevTime = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gravity, drag, onUpdate]);

  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <svg style={{ width: '100%', height: '100%' }} viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {crumbs.map(crumb => {
          const opacity = Math.min(1, crumb.life);

          if (crumb.shape === 'triangle') {
            const s = crumb.size;
            const h = s * (Math.sqrt(3) / 2);
            const path = `M0,-${h / 2} L${s / 2},${h / 2} L-${s / 2},${h / 2} Z`;
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
                x={-crumb.size / 2} y={-crumb.size / 2}
                width={crumb.size}
                height={crumb.size * 0.8}
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