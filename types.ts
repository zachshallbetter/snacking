export interface Point {
  x: number;
  y: number;
}

export interface Bite {
  id: number;
  x: number;
  y: number;
  path: string; // The SVG path data for the bite shape
  rotation: number;
  scale: number;
}

export interface Crumb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  life: number; // 0 to 1
  shape: 'triangle' | 'circle' | 'rect';
}

export interface YumConfig {
  cx: number;
  cy: number;
  maxR: number;     // The visual boundary radius
  minDist?: number; // Closest a bite can get to center
  
  // Simulation Settings
  biteSizeScale?: number; // Multiplier for bite size (default 1)
  interval?: number;      // Speed in ms (default 200)
  autoEat?: boolean;      // Toggle auto-eating
  
  // Physics & Visuals
  gravity?: number;       // Downward force (default 0.1 for floaty)
  drag?: number;          // Air resistance (default 0.98)
  showDebug?: boolean;    // Show bite cursor
  showNextBitePreview?: boolean; // Toggle next bite indicator
  showStructurePreview?: boolean; // Toggle structure (islands/perimeter) view
  showOnionSkin?: boolean; // Toggle onion skin of original shape
  resetDuration?: number; // ms to shrink/reset
  animateExit?: boolean;  // Toggle shrink animation on reset
  animateEnter?: boolean; // Toggle grow animation on spawn
  
  // New Configs
  drillInBias?: number;   // 0 (Strict Peel) to 1 (Allow Drill)
  biteRoundness?: number; // 0 (Jagged) to 1 (Smooth)
  startPointRandomness?: number; // 0 (Strict Furthest) to 1 (Random Outer)
  biteDepthVariance?: number; // 0 (Uniform) to 1 (Chaotic Depth)
}

export interface AppSettings {
  baseColor: string;
  biteSizeScale: number;
  interval: number;
  autoEat: boolean;
  gravity: number;
  drag: number;
  showDebug: boolean;
  showNextBitePreview: boolean;
  showStructurePreview: boolean;
  showOnionSkin: boolean;
  resetDuration: number;
  animateExit: boolean;
  animateEnter: boolean;
  drillInBias: number;
  biteRoundness: number;
  startPointRandomness: number;
  biteDepthVariance: number;
  showJSON: boolean;
}