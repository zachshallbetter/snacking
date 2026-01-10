import React, { useState, useRef, useEffect } from 'react';
import { Pizza, Cookie as CookieIcon, IceCream, Carrot, Cake, Image as ImageIcon, Circle, Minus, Square, Triangle, Grid3x3 } from 'lucide-react';
import { ITEMS, ItemKey, ITEM_GROUPS } from '../data/items';

interface FoodSelectorProps {
  activeItem: ItemKey;
  onSelect: (key: ItemKey) => void;
}

export const FoodSelector: React.FC<FoodSelectorProps> = ({ activeItem, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getIcon = (key: ItemKey) => {
    switch (key) {
      case 'cookie': return <CookieIcon size={20} />;
      case 'cupcake': return <Cake size={20} />;
      case 'pizza': return <Pizza size={20} />;
      case 'icecream': return <IceCream size={20} />;
      case 'pepper': return <span className="font-bold text-lg leading-none">P</span>;
      case 'carrot': return <Carrot size={20} />;
      case 'pizzaimage': return <ImageIcon size={20} />;
      case 'circle': return <Circle size={20} />;
      case 'line': return <Minus size={20} />;
      case 'container': return <Square size={20} className="rounded-md" />;
      case 'square': return <Square size={20} />;
      case 'triangle': return <Triangle size={20} />;
      default: return null;
    }
  };

  // Collect all items from all groups
  const allItems: ItemKey[] = [];
  Object.values(ITEM_GROUPS).forEach(group => {
    allItems.push(...group.items);
  });

  // Handle hover with delay to prevent accidental closes
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Add a small delay before closing to allow movement between button and popover
    closeTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <nav 
      ref={containerRef}
      className="absolute top-6 left-6 z-40"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button */}
      <button
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md ${
          isHovered
            ? 'bg-white text-blue-500 scale-110 ring-4 ring-blue-100' 
            : 'bg-white/80 text-neutral-600 hover:bg-white hover:text-neutral-900'
        }`}
        title="Select Item"
      >
        <Grid3x3 size={20} />
      </button>

      {/* Invisible bridge to prevent gap between button and popover */}
      {isHovered && (
        <div 
          className="absolute top-12 left-0 w-12 h-2"
          onMouseEnter={handleMouseEnter}
        />
      )}

      {/* Popover Grid */}
      {isHovered && (
        <div 
          className="absolute top-14 left-0 bg-white rounded-2xl shadow-2xl border border-neutral-200/50 p-4 min-w-[280px]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="grid grid-cols-4 gap-2">
            {allItems.map((key) => {
              const item = ITEMS[key];
              const isActive = activeItem === key;
              
              return (
                <button 
                  key={key}
                  onClick={() => {
                    onSelect(key);
                    setIsHovered(false);
                    if (closeTimeoutRef.current) {
                      clearTimeout(closeTimeoutRef.current);
                      closeTimeoutRef.current = null;
                    }
                  }} 
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm ${
                    isActive 
                      ? 'bg-blue-500 text-white scale-110 ring-2 ring-blue-200' 
                      : 'bg-white/60 text-neutral-400 hover:bg-white hover:text-neutral-600 hover:scale-105'
                  }`}
                  title={item.name}
                >
                  {getIcon(key)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};
