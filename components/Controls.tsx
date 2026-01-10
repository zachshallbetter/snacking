import React, { useState, useRef, useEffect } from 'react';
import { Settings, Code, RotateCcw, Play, Pause, Eye, EyeOff, Maximize, Minimize, Target, Map, Ghost, Shuffle, Palette } from 'lucide-react';
import { AppSettings } from '../types';

interface ControlsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  mergedColors: { base: string };
  jsonOutput: any;
}

export const Controls: React.FC<ControlsProps> = ({ settings, setSettings, mergedColors, jsonOutput }) => {
  const [isHovered, setIsHovered] = useState(false);
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
    // Add a small delay before closing to allow movement between button and panel
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
    <div
      ref={containerRef}
      className="absolute top-6 right-6 z-50"
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
        title="Configuration"
      >
        <Settings size={20} />
      </button>

      {/* Invisible bridge to prevent gap between button and panel */}
      {isHovered && (
        <div 
          className="absolute top-12 right-0 w-12 h-2"
          onMouseEnter={handleMouseEnter}
        />
      )}

      {/* Configuration Panel */}
      {isHovered ? (
        <div
          className="absolute top-14 right-0 w-80 bg-white rounded-2xl shadow-lg border border-neutral-200/50 p-4 flex flex-col gap-3"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
        {/* Auto Eat Section */}
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-neutral-700">Auto Eat</label>
                <button 
                    onClick={() => setSettings(s => ({...s, autoEat: !s.autoEat}))}
                    className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                        settings.autoEat 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-neutral-50 text-neutral-500 border border-neutral-200'
                    }`}
                >
                    {settings.autoEat ? <><Pause size={11}/> Running</> : <><Play size={11}/> Paused</>}
                </button>
            </div>

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Speed</span>
                    <span className="font-medium text-neutral-700">{settings.interval}ms</span>
                </div>
                <input 
                    type="range" 
                    min="50" max="800" step="10"
                    value={settings.interval}
                    onChange={(e) => setSettings(s => ({...s, interval: Number(e.target.value)}))}
                    className="w-full h-1.5 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-neutral-700"
                    style={{
                        background: `linear-gradient(to right, #525252 0%, #525252 ${(settings.interval - 50) / (800 - 50) * 100}%, #E5E7EB ${(settings.interval - 50) / (800 - 50) * 100}%, #E5E7EB 100%)`
                    }}
                />
            </div>

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Bite Size</span>
                    <span className="font-medium text-neutral-700">{settings.biteSizeScale}x</span>
                </div>
                <input 
                    type="range" 
                    min="0.5" max="3.0" step="0.1"
                    value={settings.biteSizeScale}
                    onChange={(e) => setSettings(s => ({...s, biteSizeScale: Number(e.target.value)}))}
                    className="w-full h-1.5 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-neutral-700"
                    style={{
                        background: `linear-gradient(to right, #525252 0%, #525252 ${((settings.biteSizeScale - 0.5) / (3.0 - 0.5)) * 100}%, #E5E7EB ${((settings.biteSizeScale - 0.5) / (3.0 - 0.5)) * 100}%, #E5E7EB 100%)`
                    }}
                />
            </div>

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Drill In Bias</span>
                    <span className="font-medium text-neutral-700">{settings.drillInBias.toFixed(1)}</span>
                </div>
                <input 
                    type="range" 
                    min="0" max="1" step="0.1"
                    value={settings.drillInBias}
                    onChange={(e) => setSettings(s => ({...s, drillInBias: Number(e.target.value)}))}
                    className="w-full h-1.5 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-neutral-700"
                    style={{
                        background: `linear-gradient(to right, #525252 0%, #525252 ${settings.drillInBias * 100}%, #E5E7EB ${settings.drillInBias * 100}%, #E5E7EB 100%)`
                    }}
                />
            </div>

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Bite Roundness</span>
                    <span className="font-medium text-neutral-700">{settings.biteRoundness.toFixed(1)}</span>
                </div>
                <input 
                    type="range" 
                    min="0" max="1" step="0.1"
                    value={settings.biteRoundness}
                    onChange={(e) => setSettings(s => ({...s, biteRoundness: Number(e.target.value)}))}
                    className="w-full h-1.5 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-neutral-700"
                    style={{
                        background: `linear-gradient(to right, #525252 0%, #525252 ${settings.biteRoundness * 100}%, #E5E7EB ${settings.biteRoundness * 100}%, #E5E7EB 100%)`
                    }}
                />
            </div>

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Start Point Randomness</span>
                    <span className="font-medium text-neutral-700">{settings.startPointRandomness.toFixed(1)}</span>
                </div>
                <input 
                    type="range" 
                    min="0" max="1" step="0.1"
                    value={settings.startPointRandomness}
                    onChange={(e) => setSettings(s => ({...s, startPointRandomness: Number(e.target.value)}))}
                    className="w-full h-1.5 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-neutral-700"
                    style={{
                        background: `linear-gradient(to right, #525252 0%, #525252 ${settings.startPointRandomness * 100}%, #E5E7EB ${settings.startPointRandomness * 100}%, #E5E7EB 100%)`
                    }}
                />
            </div>

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Bite Depth Variance</span>
                    <span className="font-medium text-neutral-700">{settings.biteDepthVariance.toFixed(1)}</span>
                </div>
                <input 
                    type="range" 
                    min="0" max="1" step="0.1"
                    value={settings.biteDepthVariance}
                    onChange={(e) => setSettings(s => ({...s, biteDepthVariance: Number(e.target.value)}))}
                    className="w-full h-1.5 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-neutral-700"
                    style={{
                        background: `linear-gradient(to right, #525252 0%, #525252 ${settings.biteDepthVariance * 100}%, #E5E7EB ${settings.biteDepthVariance * 100}%, #E5E7EB 100%)`
                    }}
                />
            </div>
        </div>

        {/* Physics Section */}
        <div className="space-y-2 pt-2 border-t border-neutral-100">
            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Gravity</span>
                    <span className="font-medium text-neutral-700">{settings.gravity.toFixed(2)}</span>
                </div>
                <input 
                    type="range" 
                    min="0.05" max="2.0" step="0.05"
                    value={settings.gravity}
                    onChange={(e) => setSettings(s => ({...s, gravity: Number(e.target.value)}))}
                    className="w-full h-1.5 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-neutral-700"
                    style={{
                        background: `linear-gradient(to right, #525252 0%, #525252 ${((settings.gravity - 0.05) / (2.0 - 0.05)) * 100}%, #E5E7EB ${((settings.gravity - 0.05) / (2.0 - 0.05)) * 100}%, #E5E7EB 100%)`
                    }}
                />
            </div>

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Air Resistance</span>
                    <span className="font-medium text-neutral-700">{settings.drag.toFixed(2)}</span>
                </div>
                <input 
                    type="range" 
                    min="0.80" max="0.99" step="0.01"
                    value={settings.drag}
                    onChange={(e) => setSettings(s => ({...s, drag: Number(e.target.value)}))}
                    className="w-full h-1.5 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-neutral-700"
                    style={{
                        background: `linear-gradient(to right, #525252 0%, #525252 ${((settings.drag - 0.80) / (0.99 - 0.80)) * 100}%, #E5E7EB ${((settings.drag - 0.80) / (0.99 - 0.80)) * 100}%, #E5E7EB 100%)`
                    }}
                />
            </div>
        </div>

        {/* Visuals Section */}
        <div className="space-y-1.5 pt-2 border-t border-neutral-100">
            <div className="flex justify-between items-center py-1">
                <label className="text-sm text-neutral-700">Onion Skin</label>
                <button 
                    onClick={() => setSettings(s => ({...s, showOnionSkin: !s.showOnionSkin}))} 
                    className={`p-1.5 rounded-lg transition-colors ${settings.showOnionSkin ? 'bg-blue-50 text-blue-600' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                    <Ghost size={16} />
                </button>
            </div>

            <div className="flex justify-between items-center py-1">
                <label className="text-sm text-neutral-700">Show Next Bite</label>
                <button 
                    onClick={() => setSettings(s => ({...s, showNextBitePreview: !s.showNextBitePreview}))} 
                    className={`p-1.5 rounded-lg transition-colors ${settings.showNextBitePreview ? 'bg-blue-50 text-blue-600' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                    <Target size={16} />
                </button>
            </div>

            <div className="flex justify-between items-center py-1">
                <label className="text-sm text-neutral-700">Structure</label>
                <button 
                    onClick={() => setSettings(s => ({...s, showStructurePreview: !s.showStructurePreview}))} 
                    className={`p-1.5 rounded-lg transition-colors ${settings.showStructurePreview ? 'bg-blue-50 text-blue-600' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                    <Map size={16} />
                </button>
            </div>

            <div className="flex justify-between items-center py-1">
                <label className="text-sm text-neutral-700">Show Bite Cursor</label>
                <button 
                    onClick={() => setSettings(s => ({...s, showDebug: !s.showDebug}))} 
                    className={`p-1.5 rounded-lg transition-colors ${settings.showDebug ? 'bg-blue-50 text-blue-600' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                    {settings.showDebug ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
            </div>

            <div className="flex justify-between items-center py-1">
                <label className="text-sm text-neutral-700">Random Placement</label>
                <button 
                    onClick={() => setSettings(s => ({...s, randomBitePlacement: !s.randomBitePlacement}))} 
                    className={`p-1.5 rounded-lg transition-colors ${settings.randomBitePlacement ? 'bg-blue-50 text-blue-600' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                    <Shuffle size={16} />
                </button>
            </div>

            <div className="flex justify-between items-center py-1">
                <label className="text-sm text-neutral-700">Color Dominance</label>
                <button 
                    onClick={() => setSettings(s => ({...s, colorDominance: {...s.colorDominance, enabled: !s.colorDominance.enabled}}))} 
                    className={`p-1.5 rounded-lg transition-colors ${settings.colorDominance.enabled ? 'bg-blue-50 text-blue-600' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                    <Palette size={16} />
                </button>
            </div>
            
            <div className="flex justify-between items-center py-1">
                <label className="text-sm text-neutral-700">Animate Reset</label>
                <button 
                    onClick={() => setSettings(s => ({...s, animateExit: !s.animateExit}))} 
                    className={`p-1.5 rounded-lg transition-colors ${settings.animateExit ? 'bg-blue-50 text-blue-600' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                    <Minimize size={16} />
                </button>
            </div>

            <div className="flex justify-between items-center py-1">
                <label className="text-sm text-neutral-700">Animate Spawn</label>
                <button 
                    onClick={() => setSettings(s => ({...s, animateEnter: !s.animateEnter}))} 
                    className={`p-1.5 rounded-lg transition-colors ${settings.animateEnter ? 'bg-blue-50 text-blue-600' : 'text-neutral-400 hover:text-neutral-600'}`}
                >
                    <Maximize size={16} />
                </button>
            </div>

            <div className="flex justify-between items-center py-1">
                <label className="text-sm text-neutral-700">Base Color</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="color" 
                        value={mergedColors.base}
                        onChange={(e) => setSettings(s => ({...s, baseColor: e.target.value}))}
                        className="w-7 h-7 rounded-lg overflow-hidden cursor-pointer border border-neutral-200"
                    />
                    {settings.baseColor && (
                        <button 
                            onClick={() => setSettings(s => ({...s, baseColor: ''}))} 
                            className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                            <RotateCcw size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
        
        {/* JSON Output */}
        <div className="pt-2 border-t border-neutral-100">
            <button 
                onClick={() => setSettings(s => ({...s, showJSON: !s.showJSON}))}
                className="w-full py-2 px-3 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors border border-neutral-200"
            >
                <Code size={14} />
                {settings.showJSON ? 'Hide JSON' : 'Show JSON'}
            </button>
            
            {settings.showJSON && (
                <div className="mt-2">
                    <textarea 
                        readOnly
                        className="w-full h-48 bg-neutral-900 text-neutral-300 text-xs font-mono p-3 rounded-lg resize-none focus:outline-none border border-neutral-700"
                        value={JSON.stringify(jsonOutput, null, 2)}
                    />
                </div>
            )}
        </div>
        </div>
      ) : null}
    </div>
  );
};
