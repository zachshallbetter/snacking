/**
 * useShapeEater — Shape-based abstraction hook for loaders and progress indicators.
 *
 * Provides a high-level API for eating standard shapes (circles, lines,
 * rounded rects) with progress tracking and auto-play support.
 * Delegates all algorithm work to {@link EatingEngine}.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Bite, Crumb, Point, YumConfig } from '../types';
import { EatingEngine, generateBitePath } from '../lib/core/EatingEngine';

const GRID_CELL_SIZE = 10;

interface UseShapeEaterOptions {
  shape: 'circle' | 'line' | 'rounded-rect' | 'image' | 'custom';
  width: number;
  height: number;
  radius?: number;
  borderRadius?: number;
  pathData?: string;
  viewBox?: string;
  progress?: number;
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
  onComplete?: () => void;
}

export const useShapeEater = (options: UseShapeEaterOptions) => {
  const {
    shape,
    width,
    height,
    radius,
    borderRadius = 0,
    pathData,
    viewBox,
    progress: targetProgress,
    autoPlay = false,
    interval = 200,
    biteSizeScale = 1,
    color = '#FF4785',
    crumbColors = ['#FFFFFF', '#FF4785'],
    showCrumbs = true,
    gravity = 0.2,
    drag = 0.96,
    biteRoundness = 0.9,
    biteDepthVariance = 0.2,
    onComplete,
  } = options;

  const [bites, setBites] = useState<Bite[]>([]);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const engineRef = useRef<EatingEngine | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestRef = useRef<number | undefined>(undefined);

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) / 2;

  // Generate shape path
  const generateShapePath = useCallback((): string => {
    switch (shape) {
      case 'circle':
        if (!radius) return '';
        return `M ${cx} ${cy} m -${radius} 0 a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0`;
      case 'line':
        return `M 0 ${height / 2} L ${width} ${height / 2}`;
      case 'rounded-rect': {
        const r = borderRadius || 0;
        return `M ${r} 0 L ${width - r} 0 Q ${width} 0 ${width} ${r} L ${width} ${height - r} Q ${width} ${height} ${width - r} ${height} L ${r} ${height} Q 0 ${height} 0 ${height - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
      }
      case 'image':
      case 'custom':
        return pathData || '';
      default:
        return '';
    }
  }, [shape, width, height, radius, borderRadius, cx, cy, pathData]);

  // Initialize engine
  useEffect(() => {
    const path = generateShapePath();
    if (!path && shape !== 'line') return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let vb: number[];
    if (viewBox) {
      vb = viewBox.split(' ').map(Number);
    } else {
      vb = [0, 0, width, height];
    }

    const w = vb[2] || width;
    const h = vb[3] || height;
    if (w === 0 || h === 0) return;

    canvas.width = w;
    canvas.height = h;

    const config: YumConfig = {
      cx, cy, maxR,
      biteSizeScale,
      biteRoundness,
      biteDepthVariance,
      gravity, drag,
      showCrumbs,
    };

    const engine = new EatingEngine(config, crumbColors);

    // For line shapes, we need special grid initialization
    if (shape === 'line') {
      // Draw a thick line for the path
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = GRID_CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    }

    const path2d = new Path2D(path);
    engine.initFromCanvas(ctx, path2d, w, h, color);
    engineRef.current = engine;

    setBites([]);
    setCrumbs([]);
    setCurrentProgress(0);
    setIsFinished(false);
  }, [shape, width, height, radius, borderRadius, pathData, viewBox, generateShapePath,
      cx, cy, maxR, biteSizeScale, biteRoundness, biteDepthVariance, gravity, drag,
      showCrumbs, crumbColors, color]);

  // Calculate progress
  const calculateProgress = useCallback((): number => {
    const engine = engineRef.current;
    if (!engine) return 0;
    const total = engine.getTotalCount();
    const remaining = engine.getRemainingCount();
    return total > 0 ? 1 - (remaining / total) : 0;
  }, []);

  // Take a bite
  const takeBite = useCallback((x: number, y: number) => {
    const engine = engineRef.current;
    if (!engine || isFinished) return;

    const result = engine.triggerBite({ x, y });
    if (!result) return;

    setBites(prev => [...prev, result.bite]);
    if (showCrumbs) {
      setCrumbs(prev => [...prev, ...result.crumbs]);
    }

    const newProgress = calculateProgress();
    setCurrentProgress(newProgress);

    if (newProgress >= 0.99 || (targetProgress !== undefined && newProgress >= targetProgress)) {
      setIsFinished(true);
      onComplete?.();
    }
  }, [isFinished, showCrumbs, calculateProgress, targetProgress, onComplete]);

  // Auto-eating for loaders
  useEffect(() => {
    if (!autoPlay || isFinished || !engineRef.current) return;

    const findNextBitePoint = (): Point | null => {
      const engine = engineRef.current;
      if (!engine) return null;

      // Use engine's built-in planning for better bite placement
      const plan = engine.planNextBite();
      if (plan) return { x: plan.x, y: plan.y };

      return null;
    };

    const loop = () => {
      if (isFinished || !autoPlay) return;

      const point = findNextBitePoint();
      if (point) {
        takeBite(point.x, point.y);
      } else {
        setIsFinished(true);
        onComplete?.();
      }

      const variation = interval * 0.2;
      const delay = interval + (Math.random() * variation - variation / 2);
      timeoutRef.current = setTimeout(loop, delay);
    };

    timeoutRef.current = setTimeout(loop, interval);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [autoPlay, interval, isFinished, takeBite, onComplete]);

  // Progress-based eating
  useEffect(() => {
    if (targetProgress === undefined || !engineRef.current || isFinished) return;

    const current = calculateProgress();
    if (current >= targetProgress - 0.01) return;

    const plan = engineRef.current.planNextBite();
    if (plan) {
      takeBite(plan.x, plan.y);
    }
  }, [targetProgress, isFinished, calculateProgress, takeBite]);

  // Crumb physics animation
  useEffect(() => {
    if (!showCrumbs) return;

    const animate = () => {
      setCrumbs(prev => {
        const next = prev.map(crumb => {
          const newVx = crumb.vx * drag;
          const newVy = (crumb.vy + gravity) * drag;
          return {
            ...crumb,
            x: crumb.x + newVx,
            y: crumb.y + newVy,
            vx: newVx,
            vy: newVy,
            rotation: crumb.rotation + crumb.rotationSpeed * drag,
            life: crumb.life - 0.015,
          };
        }).filter(c => c.life > 0);
        return next;
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [showCrumbs, gravity, drag]);

  const reset = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.reset();
    }
    setBites([]);
    setCrumbs([]);
    setCurrentProgress(0);
    setIsFinished(false);
  }, []);

  return {
    bites,
    crumbs,
    progress: currentProgress,
    isFinished,
    takeBite,
    reset,
  };
};
