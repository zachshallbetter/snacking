import React from 'react';
import { Settings, Code, RotateCcw, Play, Pause, Eye, EyeOff, Maximize, Minimize, Target, Map, Ghost } from 'lucide-react';
import { AppSettings } from '../types';

interface ControlsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  mergedColors: { base: string };
  jsonOutput: any;
}

export const Controls: React.FC<ControlsProps> = ({ settings, setSettings, mergedColors, jsonOutput }) => {
  return (
    <div className="absolute top-6 right-6 w-80 max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-6 flex flex-col gap-6 z-50">
        <div className="flex items-center gap-2 text-neutral-800 border-b border-neutral-100 pb-4">
            <Settings size={20} />
            <h2 className="font-bold text-lg">Configuration</h2>
        </div>

        {/* Simulation Controls */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-neutral-600">Auto Eat</label>
                <button 
                onClick={() => setSettings(s => ({...s, autoEat: !s.autoEat}))}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${settings.autoEat ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}
                >
                    {settings.autoEat ? <><Pause size={12}/> Running</> : <><Play size={12}/> Paused</>}
                </button>
            </div>

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Speed</span>
                    <span>{settings.interval}ms</span>
                </div>
                <input 
                type="range" 
                min="50" max="800" step="10"
                value={settings.interval}
                onChange={(e) => setSettings(s => ({...s, interval: Number(e.target.value)}))}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
                />
            </div>

                <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Bite Size</span>
                    <span>{settings.biteSizeScale}x</span>
                </div>
                <input 
                type="range" 
                min="0.5" max="3.0" step="0.1"
                value={settings.biteSizeScale}
                onChange={(e) => setSettings(s => ({...s, biteSizeScale: Number(e.target.value)}))}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
                />
            </div>

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Drill In Bias (Peel vs Drill)</span>
                    <span>{settings.drillInBias.toFixed(1)}</span>
                </div>
                <input 
                type="range" 
                min="0" max="1" step="0.1"
                value={settings.drillInBias}
                onChange={(e) => setSettings(s => ({...s, drillInBias: Number(e.target.value)}))}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
                />
            </div>

                <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Bite Roundness (Jagged vs Smooth)</span>
                    <span>{settings.biteRoundness.toFixed(1)}</span>
                </div>
                <input 
                type="range" 
                min="0" max="1" step="0.1"
                value={settings.biteRoundness}
                onChange={(e) => setSettings(s => ({...s, biteRoundness: Number(e.target.value)}))}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
                />
            </div>

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Start Point Randomness</span>
                    <span>{settings.startPointRandomness.toFixed(1)}</span>
                </div>
                <input 
                type="range" 
                min="0" max="1" step="0.1"
                value={settings.startPointRandomness}
                onChange={(e) => setSettings(s => ({...s, startPointRandomness: Number(e.target.value)}))}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
                />
            </div>

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Bite Depth Variance</span>
                    <span>{settings.biteDepthVariance.toFixed(1)}</span>
                </div>
                <input 
                type="range" 
                min="0" max="1" step="0.1"
                value={settings.biteDepthVariance}
                onChange={(e) => setSettings(s => ({...s, biteDepthVariance: Number(e.target.value)}))}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
                />
            </div>
        </div>

        {/* Physics & Visuals */}
        <div className="space-y-4 pt-4 border-t border-neutral-100">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Physics</h3>
                
                <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Gravity (Float vs Fall)</span>
                    <span>{settings.gravity.toFixed(2)}</span>
                </div>
                <input 
                type="range" 
                min="0.05" max="2.0" step="0.05"
                value={settings.gravity}
                onChange={(e) => setSettings(s => ({...s, gravity: Number(e.target.value)}))}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
                />
                </div>

            <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>Air Resistance</span>
                    <span>{settings.drag.toFixed(2)}</span>
                </div>
                <input 
                type="range" 
                min="0.80" max="0.99" step="0.01"
                value={settings.drag}
                onChange={(e) => setSettings(s => ({...s, drag: Number(e.target.value)}))}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
                />
            </div>
        </div>

        {/* Debug & Appearance */}
        <div className="space-y-4 pt-4 border-t border-neutral-100">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Visuals</h3>
                
                <div className="flex justify-between items-center">
                <label className="text-sm text-neutral-600">Onion Skin (Original)</label>
                <button onClick={() => setSettings(s => ({...s, showOnionSkin: !s.showOnionSkin}))} className="text-neutral-400 hover:text-blue-500">
                    {settings.showOnionSkin ? <Ghost size={18} className="text-blue-500"/> : <Ghost size={18} className="text-neutral-200"/>}
                </button>
                </div>

                <div className="flex justify-between items-center">
                <label className="text-sm text-neutral-600">Show Next Bite</label>
                <button onClick={() => setSettings(s => ({...s, showNextBitePreview: !s.showNextBitePreview}))} className="text-neutral-400 hover:text-blue-500">
                    {settings.showNextBitePreview ? <Target size={18} className="text-blue-500"/> : <Target size={18} className="text-neutral-200"/>}
                </button>
                </div>

                <div className="flex justify-between items-center">
                <label className="text-sm text-neutral-600">Structure (Islands/Coast)</label>
                <button onClick={() => setSettings(s => ({...s, showStructurePreview: !s.showStructurePreview}))} className="text-neutral-400 hover:text-blue-500">
                    {settings.showStructurePreview ? <Map size={18} className="text-blue-500"/> : <Map size={18} className="text-neutral-200"/>}
                </button>
                </div>

                <div className="flex justify-between items-center">
                <label className="text-sm text-neutral-600">Show Bite Cursor</label>
                <button onClick={() => setSettings(s => ({...s, showDebug: !s.showDebug}))} className="text-neutral-400 hover:text-blue-500">
                    {settings.showDebug ? <Eye size={18} className="text-blue-500"/> : <EyeOff size={18}/>}
                </button>
                </div>
                
                <div className="flex justify-between items-center">
                <label className="text-sm text-neutral-600">Animate Reset (Shrink)</label>
                <button onClick={() => setSettings(s => ({...s, animateExit: !s.animateExit}))} className="text-neutral-400 hover:text-blue-500">
                    {settings.animateExit ? <Minimize size={18} className="text-blue-500"/> : <Minimize size={18} className="text-neutral-200"/>}
                </button>
                </div>

                <div className="flex justify-between items-center">
                <label className="text-sm text-neutral-600">Animate Spawn (Grow)</label>
                <button onClick={() => setSettings(s => ({...s, animateEnter: !s.animateEnter}))} className="text-neutral-400 hover:text-blue-500">
                    {settings.animateEnter ? <Maximize size={18} className="text-blue-500"/> : <Maximize size={18} className="text-neutral-200"/>}
                </button>
                </div>

                <div className="flex justify-between items-center mt-2">
                <label className="text-sm text-neutral-600">Base Color</label>
                <div className="flex items-center gap-2">
                        <input 
                        type="color" 
                        value={mergedColors.base}
                        onChange={(e) => setSettings(s => ({...s, baseColor: e.target.value}))}
                        className="w-6 h-6 rounded-full overflow-hidden cursor-pointer border-0 p-0"
                        />
                        {settings.baseColor && (
                            <button onClick={() => setSettings(s => ({...s, baseColor: ''}))} className="text-neutral-400 hover:text-neutral-600">
                                <RotateCcw size={14} />
                            </button>
                        )}
                </div>
                </div>
        </div>
        
            {/* JSON Output */}
        <div className="pt-4 border-t border-neutral-100">
            <button 
                onClick={() => setSettings(s => ({...s, showJSON: !s.showJSON}))}
                className="w-full py-2 px-4 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
                <Code size={16} />
                {settings.showJSON ? 'Hide JSON' : 'Show JSON'}
            </button>
            
            {settings.showJSON && (
                <div className="mt-3 relative">
                    <textarea 
                        readOnly
                        className="w-full h-48 bg-neutral-900 text-neutral-300 text-[10px] font-mono p-3 rounded-lg resize-none focus:outline-none"
                        value={JSON.stringify(jsonOutput, null, 2)}
                    />
                </div>
            )}
        </div>

    </div>
  );
};
