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
    <div style={{ position: 'relative' }}>
      <div
        ref={setContainerRef}
        style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}
      >
        {/* Content with mask */}
        <div style={{ position: 'relative' }}>
          <svg
            width={dimensions.width}
            height={dimensions.height}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
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
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <Crumbs crumbs={crumbs} onUpdate={() => {}} gravity={0.3} drag={0.95} />
          </div>
        )}
      </div>
      
      {!isDeleting && (
        <button
          onClick={startDelete}
          style={{
            marginTop: '8px',
            padding: '8px 16px',
            backgroundColor: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#DC2626' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#EF4444' }}
        >
          Delete
        </button>
      )}
    </div>
  );
};
