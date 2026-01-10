// Main library exports
export * from './components';
export * from './hooks';
export * from './types';
export * from './utils';

// Re-export key components for convenience
export { YumItem } from './components/YumItem';
export { ImageEater } from './components/animations/ImageEater';
export { Loader } from './components/animations/Loader';
export { ProgressBar } from './components/animations/ProgressBar';
export { ProgressCircle } from './components/animations/ProgressCircle';
export { DeleteAnimation } from './components/animations/DeleteAnimation';

// Re-export hooks
export { useYumYum } from './hooks/useYumYum';
export { useShapeEater } from './hooks/useShapeEater';
export { generateBitePath } from './hooks/useYumYum';

// Re-export types
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
} from './types';
