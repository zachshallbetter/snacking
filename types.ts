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
  radius?: number; // Optional: bite radius for grid removal calculations
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
  showColorDominance?: boolean; // Toggle color dominance visualization
  resetDuration?: number; // ms to shrink/reset
  animateExit?: boolean;  // Toggle shrink animation on reset
  animateEnter?: boolean; // Toggle grow animation on spawn
  
  // New Configs
  drillInBias?: number;   // 0 (Strict Peel) to 1 (Allow Drill)
  biteRoundness?: number; // 0 (Jagged) to 1 (Smooth)
  startPointRandomness?: number; // 0 (Strict Furthest) to 1 (Random Outer)
  biteDepthVariance?: number; // 0 (Uniform) to 1 (Chaotic Depth)
  randomBitePlacement?: boolean; // If true, bites are placed randomly instead of clockwise
  colorDominance?: {
    enabled: boolean;
    targetColor: string; // Hex color to target
    tolerance?: number; // Color matching tolerance (0-1, default 0.2)
    strength?: number; // How strongly to prefer dominant color areas (0-1, default 0.5)
  };
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
  showColorDominance: boolean;
  resetDuration: number;
  animateExit: boolean;
  animateEnter: boolean;
  drillInBias: number;
  biteRoundness: number;
  startPointRandomness: number;
  biteDepthVariance: number;
  randomBitePlacement: boolean;
  colorDominance: {
    enabled: boolean;
    targetColor: string;
    tolerance: number;
    strength: number;
  };
  showJSON: boolean;
}

// Animation Component Types
export type AnimationShape = 'circle' | 'line' | 'rounded-rect' | 'image' | 'custom';

export interface AnimationConfig {
  shape: AnimationShape;
  // Shape-specific configs
  width?: number;
  height?: number;
  radius?: number; // For circles
  borderRadius?: number; // For rounded rectangles
  imageSrc?: string; // For image eating (URL or base64 data URI)
  maskPath?: string; // SVG path for custom/image masks
  viewBox?: string; // For SVG-based shapes
  
  // Animation settings
  progress?: number; // 0-1 for progress-based animations
  autoPlay?: boolean; // For loaders
  interval?: number;
  biteSizeScale?: number;
  
  // Visual settings
  color?: string;
  crumbColors?: string[];
  showCrumbs?: boolean;
  gravity?: number;
  drag?: number;
  
  // Bite settings
  biteRoundness?: number;
  biteDepthVariance?: number;
  drillInBias?: number;
}

export interface LoaderProps {
  size?: number;
  color?: string;
  speed?: number;
  showCrumbs?: boolean;
  crumbColors?: string[];
}

export interface ProgressBarProps {
  width?: number | string;
  height?: number;
  progress: number; // 0-1
  color?: string;
  backgroundColor?: string;
  showCrumbs?: boolean;
  animated?: boolean;
}

export interface ProgressCircleProps {
  size?: number;
  progress: number; // 0-1
  color?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  showCrumbs?: boolean;
  animated?: boolean;
}

export interface ImageEaterProps {
  src: string; // Image source URL or base64 data URI (data:image/png;base64,...)
  maskPath: string; // SVG path for mask
  viewBox: string;
  width?: number | string;
  height?: number | string;
  colors: {
    base: string;
    shadow: string;
    highlight: string;
    crumbs: string[];
  };
  config: {
    cx: number;
    cy: number;
    maxR: number;
    biteSizeScale?: number;
    interval?: number;
    autoEat?: boolean;
    gravity?: number;
    drag?: number;
    showDebug?: boolean;
    showNextBitePreview?: boolean;
  showStructurePreview?: boolean;
  showOnionSkin?: boolean;
  showColorDominance?: boolean;
  resetDuration?: number;
    animateExit?: boolean;
    animateEnter?: boolean;
    drillInBias?: number;
    biteRoundness?: number;
    startPointRandomness?: number;
    biteDepthVariance?: number;
  };
}

export interface DeleteAnimationProps {
  onComplete?: () => void;
  duration?: number;
  color?: string;
  showCrumbs?: boolean;
  crumbColors?: string[];
  children: React.ReactNode;
}
