import React, { useState } from 'react';
import YumItem from './components/YumItem';
import { ITEMS, ItemKey } from './data/items';
import { FoodSelector } from './components/FoodSelector';
import { Controls } from './components/Controls';
import { AppSettings } from './types';

export default function App() {
  const [activeItem, setActiveItem] = useState<ItemKey>('cookie');
  
  // Customization State
  const [customSettings, setCustomSettings] = useState<AppSettings>({
    baseColor: '', // empty means use default
    biteSizeScale: 1.5,
    interval: 360,
    autoEat: true,
    gravity: 0.2,
    drag: 0.96,
    showDebug: false,
    showNextBitePreview: true,
    showStructurePreview: false,
    showOnionSkin: false,
    resetDuration: 800,
    animateExit: true,
    animateEnter: true,
    drillInBias: 0.8,
    biteRoundness: 0.9,
    startPointRandomness: 0.5,
    biteDepthVariance: 0.2,
    showJSON: false
  });

  const baseItem = ITEMS[activeItem];
  
  // Merge configurations
  const mergedColors = {
      ...baseItem.colors,
      base: customSettings.baseColor || baseItem.colors.base
  };

  const mergedConfig = {
      ...baseItem.config,
      biteSizeScale: customSettings.biteSizeScale,
      interval: customSettings.interval,
      autoEat: customSettings.autoEat,
      gravity: customSettings.gravity,
      drag: customSettings.drag,
      showDebug: customSettings.showDebug,
      showNextBitePreview: customSettings.showNextBitePreview,
      showStructurePreview: customSettings.showStructurePreview,
      showOnionSkin: customSettings.showOnionSkin,
      resetDuration: customSettings.resetDuration,
      animateExit: customSettings.animateExit,
      animateEnter: customSettings.animateEnter,
      drillInBias: customSettings.drillInBias,
      biteRoundness: customSettings.biteRoundness,
      startPointRandomness: customSettings.startPointRandomness,
      biteDepthVariance: customSettings.biteDepthVariance
  };

  const jsonOutput = {
      id: baseItem.id,
      name: baseItem.name,
      config: mergedConfig,
      colors: mergedColors
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-neutral-100 font-sans">
      
      {/* --- Main Background Canvas --- */}
      <div className="absolute inset-0 flex items-center justify-center">
          
          {/* Background decoration */}
          <div className="absolute inset-0 transition-colors duration-700 pointer-events-none" 
               style={{ backgroundColor: mergedColors.base + '20' }} // 20% opacity
          />
          <div className="absolute inset-0 pointer-events-none opacity-10" 
               style={{ 
                   backgroundImage: `radial-gradient(${mergedColors.shadow} 1.5px, transparent 1.5px)`, 
                   backgroundSize: '32px 32px',
               }} 
          />

          {/* Main Item */}
          <div className="relative z-10 w-full max-w-[90vh] aspect-square flex items-center justify-center p-8 transition-all">
               <YumItem 
                  key={baseItem.id} // Re-mounts on item change
                  svgPath={baseItem.path}
                  viewBox={baseItem.viewBox}
                  colors={mergedColors}
                  config={mergedConfig}
               >
                  {baseItem.decorations}
               </YumItem>
          </div>
          
           <div className="absolute bottom-12 text-neutral-400 font-bold tracking-widest text-sm uppercase opacity-60 pointer-events-none">
             {customSettings.autoEat ? 'Auto Eating Enabled' : 'Click to Eat'}
          </div>
      </div>

      {/* --- Floating Selector UI (Left) --- */}
      <FoodSelector activeItem={activeItem} onSelect={setActiveItem} />


      {/* --- Floating Controls Panel (Right) --- */}
      <Controls 
        settings={customSettings} 
        setSettings={setCustomSettings} 
        mergedColors={mergedColors}
        jsonOutput={jsonOutput}
      />

    </div>
  );
}