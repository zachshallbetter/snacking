/**
 * useYumYum — React hook for the YumYum eating animation.
 *
 * A thin React wrapper around the framework-agnostic {@link EatingEngine}.
 * Manages React state, effects, and auto-eat timers while delegating all
 * algorithm work (grid analysis, bite planning, crumb spawning) to the engine.
 *
 * @packageDocumentation
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Bite, Crumb, YumConfig, Point } from '../types';
import { isDataURI } from '../utils/image';
import { EatingEngine, generateBitePath, ColorDominanceData } from '../lib/core/EatingEngine';

// Re-export for consumers that import from here
export { generateBitePath };

const IDLE_THRESHOLD = 2000;

export const useYumYum = (
  config: YumConfig,
  pathData: string,
  viewBoxStr: string,
  crumbColors: string[],
  baseColor?: string,
  imageSrc?: string,
) => {
  // ---- React State ----
  const [bites, setBites] = useState<Bite[]>([]);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [nextBite, setNextBite] = useState<Bite | null>(null);
  const [structure, setStructure] = useState<{ islands: Point[]; perimeter: Point[]; tips: Point[] }>({ islands: [], perimeter: [], tips: [] });
  const [colorDominanceData, setColorDominanceData] = useState<ColorDominanceData | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [scale, setScale] = useState(1);
  const [isFinished, setIsFinished] = useState(false);

  // ---- Refs ----
  // Use mutable ref pattern: initializer matching type avoids ReadonlyRef
  const engineRef = useRef<EatingEngine | null>(null) as React.MutableRefObject<EatingEngine | null>;
  const isFinishedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scaleTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastInteractTimeRef = useRef<number>(0);

  // Destructure stable config values
  const {
    interval = 200,
    autoEat = true,
    resetDuration = 800,
    cx, cy, maxR,
    biteSizeScale = 1,
    animateExit,
  } = config;

  useEffect(() => { isFinishedRef.current = isFinished; }, [isFinished]);

  // ---- Grid Initialization ----
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !pathData) return;

    const vb = viewBoxStr.split(' ').map(Number);
    const w = vb[2] || 480;
    const h = vb[3] || 480;
    if (w === 0 || h === 0) return;

    canvas.width = w;
    canvas.height = h;

    const engine = new EatingEngine(config, crumbColors, {
      onColorDominanceDetected: (dominantColor, allColors) => {
        // Color dominance is tracked via engine state, we'll read it after init
      },
    });

    const path2d = new Path2D(pathData);
    engine.initFromCanvas(ctx, path2d, w, h, baseColor);

    engineRef.current = engine;

    // Sync state
    setColorDominanceData(engine.colorDominanceData);
    setNextBite(engine.nextBite);
    setStructure(engine.calculateStructure());

    setBites([]);
    setCrumbs([]);
    setIsFinished(false);
    setIsResetting(false);
    lastInteractTimeRef.current = 0;

  }, [pathData, viewBoxStr, cx, cy, baseColor, imageSrc,
      config.colorDominance?.enabled, config.colorDominance?.tolerance,
      config.startPointRandomness, maxR, biteSizeScale]);

  // ---- Image Color Detection (runs after image loads) ----
  useEffect(() => {
    const engine = engineRef.current;
    if (!imageSrc || !config.colorDominance?.enabled || !engine) return;

    const img = new Image();
    if (!isDataURI(imageSrc)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      // Re-check: engine may have been replaced by a newer effect run
      const currentEngine = engineRef.current;
      if (!currentEngine) return;

      const vb = viewBoxStr.split(' ').map(Number);
      const w = vb[2] || 480;
      const h = vb[3] || 480;
      if (w === 0 || h === 0) return;

      canvas.width = w;
      canvas.height = h;

      // Draw image and mask to shape
      ctx.drawImage(img, 0, 0, w, h);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      const path2d = new Path2D(pathData);
      ctx.fill(path2d);
      ctx.globalCompositeOperation = 'source-over';

      const imageColorData = ctx.getImageData(0, 0, w, h);
      currentEngine.updateColorGridFromImageData(imageColorData, w);

      setColorDominanceData(currentEngine.colorDominanceData);
    };

    img.onerror = () => {
      // If image fails to load, keep existing color detection
    };

    img.src = imageSrc;
  }, [imageSrc, config.colorDominance?.enabled, pathData, viewBoxStr]);

  // ---- Reset ----
  const reset = useCallback(() => {
    setIsResetting(true);
    setTimeout(() => {
      const engine = engineRef.current;
      if (engine) {
        engine.reset();
        setNextBite(engine.nextBite);
        setStructure(engine.calculateStructure());
      }

      setBites([]);
      setCrumbs([]);
      lastInteractTimeRef.current = 0;

      setIsFinished(false);
      setIsResetting(false);
    }, resetDuration);
  }, [resetDuration]);

  // ---- Trigger Bite ----
  const triggerBite = useCallback((manualPoint?: { x: number; y: number }) => {
    const engine = engineRef.current;
    if (!engine || isFinishedRef.current) return;

    // Haptic Feedback (only on user interaction)
    if (manualPoint && typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch (e) { /* ignore */ }
    }

    const result = engine.triggerBite(manualPoint);
    if (!result) return;

    const { bite, crumbs: newCrumbs, nextBite: newNextBite, structure: newStructure, finished } = result;

    setBites(prev => [...prev, bite]);
    setCrumbs(prev => [...prev, ...newCrumbs]);
    setNextBite(newNextBite);
    setStructure(newStructure);

    // Scale dip animation
    if (scaleTimeoutRef.current) clearTimeout(scaleTimeoutRef.current);
    setScale(0.995);
    scaleTimeoutRef.current = setTimeout(() => setScale(1), 150);

    if (finished) {
      setIsFinished(true);
      timeoutRef.current = setTimeout(reset, 1500);
    }
  }, [reset]);

  // ---- Auto-Loop ----
  useEffect(() => {
    const loop = () => {
      if (!autoEat || isResetting || isFinishedRef.current) return;

      triggerBite();

      const variation = interval * 0.2;
      const delay = interval + (Math.random() * variation - variation / 2);

      // If in idle pause, check more frequently
      const isPaused = Date.now() - lastInteractTimeRef.current < IDLE_THRESHOLD;
      const nextTick = isPaused ? 100 : Math.max(20, delay);

      timeoutRef.current = setTimeout(loop, nextTick);
    };

    if (autoEat && !isResetting && !isFinishedRef.current) {
      timeoutRef.current = setTimeout(loop, interval);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isResetting, triggerBite, autoEat, interval]);

  // ---- Crumbs update callback ----
  const updateCrumbs = useCallback((updated: Crumb[]) => setCrumbs(updated), []);

  return {
    bites,
    crumbs,
    triggerBite,
    updateCrumbs,
    isResetting,
    scale,
    isFinished,
    nextBite,
    structure,
    colorDominanceData,
  };
};