import React from 'react';
import { Pizza, Cookie as CookieIcon, IceCream, Carrot, Cake } from 'lucide-react';
import { ITEMS, ItemKey } from '../data/items';

interface FoodSelectorProps {
  activeItem: ItemKey;
  onSelect: (key: ItemKey) => void;
}

export const FoodSelector: React.FC<FoodSelectorProps> = ({ activeItem, onSelect }) => {
  return (
    <nav className="absolute top-6 left-6 z-40 flex flex-col gap-3">
        {Object.keys(ITEMS).map((key) => {
            const k = key as ItemKey;
            const item = ITEMS[k];
            const isActive = activeItem === key;
            return (
            <button 
                key={key}
                onClick={() => onSelect(k)} 
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md ${isActive ? 'bg-white text-blue-500 scale-110 ring-4 ring-blue-100' : 'bg-white/60 text-neutral-400 hover:bg-white hover:text-neutral-600'}`}
                title={item.name}
            >
                {key === 'cookie' && <CookieIcon size={20} />}
                {key === 'cupcake' && <Cake size={20} />}
                {key === 'pizza' && <Pizza size={20} />}
                {key === 'icecream' && <IceCream size={20} />}
                {key === 'pepper' && <span className="font-bold text-lg leading-none">P</span>}
                {key === 'carrot' && <Carrot size={20} />}
            </button>
            );
        })}
    </nav>
  );
};
