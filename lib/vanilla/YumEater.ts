import { Bite, Crumb, YumConfig, Point } from '../../types';
import { isDataURI } from '../../utils/image';

const GRID_CELL_SIZE = 10;
const IDLE_THRESHOLD = 2000;

export interface YumEaterColors {
  base: string;
  shadow: string;
  highlight: string;
  crumbs: string[];
}

export interface YumEaterOptions {
  svgPath: string;
  viewBox: string;
  colors: YumEaterColors;
  config: YumConfig;
  imageSrc?: string;
  onFinished?: () => void;
  onColorDominanceDetected?: (dominantColor: string, allColors: Array<{ color: string, percentage: number }>) => void;
}

export class YumEater {
  private container: HTMLElement;
  private svgPath: string;
  private viewBox: string;
  private colors: YumEaterColors;
  private config: YumConfig;
  private imageSrc?: string;

  // State
  private bites: Bite[] = [];
  private crumbs: Crumb[] = [];
  private isResetting = false;
  private isFinished = false;
  private scale = 1;
  private nextBite: Bite | null = null;
  private colorDominanceData: {
    dominantColors: Array<{ color: string; percentage: number }>;
    regions: Array<{ color: string; points: Point[] }>;
  } | null = null;

  // DOM Elements
  private wrapperEl!: HTMLDivElement;
  private svgEl!: SVGSVGElement;
  private maskEl!: SVGMaskElement;
  private mainBodyUseEl?: SVGUseElement;
  private mainBodyImageEl?: SVGImageElement;
  private onionSkinEl?: SVGPathElement;
  private nextBiteGEl?: SVGGElement;
  private structureGEl?: SVGGElement;
  private colorDominanceGEl?: SVGGElement;
  private debugCursorEl?: SVGCircleElement;
  private canvasEl!: HTMLCanvasElement;
  private canvasCtx!: CanvasRenderingContext2D;

  // Algorithm & Grid State
  private initialGrid: Uint8Array | null = null;
  private grid: Uint8Array | null = null;
  private gridCols = 0;
  private gridRows = 0;
  private gridWidth = 0;
  private gridHeight = 0;
  private sortedPixels: { x: number; y: number; d: number }[] = [];
  private colorGrid: Uint8ClampedArray | null = null;
  
  private lastBitePos: { x: number; y: number } | null = null;
  private lastBiteAngle = -Math.PI / 2;
  private lastInteractTime = 0;
  
  // Timing & Animation Loops
  private autoEatTimeout?: ReturnType<typeof setTimeout>;
  private resetTimeout?: ReturnType<typeof setTimeout>;
  private scaleTimeout?: ReturnType<typeof setTimeout>;
  private rafId?: number;

  // Callback Options
  private onFinished?: () => void;
  private onColorDominanceDetected?: (dominantColor: string, allColors: Array<{ color: string; percentage: number }>) => void;

  constructor(container: HTMLElement, options: YumEaterOptions) {
    this.container = container;
    this.svgPath = options.svgPath;
    this.viewBox = options.viewBox;
    this.colors = options.colors;
    this.config = options.config;
    this.imageSrc = options.imageSrc;
    this.onFinished = options.onFinished;
    this.onColorDominanceDetected = options.onColorDominanceDetected;

    this.initDOM();
    this.initGridState();
    this.bindEvents();
    this.startLoop();
  }

  // --- DOM Setup ---
  private initDOM() {
    // 1. Wrapper
    this.wrapperEl = document.createElement('div');
    this.wrapperEl.style.position = 'relative';
    this.wrapperEl.style.width = '100%';
    this.wrapperEl.style.height = '100%';
    this.wrapperEl.style.cursor = 'none';
    this.wrapperEl.style.userSelect = 'none';
    this.wrapperEl.style.webkitUserSelect = 'none';
    this.wrapperEl.style.touchAction = 'manipulation';
    
    // 2. SVG
    this.svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgEl.setAttribute('viewBox', this.viewBox);
    this.svgEl.style.width = '100%';
    this.svgEl.style.height = '100%';
    this.svgEl.style.filter = 'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.15))';
    this.svgEl.style.transition = 'transform 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 300ms ease';

    const itemKey = this.svgPath.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '');
    const maskId = `mask_${itemKey}_${Math.floor(Math.random() * 10000)}`;

    // Defs & Mask
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    const pathBody = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathBody.setAttribute('id', `body_${itemKey}`);
    pathBody.setAttribute('d', this.svgPath);
    defs.appendChild(pathBody);

    this.maskEl = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
    this.maskEl.setAttribute('id', maskId);
    
    const maskBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    maskBg.setAttribute('x', '-3000');
    maskBg.setAttribute('y', '-3000');
    maskBg.setAttribute('width', '10000');
    maskBg.setAttribute('height', '10000');
    maskBg.setAttribute('fill', 'white');
    this.maskEl.appendChild(maskBg);
    defs.appendChild(this.maskEl);

    // Arrow Head Marker
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', `arrow_${itemKey}`);
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('refX', '5');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    const markerPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    markerPath.setAttribute('d', 'M0,0 L0,6 L6,3 z');
    markerPath.setAttribute('fill', '#3B82F6');
    marker.appendChild(markerPath);
    defs.appendChild(marker);

    this.svgEl.appendChild(defs);

    // Onion Skin
    this.onionSkinEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.onionSkinEl.setAttribute('d', this.svgPath);
    this.onionSkinEl.setAttribute('fill', this.colors.base);
    this.onionSkinEl.setAttribute('fill-opacity', '0.1');
    this.onionSkinEl.setAttribute('stroke', this.colors.base);
    this.onionSkinEl.setAttribute('stroke-width', '2');
    this.onionSkinEl.setAttribute('stroke-dasharray', '6,6');
    this.onionSkinEl.style.pointerEvents = 'none';
    this.onionSkinEl.style.display = this.config.showOnionSkin ? 'block' : 'none';
    this.svgEl.appendChild(this.onionSkinEl);

    // Main Group with Mask
    const maskedG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    maskedG.setAttribute('mask', `url(#${maskId})`);

    const vb = this.viewBox.split(' ').map(Number);
    const vbWidth = vb[2] || 480;
    const vbHeight = vb[3] || 480;

    if (this.imageSrc) {
      this.mainBodyImageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      this.mainBodyImageEl.setAttribute('href', this.imageSrc);
      this.mainBodyImageEl.setAttribute('x', '0');
      this.mainBodyImageEl.setAttribute('y', '0');
      this.mainBodyImageEl.setAttribute('width', String(vbWidth));
      this.mainBodyImageEl.setAttribute('height', String(vbHeight));
      this.mainBodyImageEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      maskedG.appendChild(this.mainBodyImageEl);
    } else {
      this.mainBodyUseEl = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      this.mainBodyUseEl.setAttribute('href', `#body_${itemKey}`);
      this.mainBodyUseEl.setAttribute('fill', this.colors.base);
      maskedG.appendChild(this.mainBodyUseEl);
    }
    this.svgEl.appendChild(maskedG);

    // Overlays Groups
    this.colorDominanceGEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.colorDominanceGEl.style.pointerEvents = 'none';
    this.svgEl.appendChild(this.colorDominanceGEl);

    this.structureGEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.structureGEl.style.pointerEvents = 'none';
    this.svgEl.appendChild(this.structureGEl);

    this.nextBiteGEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.nextBiteGEl.style.pointerEvents = 'none';
    this.nextBiteGEl.style.transition = 'transform 300ms';
    this.nextBiteGEl.style.opacity = '0.6';
    this.nextBiteGEl.style.display = 'none';
    
    const nextBitePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    nextBitePath.setAttribute('fill', 'none');
    nextBitePath.setAttribute('stroke', '#3B82F6');
    nextBitePath.setAttribute('stroke-width', '3');
    nextBitePath.setAttribute('stroke-dasharray', '6,4');
    nextBitePath.setAttribute('stroke-linecap', 'round');
    this.nextBiteGEl.appendChild(nextBitePath);

    const nextBiteLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    nextBiteLine.setAttribute('x1', '0');
    nextBiteLine.setAttribute('y1', '20');
    nextBiteLine.setAttribute('x2', '0');
    nextBiteLine.setAttribute('y2', '-15');
    nextBiteLine.setAttribute('stroke', '#3B82F6');
    nextBiteLine.setAttribute('stroke-width', '3');
    nextBiteLine.setAttribute('marker-end', `url(#arrow_${itemKey})`);
    this.nextBiteGEl.appendChild(nextBiteLine);
    this.svgEl.appendChild(this.nextBiteGEl);

    // Debug Cursor
    this.debugCursorEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.debugCursorEl.setAttribute('fill', 'none');
    this.debugCursorEl.setAttribute('stroke', 'white');
    this.debugCursorEl.setAttribute('stroke-width', '2');
    this.debugCursorEl.setAttribute('stroke-dasharray', '5,5');
    this.debugCursorEl.style.pointerEvents = 'none';
    this.debugCursorEl.style.opacity = '0';
    this.debugCursorEl.style.transition = 'opacity 200ms';
    this.svgEl.appendChild(this.debugCursorEl);

    this.wrapperEl.appendChild(this.svgEl);

    // 3. Crumb Canvas Overlay
    this.canvasEl = document.createElement('canvas');
    this.canvasEl.style.position = 'absolute';
    this.canvasEl.style.top = '0';
    this.canvasEl.style.left = '0';
    this.canvasEl.style.width = '100%';
    this.canvasEl.style.height = '100%';
    this.canvasEl.style.pointerEvents = 'none';
    this.canvasEl.style.overflow = 'hidden';
    this.canvasCtx = this.canvasEl.getContext('2d')!;
    this.wrapperEl.appendChild(this.canvasEl);

    this.container.appendChild(this.wrapperEl);

    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
  }

  private resizeCanvas = () => {
    const rect = this.wrapperEl.getBoundingClientRect();
    this.canvasEl.width = rect.width * window.devicePixelRatio;
    this.canvasEl.height = rect.height * window.devicePixelRatio;
    this.canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  };

  // --- Grid & Core State Initializer ---
  private initGridState() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const vb = this.viewBox.split(' ').map(Number);
    const w = vb[2] || 480;
    const h = vb[3] || 480;
    
    canvas.width = w;
    canvas.height = h;

    // Draw path
    ctx.fillStyle = this.colors.base;
    ctx.beginPath();
    const path2d = new Path2D(this.svgPath);
    ctx.fill(path2d);

    const colorData = ctx.getImageData(0, 0, w, h);

    const cols = Math.ceil(w / GRID_CELL_SIZE);
    const rows = Math.ceil(h / GRID_CELL_SIZE);
    const len = cols * rows;

    this.gridCols = cols;
    this.gridRows = rows;
    this.gridWidth = w;
    this.gridHeight = h;

    this.initialGrid = new Uint8Array(len);
    this.colorGrid = new Uint8ClampedArray(len * 4);
    const pixels: { x: number; y: number; d: number }[] = [];

    const cx = this.config.cx;
    const cy = this.config.cy;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const coords = this.getCellCoords(r * cols + c);
        if (ctx.isPointInPath(path2d, coords.x, coords.y)) {
          this.initialGrid[r * cols + c] = 1;

          // Sample color
          const pixelX = Math.floor(coords.x);
          const pixelY = Math.floor(coords.y);
          const pixelIdx = (pixelY * w + pixelX) * 4;
          const cellIdx = (r * cols + c) * 4;

          if (pixelIdx >= 0 && pixelIdx < colorData.data.length) {
            this.colorGrid[cellIdx] = colorData.data[pixelIdx];
            this.colorGrid[cellIdx + 1] = colorData.data[pixelIdx + 1];
            this.colorGrid[cellIdx + 2] = colorData.data[pixelIdx + 2];
            this.colorGrid[cellIdx + 3] = colorData.data[pixelIdx + 3];
          }

          const d = (coords.x - cx) ** 2 + (coords.y - cy) ** 2;
          pixels.push({ x: coords.x, y: coords.y, d });
        }
      }
    }

    pixels.sort((a, b) => b.d - a.d);
    this.sortedPixels = pixels;

    this.grid = new Uint8Array(len);
    this.grid.set(this.initialGrid);

    // If imageSrc, asynchronously draw image to get precise color sampling
    if (this.imageSrc) {
      const img = new Image();
      if (!isDataURI(this.imageSrc)) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.fill(path2d);
        ctx.globalCompositeOperation = 'source-over';

        const imageColorData = ctx.getImageData(0, 0, w, h);
        for (let i = 0; i < len; i++) {
          if (this.grid && this.grid[i] === 1) {
            const coords = this.getCellCoords(i);
            const pixelX = Math.floor(coords.x);
            const pixelY = Math.floor(coords.y);
            const pixelIdx = (pixelY * w + pixelX) * 4;
            const cellIdx = i * 4;

            if (pixelIdx >= 0 && pixelIdx < imageColorData.data.length && this.colorGrid) {
              this.colorGrid[cellIdx] = imageColorData.data[pixelIdx];
              this.colorGrid[cellIdx + 1] = imageColorData.data[pixelIdx + 1];
              this.colorGrid[cellIdx + 2] = imageColorData.data[pixelIdx + 2];
              this.colorGrid[cellIdx + 3] = imageColorData.data[pixelIdx + 3];
            }
          }
        }
        this.detectColorDominance();
      };
      img.src = this.imageSrc;
    } else {
      this.detectColorDominance();
    }

    this.bites = [];
    this.crumbs = [];
    this.lastBitePos = null;
    this.lastBiteAngle = this.getStartAngle();
    this.isFinished = false;
    this.isResetting = false;
    this.lastInteractTime = 0;

    this.replan();
    this.scheduleAutoEat();
  }

  // --- Geometry/Calculations Helpers ---
  private getCellCoords(idx: number): Point {
    return {
      x: (idx % this.gridCols) * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
      y: Math.floor(idx / this.gridCols) * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
    };
  }

  private getStartAngle(): number {
    if (this.sortedPixels.length === 0) return -Math.PI / 2;
    const randomness = this.config.startPointRandomness ?? 0.0;
    const limit = Math.max(1, Math.floor(this.sortedPixels.length * 0.5 * randomness));
    const index = Math.floor(Math.random() * limit);
    const p = this.sortedPixels[index];
    return Math.atan2(p.y - this.config.cy, p.x - this.config.cx);
  }

  private colorSimilarity(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }): number {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.max(0, 1 - Math.sqrt(dr * dr + dg * dg + db * db) / 441);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private varyColor(hex: string) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    const variance = 40;
    const noise = () => Math.floor((Math.random() - 0.5) * variance);
    const r = Math.min(255, Math.max(0, rgb.r + noise()));
    const g = Math.min(255, Math.max(0, rgb.g + noise()));
    const b = Math.min(255, Math.max(0, rgb.b + noise()));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  private detectColorDominance() {
    if (!this.config.colorDominance?.enabled || !this.colorGrid || !this.initialGrid) return;
    const len = this.initialGrid.length;

    const colorMap = new Map<string, number>();
    const colorToHex = (r: number, g: number, b: number) => {
      const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
      return `#${[r, g, b].map(x => clamp(x).toString(16).padStart(2, '0')).join('')}`;
    };

    const quantize = (val: number) => Math.round(val / 8) * 8;

    for (let i = 0; i < len; i++) {
      if (this.initialGrid[i] === 1) {
        const idx = i * 4;
        const r = quantize(this.colorGrid[idx]);
        const g = quantize(this.colorGrid[idx + 1]);
        const b = quantize(this.colorGrid[idx + 2]);
        const a = this.colorGrid[idx + 3];

        if (a < 128) continue;
        const hex = colorToHex(r, g, b);
        colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
      }
    }

    const totalPixels = this.sortedPixels.length;
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .filter(([_, count]) => count / totalPixels > 0.01)
      .map(([color, count]) => ({
        color,
        percentage: count / totalPixels
      }));

    const colorRegions: Array<{ color: string; points: Point[] }> = [];
    const tolerance = this.config.colorDominance?.tolerance ?? 0.2;

    for (const { color: dominantColor } of sortedColors) {
      const targetColor = this.hexToRgb(dominantColor);
      if (targetColor) {
        const regionPoints: Point[] = [];
        for (let i = 0; i < len; i++) {
          if (this.initialGrid[i] === 1) {
            const idx = i * 4;
            const cellColor = {
              r: this.colorGrid[idx],
              g: this.colorGrid[idx + 1],
              b: this.colorGrid[idx + 2]
            };
            if (this.colorSimilarity(cellColor, targetColor) >= (1 - tolerance)) {
              regionPoints.push(this.getCellCoords(i));
            }
          }
        }
        if (regionPoints.length > 0) {
          colorRegions.push({ color: dominantColor, points: regionPoints });
        }
      }
    }

    this.colorDominanceData = {
      dominantColors: sortedColors,
      regions: colorRegions
    };

    if (this.onColorDominanceDetected && sortedColors.length > 0) {
      this.onColorDominanceDetected(sortedColors[0].color, sortedColors);
    }
  }

  // --- Connected Components Analysis ---
  private analyzeGrid() {
    if (!this.grid) return null;
    const cols = this.gridCols;
    const rows = this.gridRows;

    const visited = new Uint8Array(this.grid.length);
    const clusters: number[][] = [];
    const tips: number[] = [];
    const edges: number[] = [];

    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === 1 && visited[i] === 0) {
        const cluster: number[] = [];
        const queue = [i];
        visited[i] = 1;

        while (queue.length > 0) {
          const idx = queue.pop()!;
          cluster.push(idx);

          const cx = idx % cols;
          const cy = Math.floor(idx / cols);

          let emptyNeighbors = 0;
          const validN = [];

          if (cy > 0) validN.push(idx - cols); else emptyNeighbors++;
          if (cy < rows - 1) validN.push(idx + cols); else emptyNeighbors++;
          if (cx > 0) validN.push(idx - 1); else emptyNeighbors++;
          if (cx < cols - 1) validN.push(idx + 1); else emptyNeighbors++;

          for (const nIdx of validN) {
            if (this.grid[nIdx] === 0) {
              emptyNeighbors++;
            } else if (visited[nIdx] === 0) {
              visited[nIdx] = 1;
              queue.push(nIdx);
            }
          }

          if (emptyNeighbors >= 3) {
            tips.push(idx);
          } else if (emptyNeighbors >= 1) {
            edges.push(idx);
          }
        }
        clusters.push(cluster);
      }
    }

    if (clusters.length === 0) return { meatCount: 0, clusters: [], tips: [], edges: [] };
    clusters.sort((a, b) => a.length - b.length);

    return {
      meatCount: clusters.reduce((acc, c) => acc + c.length, 0),
      clusters,
      tips,
      edges
    };
  }

  private calculateStructure() {
    const analysis = this.analyzeGrid();
    if (!analysis || analysis.clusters.length === 0) return { islands: [], perimeter: [], tips: [] };

    const { clusters, tips, edges } = analysis;
    const islandsIndices = clusters.length > 1 ? clusters.slice(0, clusters.length - 1).flat() : [];

    return {
      islands: islandsIndices.map(idx => this.getCellCoords(idx)),
      perimeter: edges.map(idx => this.getCellCoords(idx)),
      tips: tips.map(idx => this.getCellCoords(idx))
    };
  }

  // --- Path Generator ---
  private generateBitePath(radius: number): string {
    const roundness = this.config.biteRoundness ?? 0.8;
    const depthVariance = this.config.biteDepthVariance ?? 0.2;

    const points = 24;
    const vertices: { x: number; y: number }[] = [];
    const depthScale = 1.0 + (Math.random() - 0.5) * depthVariance * 1.5;

    const hBase = radius * depthScale;
    const wBase = radius * 1.25;

    for (let i = 0; i < points; i++) {
      const t = i / points;
      const angle = t * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const normalizedY = -cos;
      const taper = 1.0 + 0.3 * normalizedY;

      const noiseMagnitude = (1 - roundness) * 0.5;
      const randomScale = 1 + (Math.random() - 0.5) * noiseMagnitude;

      vertices.push({
        x: sin * wBase * taper * randomScale,
        y: -cos * hBase * randomScale
      });
    }

    let d = "";
    if (roundness > 0.4) {
      const p0 = vertices[0];
      const pLast = vertices[vertices.length - 1];
      d += `M ${((pLast.x + p0.x) / 2).toFixed(2)} ${((pLast.y + p0.y) / 2).toFixed(2)}`;

      for (let i = 0; i < points; i++) {
        const curr = vertices[i];
        const next = vertices[(i + 1) % points];
        const midX = (curr.x + next.x) / 2;
        const midY = (curr.y + next.y) / 2;
        d += ` Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
      }
    } else {
      d += `M ${vertices[0].x.toFixed(2)} ${vertices[0].y.toFixed(2)}`;
      for (let i = 1; i < points; i++) {
        d += ` L ${vertices[i].x.toFixed(2)} ${vertices[i].y.toFixed(2)}`;
      }
    }

    d += " Z";
    return d;
  }

  // --- Auto-Eat Targeting Plan ---
  private planNextBite(): Bite | null {
    const analysis = this.analyzeGrid();
    if (!analysis || analysis.meatCount === 0) return null;

    const { clusters, tips, edges } = analysis;
    const mainClusterIndices = new Set(clusters[clusters.length - 1]);
    
    let candidates: { idx: number; x: number; y: number; angle: number; angleDiff: number; dist: number; isTip: boolean }[] = [];
    const allCandidates = [...edges, ...tips];
    const lastAngle = this.lastBiteAngle;
    const cx = this.config.cx;
    const cy = this.config.cy;

    for (const idx of allCandidates) {
      if (mainClusterIndices.has(idx)) {
        const c = this.getCellCoords(idx);
        const dx = c.x - cx;
        const dy = c.y - cy;
        const angle = Math.atan2(dy, dx);
        const dist = Math.sqrt(dx * dx + dy * dy);

        let angleDiff = angle - lastAngle;
        while (angleDiff < 0) angleDiff += Math.PI * 2;
        while (angleDiff >= Math.PI * 2) angleDiff -= Math.PI * 2;

        candidates.push({
          idx,
          x: c.x,
          y: c.y,
          angle,
          angleDiff,
          dist,
          isTip: tips.includes(idx)
        });
      }
    }

    if (candidates.length === 0) return null;

    let activeCandidates: typeof candidates = [];
    let maxDistInWindow = 0;

    if (this.config.randomBitePlacement) {
      activeCandidates = candidates;
      for (const c of candidates) if (c.dist > maxDistInWindow) maxDistInWindow = c.dist;
    } else {
      const windowSize = Math.PI * 0.66;
      for (const c of candidates) {
        if (c.angleDiff < windowSize) activeCandidates.push(c);
      }
      if (activeCandidates.length < 5) activeCandidates = candidates;
      for (const c of activeCandidates) if (c.dist > maxDistInWindow) maxDistInWindow = c.dist;
    }

    const biteSizeScale = this.config.biteSizeScale ?? 1.0;
    const baseR = 50 * (this.config.maxR / 240) * biteSizeScale;
    const maxBiteR = baseR * 1.1;
    const minBiteR = baseR * 0.7;

    const simulateBite = (bx: number, by: number, br: number) => {
      const clearR = br * 1.2;
      const clearRSq = clearR * clearR;
      const tempGrid = new Uint8Array(this.grid!);
      
      const startCol = Math.max(0, Math.floor((bx - clearR) / GRID_CELL_SIZE));
      const endCol = Math.min(this.gridCols - 1, Math.ceil((bx + clearR) / GRID_CELL_SIZE));
      const startRow = Math.max(0, Math.floor((by - clearR) / GRID_CELL_SIZE));
      const endRow = Math.min(this.gridRows - 1, Math.ceil((by + clearR) / GRID_CELL_SIZE));

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const idx = r * this.gridCols + c;
          if (tempGrid[idx] === 1) {
            const px = c * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
            const py = r * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
            if ((px - bx) ** 2 + (py - by) ** 2 <= clearRSq) {
              tempGrid[idx] = 0;
            }
          }
        }
      }

      const visited = new Uint8Array(tempGrid.length);
      const clustersCount: number[][] = [];

      for (let i = 0; i < tempGrid.length; i++) {
        if (tempGrid[i] === 1 && visited[i] === 0) {
          const cluster: number[] = [];
          const queue = [i];
          visited[i] = 1;
          while (queue.length > 0) {
            const idx = queue.pop()!;
            cluster.push(idx);
            const cc = idx % this.gridCols;
            const cr = Math.floor(idx / this.gridCols);

            if (cr > 0 && tempGrid[idx - this.gridCols] === 1 && visited[idx - this.gridCols] === 0) {
              visited[idx - this.gridCols] = 1;
              queue.push(idx - this.gridCols);
            }
            if (cr < this.gridRows - 1 && tempGrid[idx + this.gridCols] === 1 && visited[idx + this.gridCols] === 0) {
              visited[idx + this.gridCols] = 1;
              queue.push(idx + this.gridCols);
            }
            if (cc > 0 && tempGrid[idx - 1] === 1 && visited[idx - 1] === 0) {
              visited[idx - 1] = 1;
              queue.push(idx - 1);
            }
            if (cc < this.gridCols - 1 && tempGrid[idx + 1] === 1 && visited[idx + 1] === 0) {
              visited[idx + 1] = 1;
              queue.push(idx + 1);
            }
          }
          clustersCount.push(cluster);
        }
      }

      return {
        wouldCreateIslands: clustersCount.length > 1,
        depth: maxDistInWindow - Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2)
      };
    };

    const findOptimal = (bx: number, by: number) => {
      let bestR = minBiteR;
      let bestRes = { wouldCreateIslands: false, depth: 0 };
      const testSizes = [minBiteR, minBiteR + (maxBiteR - minBiteR) * 0.5, maxBiteR];

      for (const rSize of testSizes) {
        const simulated = simulateBite(bx, by, rSize);
        if (!simulated.wouldCreateIslands && rSize > bestR) {
          bestR = rSize;
          bestRes = simulated;
        }
      }

      if (bestR === minBiteR) {
        bestRes = simulateBite(bx, by, minBiteR);
      }
      return { rSize: bestR, ...bestRes };
    };

    const getCdScore = (candX: number, candY: number, checkR: number) => {
      if (!this.config.colorDominance?.enabled || !this.colorGrid || !this.config.colorDominance.targetColor) return 0;
      const target = this.hexToRgb(this.config.colorDominance.targetColor);
      if (!target) return 0;

      const tolerance = this.config.colorDominance.tolerance ?? 0.2;
      const strength = this.config.colorDominance.strength ?? 0.5;

      const startCol = Math.max(0, Math.floor((candX - checkR) / GRID_CELL_SIZE));
      const endCol = Math.min(this.gridCols - 1, Math.ceil((candX + checkR) / GRID_CELL_SIZE));
      const startRow = Math.max(0, Math.floor((candY - checkR) / GRID_CELL_SIZE));
      const endRow = Math.min(this.gridRows - 1, Math.ceil((candY + checkR) / GRID_CELL_SIZE));

      let matched = 0, total = 0;
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const idx = r * this.gridCols + c;
          if (this.grid && this.grid[idx] === 1) {
            const distSq = (c * GRID_CELL_SIZE + GRID_CELL_SIZE / 2 - candX) ** 2 + (r * GRID_CELL_SIZE + GRID_CELL_SIZE / 2 - candY) ** 2;
            if (distSq <= checkR * checkR) {
              total++;
              const colorIdx = idx * 4;
              const cellColor = {
                r: this.colorGrid[colorIdx],
                g: this.colorGrid[colorIdx + 1],
                b: this.colorGrid[colorIdx + 2]
              };
              if (this.colorSimilarity(cellColor, target) >= (1 - tolerance)) {
                matched++;
              }
            }
          }
        }
      }
      return total === 0 ? 0 : -(matched / total) * strength * 3000;
    };

    const drillInBias = this.config.drillInBias ?? 0.2;
    const depthCostMult = 5 * (1 - drillInBias);

    let bestCand = activeCandidates[0];
    let minScore = Infinity;
    let finalBiteR = baseR;

    for (const cand of activeCandidates) {
      const opt = findOptimal(cand.x, cand.y);
      const angleCost = this.config.randomBitePlacement ? 0 : cand.angleDiff * 250;
      const depth = maxDistInWindow - cand.dist;
      const depthCost = depth * depthCostMult;
      const tipBonus = cand.isTip ? -100 : 0;

      // Meat density inward look
      const vx = cx - cand.x;
      const vy = cy - cand.y;
      const len = Math.sqrt(vx * vx + vy * vy) || 1;
      const checkX = cand.x + (vx / len) * 15;
      const checkY = cand.y + (vy / len) * 15;
      const checkCol = Math.floor(checkX / GRID_CELL_SIZE);
      const checkRow = Math.floor(checkY / GRID_CELL_SIZE);
      const checkIdx = checkRow * this.gridCols + checkCol;

      let emptyPenalty = 0;
      const isValid = checkCol >= 0 && checkCol < this.gridCols && checkRow >= 0 && checkRow < this.gridRows;
      if (!isValid || (this.grid && this.grid[checkIdx] === 0)) {
        emptyPenalty = 2500;
      }

      let islandPenalty = 0;
      if (opt.wouldCreateIslands) {
        islandPenalty = 5000 + opt.depth * 100;
      }

      const ratio = opt.depth / opt.rSize;
      const deepBitePenalty = ratio > 0.5 ? (ratio - 0.5) * 2000 : 0;
      const biteSizeBonus = opt.rSize >= minBiteR * 0.9 ? 0 : -500;
      const cdScore = getCdScore(cand.x, cand.y, opt.rSize);
      const noise = this.config.randomBitePlacement ? Math.random() * 2000 : Math.random() * 200;

      const score = angleCost + depthCost + tipBonus + emptyPenalty + islandPenalty + deepBitePenalty + biteSizeBonus + cdScore - noise;

      if (score < minScore) {
        minScore = score;
        bestCand = cand;
        finalBiteR = opt.rSize;
      }
    }

    const isTip = tips.includes(bestCand.idx);
    const finalR = isTip ? Math.min(maxBiteR, finalBiteR * 1.1) : finalBiteR;
    const rotation = (Math.atan2(bestCand.y - cy, bestCand.x - cx) * 180 / Math.PI) - 90;

    return {
      id: Date.now() + Math.random(),
      x: bestCand.x,
      y: bestCand.y,
      path: this.generateBitePath(finalR),
      rotation,
      scale: 1.0,
      radius: finalR
    };
  }

  // --- Particle/Crumbs Spawning ---
  private spawnCrumbs(x: number, y: number, intensity: number) {
    if (this.config.showCrumbs === false) return;
    const count = intensity > 1.2 ? 16 : 8;
    const speedBase = intensity > 1.2 ? 18 : 10;
    const biteSizeScale = this.config.biteSizeScale ?? 1.0;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (speedBase * 0.5) + Math.random() * speedBase;
      const baseColor = this.colors.crumbs[Math.floor(Math.random() * this.colors.crumbs.length)];
      const shapes: ('triangle' | 'circle' | 'rect')[] = ['triangle', 'circle', 'rect'];
      const baseSize = (4 + Math.random() * 6) * (intensity > 1.2 ? 1.4 : 1);

      this.crumbs.push({
        id: Date.now() + i + Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        size: baseSize * biteSizeScale,
        color: this.varyColor(baseColor),
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 60,
        life: 0.6 + Math.random() * 0.4
      });
    }
  }

  private explodeRemaining() {
    if (!this.grid) return;
    let activeCount = 0;
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === 1) activeCount++;
    }
    const probability = activeCount < 100 ? 1.0 : (100 / activeCount);
    const biteSizeScale = this.config.biteSizeScale ?? 1.0;

    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === 1 && Math.random() <= probability) {
        const { x, y } = this.getCellCoords(i);
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 15;
        const baseColor = this.colors.crumbs[Math.floor(Math.random() * this.colors.crumbs.length)];

        this.crumbs.push({
          id: Date.now() + Math.random() + i,
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 5,
          size: (4 + Math.random() * 6) * biteSizeScale,
          color: this.varyColor(baseColor),
          shape: Math.random() > 0.5 ? 'circle' : 'rect',
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 60,
          life: 0.8 + Math.random() * 0.5
        });
      }
    }
  }

  private crumbleIndices(indices: number[]) {
    if (!this.grid) return;
    const probability = indices.length > 50 ? 0.4 : 1.0;
    const cx = this.config.cx;
    const cy = this.config.cy;
    const biteSizeScale = this.config.biteSizeScale ?? 1.0;

    for (const idx of indices) {
      if (this.grid[idx] === 1) {
        this.grid[idx] = 0;
        if (Math.random() <= probability) {
          const { x, y } = this.getCellCoords(idx);
          const dx = x - cx;
          const dy = y - cy;
          const angle = Math.atan2(dy, dx) + (Math.random() - 0.5);
          const speed = 5 + Math.random() * 15;
          const baseColor = this.colors.crumbs[Math.floor(Math.random() * this.colors.crumbs.length)];

          this.crumbs.push({
            id: Date.now() + Math.random() + idx,
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: (4 + Math.random() * 7) * biteSizeScale,
            color: this.varyColor(baseColor),
            shape: Math.random() > 0.5 ? 'triangle' : 'rect',
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 80,
            life: 0.9 + Math.random() * 0.4
          });
        }
      }
    }
  }

  // --- Engine Trigger Bite ---
  public triggerBite(manualPoint?: { x: number; y: number }) {
    if (this.isFinished || !this.grid) return;

    if (manualPoint) {
      this.lastInteractTime = Date.now();
    } else if (Date.now() - this.lastInteractTime < IDLE_THRESHOLD) {
      return;
    }

    let plan = manualPoint ? null : this.nextBite;
    if (!plan && !manualPoint) plan = this.planNextBite();

    if (!plan && !manualPoint) {
      const analysis = this.analyzeGrid();
      const mainBodySize = analysis?.clusters[analysis.clusters.length - 1]?.length || 0;

      let realCount = 0;
      for (let i = 0; i < this.grid.length; i++) {
        if (this.grid[i] === 1) realCount++;
      }

      if (mainBodySize < 15 || realCount < 15) {
        this.explodeRemaining();
        this.isFinished = true;
        
        const finishBite: Bite = {
          id: Date.now() + 1,
          x: this.config.cx,
          y: this.config.cy,
          path: this.generateBitePath(this.config.maxR * 1.5),
          rotation: 0,
          scale: 1,
          radius: this.config.maxR * 1.5
        };
        this.addBiteToDOM(finishBite);
        
        this.resetTimeout = setTimeout(() => this.reset(), 1500);
        if (this.onFinished) this.onFinished();
      }
      return;
    }

    let tx = 0, ty = 0, bitePath = '', rotation = 0, biteRadius = 0;

    if (manualPoint) {
      tx = manualPoint.x;
      ty = manualPoint.y;

      const sizeScale = (this.config.maxR / 240) * (this.config.biteSizeScale ?? 1.0);
      const baseR = 50 * sizeScale;
      const maxBiteR = baseR * 1.1;
      const minBiteR = baseR * 0.7;

      let optimalBiteR = baseR;
      const testSizes = [minBiteR, baseR * 0.85, baseR, maxBiteR];

      for (const testR of testSizes) {
        const clearR = testR * 1.2;
        const clearRSq = clearR * clearR;
        const tempGrid = new Uint8Array(this.grid);

        const startCol = Math.max(0, Math.floor((tx - clearR) / GRID_CELL_SIZE));
        const endCol = Math.min(this.gridCols - 1, Math.ceil((tx + clearR) / GRID_CELL_SIZE));
        const startRow = Math.max(0, Math.floor((ty - clearR) / GRID_CELL_SIZE));
        const endRow = Math.min(this.gridRows - 1, Math.ceil((ty + clearR) / GRID_CELL_SIZE));

        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const idx = r * this.gridCols + c;
            if (tempGrid[idx] === 1) {
              const px = c * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
              const py = r * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
              if ((px - tx) ** 2 + (py - ty) ** 2 <= clearRSq) {
                tempGrid[idx] = 0;
              }
            }
          }
        }

        const visited = new Uint8Array(tempGrid.length);
        let clusterCount = 0;
        for (let i = 0; i < tempGrid.length; i++) {
          if (tempGrid[i] === 1 && visited[i] === 0) {
            clusterCount++;
            const queue = [i];
            visited[i] = 1;
            while (queue.length > 0) {
              const idx = queue.pop()!;
              const cellX = idx % this.gridCols;
              const cellY = Math.floor(idx / this.gridCols);
              if (cellY > 0 && tempGrid[idx - this.gridCols] === 1 && visited[idx - this.gridCols] === 0) {
                visited[idx - this.gridCols] = 1;
                queue.push(idx - this.gridCols);
              }
              if (cellY < this.gridRows - 1 && tempGrid[idx + this.gridCols] === 1 && visited[idx + this.gridCols] === 0) {
                visited[idx + this.gridCols] = 1;
                queue.push(idx + this.gridCols);
              }
              if (cellX > 0 && tempGrid[idx - 1] === 1 && visited[idx - 1] === 0) {
                visited[idx - 1] = 1;
                queue.push(idx - 1);
              }
              if (cellX < this.gridCols - 1 && tempGrid[idx + 1] === 1 && visited[idx + 1] === 0) {
                visited[idx + 1] = 1;
                queue.push(idx + 1);
              }
            }
          }
        }

        if (clusterCount <= 1 && testR > optimalBiteR) {
          optimalBiteR = testR;
        }
      }

      const angleToCenter = Math.atan2(ty - this.config.cy, tx - this.config.cx);
      rotation = (angleToCenter * 180 / Math.PI) - 90;
      bitePath = this.generateBitePath(optimalBiteR);
      biteRadius = optimalBiteR;

      this.lastBitePos = { x: tx, y: ty };
      this.lastBiteAngle = angleToCenter;
    } else if (plan) {
      tx = plan.x;
      ty = plan.y;
      bitePath = plan.path;
      rotation = plan.rotation;
      biteRadius = plan.radius ?? (50 * (this.config.maxR / 240) * (this.config.biteSizeScale ?? 1.0));
      this.lastBitePos = { x: tx, y: ty };
    }

    const clearR = biteRadius * 1.2;
    const clearRSq = clearR * clearR;
    const startCol = Math.max(0, Math.floor((tx - clearR) / GRID_CELL_SIZE));
    const endCol = Math.min(this.gridCols - 1, Math.ceil((tx + clearR) / GRID_CELL_SIZE));
    const startRow = Math.max(0, Math.floor((ty - clearR) / GRID_CELL_SIZE));
    const endRow = Math.min(this.gridRows - 1, Math.ceil((ty + clearR) / GRID_CELL_SIZE));

    let removed = 0;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const idx = r * this.gridCols + c;
        if (this.grid[idx] === 1) {
          const px = c * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
          const py = r * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
          if ((px - tx) ** 2 + (py - ty) ** 2 <= clearRSq) {
            this.grid[idx] = 0;
            removed++;
          }
        }
      }
    }

    const analysis = this.analyzeGrid();
    if (analysis && analysis.clusters.length > 1) {
      for (let i = 0; i < analysis.clusters.length - 1; i++) {
        this.crumbleIndices(analysis.clusters[i]);
      }
    }

    const newBite: Bite = {
      id: Date.now() + Math.random(),
      x: tx,
      y: ty,
      path: bitePath,
      rotation,
      scale: 1.0,
      radius: biteRadius
    };

    this.bites.push(newBite);
    this.addBiteToDOM(newBite);
    this.spawnCrumbs(tx, ty, removed > 20 ? 1.5 : 1.0);

    // Apply scale dip animation
    if (this.scaleTimeout) clearTimeout(this.scaleTimeout);
    this.scale = 0.995;
    this.updateSVGStyle();
    this.scaleTimeout = setTimeout(() => {
      this.scale = 1;
      this.updateSVGStyle();
    }, 150);

    this.replan();
  }

  private addBiteToDOM(bite: Bite) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', bite.path);
    p.setAttribute('fill', 'black');
    p.setAttribute('transform', `translate(${bite.x}, ${bite.y}) rotate(${bite.rotation}) scale(${bite.scale})`);
    this.maskEl.appendChild(p);
  }

  private updateSVGStyle() {
    let dur = 150;
    let timing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    let opacity = 1;
    let s = this.scale;

    const resetDur = this.config.resetDuration || 800;
    const shouldShrink = this.config.animateExit ?? true;

    if (this.isResetting) {
      dur = resetDur * 0.8;
      s = shouldShrink ? 0.05 : 1;
      opacity = 0;
      timing = 'ease-in-out';
    }

    this.svgEl.style.transition = `transform ${dur}ms ${timing}, opacity ${this.isResetting ? resetDur * 0.5 : 300}ms ease`;
    this.svgEl.style.transform = `scale(${s})`;
    this.svgEl.style.opacity = String(opacity);
  }

  private replan() {
    this.nextBite = this.planNextBite();
    this.updateOverlays();
  }

  private updateOverlays() {
    // 1. Next Bite Preview
    if (this.nextBite && !this.isFinished && !this.isResetting && this.config.showNextBitePreview) {
      this.nextBiteGEl!.style.display = 'block';
      this.nextBiteGEl!.setAttribute('transform', `translate(${this.nextBite.x}, ${this.nextBite.y}) rotate(${this.nextBite.rotation})`);
      this.nextBiteGEl!.firstElementChild!.setAttribute('d', this.nextBite.path);
    } else {
      this.nextBiteGEl!.style.display = 'none';
    }

    // 2. Structure Preview
    while (this.structureGEl!.firstChild) {
      this.structureGEl!.removeChild(this.structureGEl!.firstChild);
    }
    
    if (this.config.showStructurePreview && !this.isFinished && !this.isResetting) {
      const struct = this.calculateStructure();
      
      // Perimeter (Cyan)
      struct.perimeter.forEach(pt => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', String(pt.x));
        c.setAttribute('cy', String(pt.y));
        c.setAttribute('r', '2');
        c.setAttribute('fill', '#06B6D4');
        c.setAttribute('opacity', '0.6');
        this.structureGEl!.appendChild(c);
      });

      // Tips (Peninsulas - Magenta)
      struct.tips.forEach(pt => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', String(pt.x));
        c.setAttribute('cy', String(pt.y));
        c.setAttribute('r', '4');
        c.setAttribute('fill', '#D946EF');
        c.setAttribute('opacity', '0.9');
        this.structureGEl!.appendChild(c);
      });

      // Islands (Red)
      struct.islands.forEach(pt => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', String(pt.x));
        c.setAttribute('cy', String(pt.y));
        c.setAttribute('r', '3');
        c.setAttribute('fill', '#EF4444');
        c.setAttribute('opacity', '0.8');
        this.structureGEl!.appendChild(c);
      });
    }

    // 3. Color Dominance Preview
    while (this.colorDominanceGEl!.firstChild) {
      this.colorDominanceGEl!.removeChild(this.colorDominanceGEl!.firstChild);
    }
    if (this.config.showColorDominance && this.colorDominanceData && !this.isFinished && !this.isResetting) {
      this.colorDominanceData.regions.forEach(reg => {
        reg.points.forEach(pt => {
          const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          c.setAttribute('cx', String(pt.x));
          c.setAttribute('cy', String(pt.y));
          c.setAttribute('r', String(GRID_CELL_SIZE / 2));
          c.setAttribute('fill', reg.color);
          c.setAttribute('opacity', '0.3');
          this.colorDominanceGEl!.appendChild(c);
        });
      });
    }
  }

  // --- Reset Engine ---
  public reset() {
    this.isResetting = true;
    this.updateSVGStyle();

    if (this.resetTimeout) clearTimeout(this.resetTimeout);
    
    this.resetTimeout = setTimeout(() => {
      if (this.initialGrid && this.grid) {
        this.grid.set(this.initialGrid);
      }
      this.bites = [];
      this.crumbs = [];
      this.lastBitePos = null;
      this.lastInteractTime = 0;

      // Clear mask
      while (this.maskEl.children.length > 1) {
        this.maskEl.removeChild(this.maskEl.lastChild!);
      }

      this.lastBiteAngle = this.getStartAngle();
      this.isFinished = false;
      this.isResetting = false;

      this.updateSVGStyle();
      this.replan();
      this.scheduleAutoEat();
    }, this.config.resetDuration || 800);
  }

  // --- Auto Eat Schedule ---
  private scheduleAutoEat() {
    if (this.autoEatTimeout) clearTimeout(this.autoEatTimeout);
    if (!this.config.autoEat || this.isResetting || this.isFinished) return;

    const loop = () => {
      if (!this.config.autoEat || this.isResetting || this.isFinished) return;
      this.triggerBite();

      const variation = (this.config.interval ?? 200) * 0.2;
      const delay = (this.config.interval ?? 200) + (Math.random() * variation - variation / 2);
      const isPaused = Date.now() - this.lastInteractTime < IDLE_THRESHOLD;
      const nextTick = isPaused ? 100 : Math.max(20, delay);

      this.autoEatTimeout = setTimeout(loop, nextTick);
    };

    this.autoEatTimeout = setTimeout(loop, this.config.interval ?? 200);
  }

  // --- DOM Event Bindings ---
  private bindEvents() {
    const handleMouseBite = (e: MouseEvent) => {
      const pt = this.svgEl.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(this.svgEl.getScreenCTM()?.inverse());
      this.triggerBite({ x: svgP.x, y: svgP.y });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const pt = this.svgEl.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(this.svgEl.getScreenCTM()?.inverse());

      // Update Debug Cursor
      if (this.config.showDebug && !this.isFinished) {
        const radius = (this.config.maxR / 240) * (this.config.biteSizeScale ?? 1.0) * 50;
        this.debugCursorEl!.setAttribute('cx', String(svgP.x));
        this.debugCursorEl!.setAttribute('cy', String(svgP.y));
        this.debugCursorEl!.setAttribute('r', String(radius));
      }
    };

    this.wrapperEl.addEventListener('click', handleMouseBite);
    this.wrapperEl.addEventListener('mousemove', handleMouseMove);

    this.wrapperEl.addEventListener('mouseenter', () => {
      if (this.config.showDebug && !this.isFinished) {
        this.debugCursorEl!.style.opacity = '0.6';
      }
    });

    this.wrapperEl.addEventListener('mouseleave', () => {
      this.debugCursorEl!.style.opacity = '0';
    });
  }

  // --- Animation Frame loop for Crumbs Canvas Rendering ---
  private startLoop() {
    const gravity = this.config.gravity ?? 0.2;
    const drag = this.config.drag ?? 0.96;

    const tick = () => {
      // 1. Tick Crumb Physics
      this.crumbs = this.crumbs.map(crumb => {
        const vx = crumb.vx * drag;
        const vy = (crumb.vy + gravity) * drag;
        return {
          ...crumb,
          x: crumb.x + vx,
          y: crumb.y + vy,
          vx,
          vy,
          rotation: crumb.rotation + crumb.rotationSpeed * drag,
          life: crumb.life - 0.015
        };
      }).filter(c => c.life > 0);

      // 2. Draw to Canvas
      const ctx = this.canvasCtx;
      const rect = this.wrapperEl.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const vb = this.viewBox.split(' ').map(Number);
      const vbW = vb[2] || 480;
      const vbH = vb[3] || 480;

      // Scale coordinates from viewBox dimensions to canvas coordinates
      const scaleX = rect.width / vbW;
      const scaleY = rect.height / vbH;

      this.crumbs.forEach(crumb => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, crumb.life));
        ctx.fillStyle = crumb.color;
        ctx.translate(crumb.x * scaleX, crumb.y * scaleY);
        ctx.rotate(crumb.rotation * Math.PI / 180);

        // Resize size scale based on dimensions
        const size = crumb.size * scaleX;

        if (crumb.shape === 'triangle') {
          const h = size * (Math.sqrt(3) / 2);
          ctx.beginPath();
          ctx.moveTo(0, -h / 2);
          ctx.lineTo(size / 2, h / 2);
          ctx.lineTo(-size / 2, h / 2);
          ctx.closePath();
          ctx.fill();
        } else if (crumb.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-size / 2, -size / 2, size, size);
        }
        ctx.restore();
      });

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  // --- API Methods ---
  public setConfig(newConfig: Partial<YumConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.onionSkinEl!.style.display = this.config.showOnionSkin ? 'block' : 'none';
    this.replan();
    this.scheduleAutoEat();
  }

  public setColors(newColors: Partial<YumEaterColors>) {
    this.colors = { ...this.colors, ...newColors };
    if (this.mainBodyUseEl) {
      this.mainBodyUseEl.setAttribute('fill', this.colors.base);
    }
    this.onionSkinEl!.setAttribute('fill', this.colors.base);
    this.onionSkinEl!.setAttribute('stroke', this.colors.base);
  }

  public destroy() {
    window.removeEventListener('resize', this.resizeCanvas);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.autoEatTimeout) clearTimeout(this.autoEatTimeout);
    if (this.resetTimeout) clearTimeout(this.resetTimeout);
    if (this.scaleTimeout) clearTimeout(this.scaleTimeout);
    this.container.removeChild(this.wrapperEl);
  }
}
