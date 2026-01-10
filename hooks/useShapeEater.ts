import { useState, useRef, useCallback, useEffect } from 'react';
import { Bite, Crumb, Point } from '../types';
import { generateBitePath } from './useYumYum';
import React from 'react';

const GRID_CELL_SIZE = 10;

const varyColor = (hex: string) => {
  let c = hex.substring(1);
  const rgb = parseInt(c, 16);
  let r = (rgb >> 16) & 0xff;
  let g = (rgb >>  8) & 0xff;
  let b = (rgb >>  0) & 0xff;

  const variance = 40;
  const noise = () => Math.floor((Math.random() - 0.5) * variance);
  
  r = Math.min(255, Math.max(0, r + noise()));
  g = Math.min(255, Math.max(0, g + noise()));
  b = Math.min(255, Math.max(0, b + noise()));

  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

interface UseShapeEaterOptions {
  shape: 'circle' | 'line' | 'rounded-rect' | 'image' | 'custom';
  width: number;
  height: number;
  radius?: number;
  borderRadius?: number;
  pathData?: string; // SVG path for custom/image shapes
  viewBox?: string;
  progress?: number; // 0-1, controls eating progress
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
    onComplete
  } = options;

  const [bites, setBites] = useState<Bite[]>([]);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const gridRef = useRef<Uint8Array | null>(null);
  const initialGridRef = useRef<Uint8Array | null>(null);
  const gridDimsRef = useRef({ cols: 0, rows: 0, width: 0, height: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const requestRef = useRef<number>();

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) / 2;

  // Generate shape path based on type
  const generateShapePath = useCallback((): string => {
    switch (shape) {
      case 'circle':
        if (!radius) return '';
        return `M ${cx} ${cy} m -${radius} 0 a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0`;
      
      case 'line':
        return `M 0 ${height / 2} L ${width} ${height / 2}`;
      
      case 'rounded-rect':
        const r = borderRadius || 0;
        return `M ${r} 0 L ${width - r} 0 Q ${width} 0 ${width} ${r} L ${width} ${height - r} Q ${width} ${height} ${width - r} ${height} L ${r} ${height} Q 0 ${height} 0 ${height - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
      
      case 'image':
      case 'custom':
        return pathData || '';
      
      default:
        return '';
    }
  }, [shape, width, height, radius, borderRadius, cx, cy, pathData]);

  // Initialize grid from shape
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

    // Special handling for line
    if (shape === 'line') {
      const cols = Math.ceil(w / GRID_CELL_SIZE);
      const rows = Math.ceil(h / GRID_CELL_SIZE);
      const len = cols * rows;
      const grid = new Uint8Array(len);
      
      // Fill line (horizontal line in middle)
      const lineY = Math.floor(h / 2 / GRID_CELL_SIZE);
      for (let c = 0; c < cols; c++) {
        if (lineY < rows) {
          grid[lineY * cols + c] = 1;
        }
      }
      
      initialGridRef.current = grid;
      gridRef.current = new Uint8Array(grid);
      gridDimsRef.current = { cols, rows, width: w, height: h };
      return;
    }

    // For other shapes, use path
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    const path2d = new Path2D(path);
    ctx.fill(path2d);

    const cols = Math.ceil(w / GRID_CELL_SIZE);
    const rows = Math.ceil(h / GRID_CELL_SIZE);
    const len = cols * rows;
    
    const masterGrid = new Uint8Array(len);
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
        const y = r * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
        if (ctx.isPointInPath(path2d, x, y)) {
          masterGrid[r * cols + c] = 1;
        }
      }
    }
    
    initialGridRef.current = masterGrid;
    gridRef.current = new Uint8Array(masterGrid);
    gridDimsRef.current = { cols, rows, width: w, height: h };
  }, [shape, width, height, radius, borderRadius, pathData, viewBox, generateShapePath]);

  // Calculate current progress from grid
  const calculateProgress = useCallback((): number => {
    if (!gridRef.current || !initialGridRef.current) return 0;
    
    let remaining = 0;
    let total = 0;
    
    for (let i = 0; i < gridRef.current.length; i++) {
      if (initialGridRef.current[i] === 1) {
        total++;
        if (gridRef.current[i] === 1) {
          remaining++;
        }
      }
    }
    
    return total > 0 ? 1 - (remaining / total) : 0;
  }, []);

  // Spawn crumbs
  const spawnCrumbs = useCallback((x: number, y: number, intensity: number = 1) => {
    if (!showCrumbs) return;
    
    const newCrumbs: Crumb[] = [];
    const count = Math.floor(intensity * 8);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 10;
      const baseColor = crumbColors[Math.floor(Math.random() * crumbColors.length)];
      const shapes: ('triangle' | 'circle' | 'rect')[] = ['triangle', 'circle', 'rect'];
      
      newCrumbs.push({
        id: Date.now() + i + Math.random(),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        size: (4 + Math.random() * 6) * biteSizeScale,
        color: varyColor(baseColor),
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 60,
        life: 0.6 + Math.random() * 0.4
      });
    }
    
    setCrumbs(prev => [...prev, ...newCrumbs]);
  }, [showCrumbs, crumbColors, biteSizeScale]);

  // Take a bite at a specific point
  const takeBite = useCallback((x: number, y: number) => {
    if (!gridRef.current || isFinished) return;
    
    const { cols } = gridDimsRef.current;
    const sizeScale = (maxR / 240) * biteSizeScale;
    const baseR = 50 * sizeScale;
    const clearR = baseR * 1.2;
    const clearRSq = clearR * clearR;
    
    const startCol = Math.max(0, Math.floor((x - clearR) / GRID_CELL_SIZE));
    const endCol = Math.min(cols - 1, Math.ceil((x + clearR) / GRID_CELL_SIZE));
    const startRow = Math.max(0, Math.floor((y - clearR) / GRID_CELL_SIZE));
    const endRow = Math.min(gridDimsRef.current.rows - 1, Math.ceil((y + clearR) / GRID_CELL_SIZE));
    
    let removed = 0;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const idx = r * cols + c;
        if (gridRef.current[idx] === 1) {
          const px = c * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
          const py = r * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
          if ((px - x) ** 2 + (py - y) ** 2 <= clearRSq) {
            gridRef.current[idx] = 0;
            removed++;
          }
        }
      }
    }
    
    if (removed > 0) {
      const angleToCenter = Math.atan2(y - cy, x - cx);
      const rotation = (angleToCenter * 180 / Math.PI) - 90;
      
      const newBite: Bite = {
        id: Date.now() + Math.random(),
        x,
        y,
        path: generateBitePath(baseR, biteRoundness, biteDepthVariance),
        rotation,
        scale: 1.0
      };
      
      setBites(prev => [...prev, newBite]);
      spawnCrumbs(x, y, removed > 20 ? 1.5 : 1.0);
      
      const newProgress = calculateProgress();
      setCurrentProgress(newProgress);
      
      // Check if finished
      if (newProgress >= 0.99 || (targetProgress !== undefined && newProgress >= targetProgress)) {
        setIsFinished(true);
        if (onComplete) onComplete();
      }
    }
  }, [maxR, biteSizeScale, cx, cy, biteRoundness, biteDepthVariance, spawnCrumbs, calculateProgress, targetProgress, onComplete, isFinished]);

  // Auto-eating for loaders
  useEffect(() => {
    if (!autoPlay || isFinished || !gridRef.current) return;
    
    const findNextBitePoint = (): Point | null => {
      if (!gridRef.current) return null;
      
      const { cols, rows } = gridDimsRef.current;
      const candidates: Point[] = [];
      
      // Find edge points
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          if (gridRef.current[idx] === 1) {
            // Check if it's an edge (has empty neighbor)
            let isEdge = false;
            if (r > 0 && gridRef.current[(r - 1) * cols + c] === 0) isEdge = true;
            if (r < rows - 1 && gridRef.current[(r + 1) * cols + c] === 0) isEdge = true;
            if (c > 0 && gridRef.current[r * cols + (c - 1)] === 0) isEdge = true;
            if (c < cols - 1 && gridRef.current[r * cols + (c + 1)] === 0) isEdge = true;
            
            if (isEdge) {
              const x = c * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
              const y = r * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
              const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
              candidates.push({ x, y, dist });
            }
          }
        }
      }
      
      if (candidates.length === 0) return null;
      
      // For line, eat left to right
      if (shape === 'line') {
        candidates.sort((a, b) => a.x - b.x);
        return candidates[0];
      }
      
      // For others, prefer outer edges
      candidates.sort((a, b) => b.dist - a.dist);
      return candidates[Math.floor(Math.random() * Math.min(5, candidates.length))];
    };
    
    const loop = () => {
      if (isFinished || !autoPlay) return;
      
      const point = findNextBitePoint();
      if (point) {
        takeBite(point.x, point.y);
      } else {
        setIsFinished(true);
        if (onComplete) onComplete();
      }
      
      const variation = interval * 0.2;
      const delay = interval + (Math.random() * variation - variation / 2);
      timeoutRef.current = setTimeout(loop, delay);
    };
    
    timeoutRef.current = setTimeout(loop, interval);
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [autoPlay, interval, isFinished, takeBite, shape, cx, cy, onComplete]);

  const findBitePointForProgress = useCallback((neededProgress: number): Point | null => {
    if (!gridRef.current) return null;
    
    const { cols, rows } = gridDimsRef.current;
    
    // Find a good bite point
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (gridRef.current[idx] === 1) {
          const x = c * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
          const y = r * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
          
          // For line, always bite from left
          if (shape === 'line') {
            return { x, y };
          }
          
          // For others, find edge
          let isEdge = false;
          if (r > 0 && gridRef.current[(r - 1) * cols + c] === 0) isEdge = true;
          if (r < rows - 1 && gridRef.current[(r + 1) * cols + c] === 0) isEdge = true;
          if (c > 0 && gridRef.current[r * cols + (c - 1)] === 0) isEdge = true;
          if (c < cols - 1 && gridRef.current[r * cols + (c + 1)] === 0) isEdge = true;
          
          if (isEdge) {
            return { x, y };
          }
        }
      }
    }
    
    return null;
  }, [shape]);

  // Progress-based eating
  useEffect(() => {
    if (targetProgress === undefined || !gridRef.current || isFinished) return;
    
    const current = calculateProgress();
    if (current >= targetProgress - 0.01) {
      if (current < targetProgress) {
        setIsFinished(true);
      }
      return;
    }
    
    // Find bite points to reach target progress
    const neededProgress = targetProgress - current;
    if (neededProgress > 0.01) {
      const point = findBitePointForProgress(neededProgress);
      if (point) {
        takeBite(point.x, point.y);
      }
    }
  }, [targetProgress, isFinished, calculateProgress, findBitePointForProgress, takeBite]);

  // Update crumbs animation
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
            life: crumb.life - 0.015
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
    if (initialGridRef.current && gridRef.current) {
      gridRef.current.set(initialGridRef.current);
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
    reset
  };
};
