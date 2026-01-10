import React, { useState, useEffect } from 'react';
import { useShapeEater } from '../../hooks/useShapeEater';
import Crumbs from '../Crumbs';
import { DeleteAnimationProps } from '../../types';

export const DeleteAnimation: React.FC<DeleteAnimationProps> = ({
  onComplete,
  duration = 1000,
  color = '#EF4444',
  showCrumbs = true,
  crumbColors = ['#FFFFFF', '#EF4444', '#DC2626'],
  children
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 200, height: 200 });

  useEffect(() => {
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, [containerRef]);

  const { bites, crumbs, reset, takeBite } = useShapeEater({
    shape: 'rounded-rect',
    width: dimensions.width,
    height: dimensions.height,
    borderRadius: 12,
    autoPlay: isDeleting,
    interval: duration / 20, // ~20 bites over duration
    color,
    crumbColors,
    showCrumbs,
    onComplete: () => {
      setIsDeleting(false);
      if (onComplete) onComplete();
    }
  });

  const startDelete = () => {
    setIsDeleting(true);
    reset();
  };

  return (
    <div className="relative">
      <div
        ref={setContainerRef}
        className="relative overflow-hidden"
        style={{ borderRadius: 12 }}
      >
        {/* Content with mask */}
        <div className="relative">
          <svg
            width={dimensions.width}
            height={dimensions.height}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 10 }}
          >
            <defs>
              <mask id="deleteMask">
                <rect x="0" y="0" width={dimensions.width} height={dimensions.height} fill="white" />
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
            
            <rect
              x="0"
              y="0"
              width={dimensions.width}
              height={dimensions.height}
              fill="white"
              mask="url(#deleteMask)"
              opacity={isDeleting ? 1 : 0}
            />
          </svg>
          
          <div style={{ opacity: isDeleting ? 0 : 1, transition: 'opacity 0.3s' }}>
            {children}
          </div>
        </div>
        
        {showCrumbs && isDeleting && crumbs.length > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <Crumbs crumbs={crumbs} onUpdate={() => {}} gravity={0.3} drag={0.95} />
          </div>
        )}
      </div>
      
      {!isDeleting && (
        <button
          onClick={startDelete}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      )}
    </div>
  );
};
