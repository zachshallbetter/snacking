import React, { useState, useRef, useEffect } from 'react';
import { Palette, Settings, X } from 'lucide-react';
import { AppSettings } from '../types';

interface ColorDominanceControlProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  detectedColors?: Array<{ color: string, percentage: number }> | null;
}

export const ColorDominanceControl: React.FC<ColorDominanceControlProps> = ({ settings, setSettings, detectedColors }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setShowPopover(false);
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
    <div 
      ref={containerRef}
      className="absolute top-6 right-20 z-50"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button */}
      <button
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md ${
          isHovered || settings.showColorDominance
            ? 'bg-white text-blue-500 scale-110 ring-4 ring-blue-100' 
            : 'bg-white/80 text-neutral-600 hover:bg-white hover:text-neutral-900'
        }`}
        title="Color Dominance"
        onClick={() => {
          setSettings(s => ({...s, showColorDominance: !s.showColorDominance}));
          if (!settings.showColorDominance) {
            setShowPopover(true);
          }
        }}
      >
        <Palette size={20} />
      </button>

      {/* Invisible bridge to prevent gap between button and popover */}
      {isHovered && (
        <div 
          className="absolute top-12 right-0 w-12 h-2"
          onMouseEnter={handleMouseEnter}
        />
      )}

      {/* Popover */}
      {(isHovered || showPopover) && (
        <div 
          className="absolute top-14 right-0 w-72 bg-white rounded-xl shadow-xl border border-neutral-200/50 p-4 z-[100]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-900">Color Dominance</h3>
            <button 
              onClick={() => {
                setShowPopover(false);
                setIsHovered(false);
              }}
              className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs text-neutral-700">Enable</label>
              <button 
                onClick={() => setSettings(s => ({...s, colorDominance: {...s.colorDominance, enabled: !s.colorDominance.enabled}}))} 
                className={`px-3 py-1 rounded-full transition-all text-xs font-semibold ${
                  settings.colorDominance.enabled 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-neutral-50 text-neutral-500 border border-neutral-200'
                }`}
              >
                {settings.colorDominance.enabled ? 'On' : 'Off'}
              </button>
            </div>

            <div>
              <label className="text-xs text-neutral-600 mb-1.5 block">Detected Colors</label>
              <div className="space-y-2">
                <p className="text-xs text-neutral-500">
                  Colors are automatically detected and separated into regions. The most dominant color is used as the target.
                </p>
                {detectedColors && detectedColors.length > 0 ? (
                  <div className="space-y-1.5">
                    {detectedColors.map((colorData, idx) => {
                      // Validate hex color format
                      const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(colorData.color);
                      const displayColor = isValidHex ? colorData.color : '#000000';
                      
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <div 
                            className="w-5 h-5 rounded border border-neutral-200 flex-shrink-0" 
                            style={{ backgroundColor: displayColor }}
                            title={colorData.color}
                          />
                          <span className="text-neutral-400 font-mono flex-1">{colorData.color}</span>
                          <span className="text-neutral-500">{(colorData.percentage * 100).toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span>Detecting colors...</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-neutral-500 mb-1">
                <span>Tolerance</span>
                <span className="font-medium text-neutral-700">{settings.colorDominance.tolerance.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0" max="1" step="0.05"
                value={settings.colorDominance.tolerance}
                onChange={(e) => setSettings(s => ({...s, colorDominance: {...s.colorDominance, tolerance: Number(e.target.value)}}))}
                className="w-full h-1.5 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-neutral-700"
                style={{
                  background: `linear-gradient(to right, #525252 0%, #525252 ${settings.colorDominance.tolerance * 100}%, #E5E7EB ${settings.colorDominance.tolerance * 100}%, #E5E7EB 100%)`
                }}
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-neutral-500 mb-1">
                <span>Strength</span>
                <span className="font-medium text-neutral-700">{settings.colorDominance.strength.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0" max="1" step="0.05"
                value={settings.colorDominance.strength}
                onChange={(e) => setSettings(s => ({...s, colorDominance: {...s.colorDominance, strength: Number(e.target.value)}}))}
                className="w-full h-1.5 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-neutral-700"
                style={{
                  background: `linear-gradient(to right, #525252 0%, #525252 ${settings.colorDominance.strength * 100}%, #E5E7EB ${settings.colorDominance.strength * 100}%, #E5E7EB 100%)`
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
