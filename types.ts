import React from "react";

/**
 * A 2D point with optional distance metadata.
 */
export interface Point {
  x: number;
  y: number;
  dist?: number;
}

/**
 * Represents a single bite taken from a shape.
 */
export interface Bite {
  id: number;
  x: number;
  y: number;
  /** SVG path data for the bite shape. */
  path: string;
  rotation: number;
  scale: number;
  /** Bite radius for grid removal calculations. */
  radius?: number;
}

/**
 * A single particle crumb with physics properties.
 */
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
  /** Remaining life from 0 to 1. */
  life: number;
  shape: "triangle" | "circle" | "rect";
}

/**
 * Configuration for the eating algorithm and visual behavior.
 */
export interface YumConfig {
  /** Center X coordinate of the shape. */
  cx: number;
  /** Center Y coordinate of the shape. */
  cy: number;
  /** Visual boundary radius. */
  maxR: number;
  /** Closest a bite can get to center. */
  minDist?: number;

  // Simulation Settings
  /** Multiplier for bite size (default 1). */
  biteSizeScale?: number;
  /** Auto-eat interval in ms (default 200). */
  interval?: number;
  /** Toggle auto-eating. */
  autoEat?: boolean;

  // Physics & Visuals
  /** Downward force (default 0.2). */
  gravity?: number;
  /** Air resistance (default 0.96). */
  drag?: number;
  /** Show bite cursor. */
  showDebug?: boolean;
  /** Toggle next bite indicator. */
  showNextBitePreview?: boolean;
  /** Toggle structure (islands/perimeter) view. */
  showStructurePreview?: boolean;
  /** Toggle onion skin of original shape. */
  showOnionSkin?: boolean;
  /** Toggle color dominance visualization. */
  showColorDominance?: boolean;
  /** Toggle crumb particles visibility. */
  showCrumbs?: boolean;
  /** Duration of reset animation in ms. */
  resetDuration?: number;
  /** Toggle shrink animation on reset. */
  animateExit?: boolean;
  /** Toggle grow animation on spawn. */
  animateEnter?: boolean;

  // Algorithm Tuning
  /** 0 (Strict Peel) to 1 (Allow Drill). */
  drillInBias?: number;
  /** 0 (Jagged) to 1 (Smooth). */
  biteRoundness?: number;
  /** 0 (Strict Furthest) to 1 (Random Outer). */
  startPointRandomness?: number;
  /** 0 (Uniform) to 1 (Chaotic Depth). */
  biteDepthVariance?: number;
  /** If true, bites are placed randomly instead of clockwise. */
  randomBitePlacement?: boolean;

  /** Color-aware eating configuration. */
  colorDominance?: {
    enabled: boolean;
    /** Hex color to target. */
    targetColor: string;
    /** Color matching tolerance (0-1, default 0.2). */
    tolerance?: number;
    /** How strongly to prefer dominant color areas (0-1, default 0.5). */
    strength?: number;
  };
}

// ---------------------------------------------------------------------------
// YumItem Props
// ---------------------------------------------------------------------------

/**
 * Props for the {@link YumItem} component.
 */
export interface YumItemProps {
  /** SVG path data for the shape. */
  svgPath: string;
  /** SVG viewBox string (e.g. "0 0 480 480"). */
  viewBox: string;
  /** Color scheme for the shape and particles. */
  colors: {
    base: string;
    shadow: string;
    highlight: string;
    crumbs: string[];
  };
  /** Eating algorithm and visual configuration. */
  config: YumConfig;
  /** Callback when dominant colors are detected. */
  onColorDominanceDetected?: (
    dominantColor: string,
    allColors?: Array<{ color: string; percentage: number }>,
  ) => void;
  /** Optional children rendered inside the masked group. */
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Animation Component Types
// ---------------------------------------------------------------------------

export type AnimationShape =
  | "circle"
  | "line"
  | "rounded-rect"
  | "image"
  | "custom";

export interface AnimationConfig {
  shape: AnimationShape;
  width?: number;
  height?: number;
  /** For circles. */
  radius?: number;
  /** For rounded rectangles. */
  borderRadius?: number;
  /** For image eating (URL or base64 data URI). */
  imageSrc?: string;
  /** SVG path for custom/image masks. */
  maskPath?: string;
  /** For SVG-based shapes. */
  viewBox?: string;

  /** 0-1 for progress-based animations. */
  progress?: number;
  /** For loaders. */
  autoPlay?: boolean;
  interval?: number;
  biteSizeScale?: number;

  color?: string;
  crumbColors?: string[];
  showCrumbs?: boolean;
  gravity?: number;
  drag?: number;
  biteRoundness?: number;
  biteDepthVariance?: number;
  drillInBias?: number;
}

/**
 * Props for the {@link Loader} component.
 */
export interface LoaderProps {
  size?: number;
  color?: string;
  speed?: number;
  showCrumbs?: boolean;
  crumbColors?: string[];
}

/**
 * Props for the {@link ProgressBar} component.
 */
export interface ProgressBarProps {
  width?: number | string;
  height?: number;
  /** Progress value from 0 to 1. */
  progress: number;
  color?: string;
  backgroundColor?: string;
  showCrumbs?: boolean;
  animated?: boolean;
}

/**
 * Props for the {@link ProgressCircle} component.
 */
export interface ProgressCircleProps {
  size?: number;
  /** Progress value from 0 to 1. */
  progress: number;
  color?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  showCrumbs?: boolean;
  animated?: boolean;
}

/**
 * Props for the {@link ImageEater} component.
 */
export interface ImageEaterProps {
  /** Image source URL or base64 data URI. */
  src: string;
  /** SVG path for mask. */
  maskPath: string;
  viewBox: string;
  width?: number | string;
  height?: number | string;
  colors: {
    base: string;
    shadow: string;
    highlight: string;
    crumbs: string[];
  };
  /** Eating configuration. Uses YumConfig directly instead of re-declaring fields. */
  config: YumConfig;
}

/**
 * Props for the {@link DeleteAnimation} component.
 */
export interface DeleteAnimationProps {
  onComplete?: () => void;
  duration?: number;
  color?: string;
  showCrumbs?: boolean;
  crumbColors?: string[];
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Demo-only Types (excluded from published bundle via dts config)
// ---------------------------------------------------------------------------

/**
 * Settings interface used by the demo/playground UI.
 * Not exported from the library entry point.
 * @internal
 */
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
