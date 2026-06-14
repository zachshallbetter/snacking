/**
 * @snackstudio/yumyum
 *
 * A framework-agnostic library for creating interactive eating animations,
 * loaders, progress indicators, and delete animations with customizable
 * physics and visual effects.
 *
 * @remarks
 * Supports both React components/hooks and a Vanilla JavaScript controller class.
 *
 * @example React
 * ```tsx
 * import { YumItem } from '@snackstudio/yumyum';
 *
 * <YumItem
 *   svgPath="M100,100 L200,100 L200,200 L100,200 Z"
 *   viewBox="0 0 300 300"
 *   colors={{ base: '#FF4785', shadow: '#9F1239', highlight: '#FFFFFF', crumbs: ['#FFFFFF'] }}
 *   config={{ cx: 150, cy: 150, maxR: 150, autoEat: true }}
 * />
 * ```
 *
 * @example Vanilla JavaScript
 * ```js
 * import { YumEater } from '@snackstudio/yumyum';
 *
 * const eater = new YumEater(container, {
 *   svgPath: "M100,100 L200,100 L200,200 L100,200 Z",
 *   viewBox: "0 0 300 300",
 *   colors: { base: '#FF4785', shadow: '#9F1239', highlight: '#FFFFFF', crumbs: ['#FFFFFF'] },
 *   config: { cx: 150, cy: 150, maxR: 150, autoEat: true }
 * });
 * ```
 *
 * @packageDocumentation
 */

// --- React Components ---

/** Core eating animation component for SVG paths. */
export { YumItem } from '../components/YumItem';

/** Particle system component for rendering crumb debris. */
export { Crumbs } from '../components/Crumbs';

// --- Animation Components ---

/** Circular eating loader animation. */
export { Loader } from '../components/animations/Loader';

/** Horizontal progress bar with eating effect. */
export { ProgressBar } from '../components/animations/ProgressBar';

/** Circular progress indicator with eating effect. */
export { ProgressCircle } from '../components/animations/ProgressCircle';

/** Apply eating animations to images via SVG masks. */
export { ImageEater } from '../components/animations/ImageEater';

/** Deletion transition with particle effects. */
export { DeleteAnimation } from '../components/animations/DeleteAnimation';

// --- React Hooks ---

/** Core hook containing eating logic, state, and physics simulation. */
export { useYumYum, generateBitePath } from '../hooks/useYumYum';

/** Shape-based abstraction hook for loaders and progress indicators. */
export { useShapeEater } from '../hooks/useShapeEater';

// --- Core Engine ---

/** Framework-agnostic eating algorithm engine. */
export { EatingEngine } from './core/EatingEngine';
export type { EatingEngineCallbacks, ColorDominanceData } from './core/EatingEngine';

// --- Types ---

export type {
  Point,
  Bite,
  Crumb,
  YumConfig,
  YumItemProps,
  AnimationShape,
  AnimationConfig,
  LoaderProps,
  ProgressBarProps,
  ProgressCircleProps,
  ImageEaterProps,
  DeleteAnimationProps
} from '../types';

// --- Vanilla JavaScript Controller ---

/**
 * Framework-agnostic controller class for eating animations.
 * Manages SVG, Canvas particles, and DOM lifecycle directly.
 */
export { YumEater, type YumEaterColors, type YumEaterOptions } from './vanilla/YumEater';

// --- Utilities ---

export { isDataURI, isBase64DataURI, normalizeImageSrc } from '../utils/image';
