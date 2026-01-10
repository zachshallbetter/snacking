/**
 * Snacking Animation Library
 * 
 * A library for creating eating animations, loaders, progress indicators,
 * and delete animations with customizable physics and visual effects.
 * 
 * @example
 * ```tsx
 * import { YumItem } from '@snacking/animation-library';
 * 
 * <YumItem
 *   svgPath="M100,100 L200,100 L200,200 L100,200 Z"
 *   viewBox="0 0 300 300"
 *   colors={{ base: '#FF4785', shadow: '#9F1239', highlight: '#FFFFFF', crumbs: ['#FFFFFF'] }}
 *   config={{ cx: 150, cy: 150, maxR: 150, autoEat: true }}
 * />
 * ```
 */

// Core Components
export { YumItem, default as YumItemDefault } from '../components/YumItem';
export { Crumbs, default as CrumbsDefault } from '../components/Crumbs';

// Animation Components
export { Loader } from '../components/animations/Loader';
export { ProgressBar } from '../components/animations/ProgressBar';
export { ProgressCircle } from '../components/animations/ProgressCircle';
export { ImageEater } from '../components/animations/ImageEater';
export { DeleteAnimation } from '../components/animations/DeleteAnimation';

// Hooks
export { useYumYum, generateBitePath } from '../hooks/useYumYum';
export { useShapeEater } from '../hooks/useShapeEater';

// Types
export type {
  Point,
  Bite,
  Crumb,
  YumConfig,
  AppSettings,
  AnimationShape,
  AnimationConfig,
  LoaderProps,
  ProgressBarProps,
  ProgressCircleProps,
  ImageEaterProps,
  DeleteAnimationProps
} from '../types';

// Utilities
export { initAudio, playCrunchSound, playPopSound } from '../utils/audio';
