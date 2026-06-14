/**
 * EatingEngine — The single source of truth for the YumYum eating algorithm.
 *
 * A pure, framework-agnostic class that owns the grid state, bite planning,
 * structural analysis, color dominance detection, and crumb spawning logic.
 * Both the React hook (`useYumYum`) and the Vanilla controller (`YumEater`)
 * delegate to an instance of this class.
 *
 * @remarks
 * - Zero DOM or React dependencies.
 * - Pooled typed arrays to minimize GC pressure during planning.
 * - Set-based lookups for O(1) tip/edge membership tests.
 */

import { Bite, Crumb, YumConfig, Point } from '../../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_CELL_SIZE = 10;
const IDLE_THRESHOLD = 2000;

// ---------------------------------------------------------------------------
// Color Helpers
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

export function colorSimilarity(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.max(0, 1 - Math.sqrt(dr * dr + dg * dg + db * db) / 441);
}

export function varyColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const variance = 40;
  const noise = () => Math.floor((Math.random() - 0.5) * variance);
  const r = Math.min(255, Math.max(0, rgb.r + noise()));
  const g = Math.min(255, Math.max(0, rgb.g + noise()));
  const b = Math.min(255, Math.max(0, rgb.b + noise()));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ---------------------------------------------------------------------------
// Bite Path Generator
// ---------------------------------------------------------------------------

export function generateBitePath(
  radius: number,
  roundness: number = 0.8,
  depthVariance: number = 0.1,
): string {
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
      y: -cos * hBase * randomScale,
    });
  }

  let d = '';
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

  d += ' Z';
  return d;
}

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

export interface EatingEngineCallbacks {
  onBite?: (bite: Bite) => void;
  onCrumbs?: (crumbs: Crumb[]) => void;
  onFinished?: () => void;
  onNextBiteChanged?: (bite: Bite | null) => void;
  onStructureChanged?: (structure: { islands: Point[]; perimeter: Point[]; tips: Point[] }) => void;
  onColorDominanceDetected?: (
    dominantColor: string,
    allColors: Array<{ color: string; percentage: number }>,
  ) => void;
  onStateChanged?: () => void;
}

// ---------------------------------------------------------------------------
// Color Dominance Data
// ---------------------------------------------------------------------------

export interface ColorDominanceData {
  dominantColors: Array<{ color: string; percentage: number }>;
  regions: Array<{ color: string; points: Point[] }>;
}

// ---------------------------------------------------------------------------
// Grid Analysis Result
// ---------------------------------------------------------------------------

interface GridAnalysis {
  meatCount: number;
  clusters: number[][];
  tips: number[];
  edges: number[];
  tipSet: Set<number>;
}

// ---------------------------------------------------------------------------
// EatingEngine
// ---------------------------------------------------------------------------

export class EatingEngine {
  // ---- Config ----
  private config: YumConfig;
  private crumbColors: string[];
  private callbacks: EatingEngineCallbacks;

  // ---- Grid State ----
  private initialGrid: Uint8Array | null = null;
  private grid: Uint8Array | null = null;
  private gridCols = 0;
  private gridRows = 0;
  private gridWidth = 0;
  private gridHeight = 0;
  private sortedPixels: { x: number; y: number; d: number }[] = [];
  private colorGrid: Uint8ClampedArray | null = null;

  // ---- Algorithm State ----
  private lastBiteAngle = -Math.PI / 2;
  private lastInteractTime = 0;
  private _nextBite: Bite | null = null;
  private _isFinished = false;
  private _isResetting = false;
  private _colorDominanceData: ColorDominanceData | null = null;

  // ---- Pooled Allocations (perf) ----
  private _tempGrid: Uint8Array | null = null;
  private _visited: Uint8Array | null = null;

  // ---- Public Getters ----
  get nextBite(): Bite | null { return this._nextBite; }
  get isFinished(): boolean { return this._isFinished; }
  get isResetting(): boolean { return this._isResetting; }
  get colorDominanceData(): ColorDominanceData | null { return this._colorDominanceData; }
  get cols(): number { return this.gridCols; }
  get rows(): number { return this.gridRows; }
  get width(): number { return this.gridWidth; }
  get height(): number { return this.gridHeight; }

  constructor(config: YumConfig, crumbColors: string[], callbacks: EatingEngineCallbacks = {}) {
    this.config = config;
    this.crumbColors = crumbColors;
    this.callbacks = callbacks;
  }

  // ===========================================================================
  // Grid Initialization
  // ===========================================================================

  /**
   * Initialize the grid from an offscreen canvas that has already rendered the
   * shape path. This is framework-agnostic — the caller creates the canvas.
   */
  initFromCanvas(
    ctx: CanvasRenderingContext2D,
    path2d: Path2D,
    canvasWidth: number,
    canvasHeight: number,
    baseColor?: string,
  ) {
    const w = canvasWidth;
    const h = canvasHeight;

    // Render path
    ctx.fillStyle = baseColor || '#000000';
    ctx.beginPath();
    ctx.fill(path2d);

    const colorData = ctx.getImageData(0, 0, w, h);

    const cols = Math.ceil(w / GRID_CELL_SIZE);
    const rows = Math.ceil(h / GRID_CELL_SIZE);
    const len = cols * rows;

    this.gridCols = cols;
    this.gridRows = rows;
    this.gridWidth = w;
    this.gridHeight = h;

    const masterGrid = new Uint8Array(len);
    const colorGridData = new Uint8ClampedArray(len * 4);
    const pixels: { x: number; y: number; d: number }[] = [];

    const { cx, cy } = this.config;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const coords = this.getCellCoords(idx);
        if (ctx.isPointInPath(path2d, coords.x, coords.y)) {
          masterGrid[idx] = 1;

          const pixelX = Math.floor(coords.x);
          const pixelY = Math.floor(coords.y);
          const pixelIdx = (pixelY * w + pixelX) * 4;
          const cellIdx = idx * 4;

          if (pixelIdx >= 0 && pixelIdx < colorData.data.length) {
            colorGridData[cellIdx] = colorData.data[pixelIdx];
            colorGridData[cellIdx + 1] = colorData.data[pixelIdx + 1];
            colorGridData[cellIdx + 2] = colorData.data[pixelIdx + 2];
            colorGridData[cellIdx + 3] = colorData.data[pixelIdx + 3];
          }

          const d = (coords.x - cx) ** 2 + (coords.y - cy) ** 2;
          pixels.push({ x: coords.x, y: coords.y, d });
        }
      }
    }

    pixels.sort((a, b) => b.d - a.d);
    this.sortedPixels = pixels;

    this.initialGrid = masterGrid;
    this.grid = new Uint8Array(len);
    this.grid.set(masterGrid);
    this.colorGrid = colorGridData;

    // Allocate pooled arrays
    this._tempGrid = new Uint8Array(len);
    this._visited = new Uint8Array(len);

    this.lastBiteAngle = this.getStartAngle();
    this._isFinished = false;
    this._isResetting = false;
    this.lastInteractTime = 0;

    // Detect color dominance
    if (this.config.colorDominance?.enabled) {
      this.detectColorDominance();
    } else {
      this._colorDominanceData = null;
    }

    // Plan first bite
    this.replan();
  }

  /**
   * Update the color grid with image-sourced color data (called after image loads).
   */
  updateColorGridFromImageData(imageColorData: ImageData, canvasWidth: number) {
    if (!this.grid || !this.colorGrid) return;
    const { cols } = this;
    const len = this.grid.length;

    for (let i = 0; i < len; i++) {
      if (this.grid[i] === 1) {
        const coords = this.getCellCoords(i);
        const pixelX = Math.floor(coords.x);
        const pixelY = Math.floor(coords.y);
        const pixelIdx = (pixelY * canvasWidth + pixelX) * 4;
        const cellIdx = i * 4;

        if (pixelIdx >= 0 && pixelIdx < imageColorData.data.length) {
          this.colorGrid[cellIdx] = imageColorData.data[pixelIdx];
          this.colorGrid[cellIdx + 1] = imageColorData.data[pixelIdx + 1];
          this.colorGrid[cellIdx + 2] = imageColorData.data[pixelIdx + 2];
          this.colorGrid[cellIdx + 3] = imageColorData.data[pixelIdx + 3];
        }
      }
    }

    this.detectColorDominance();
  }

  // ===========================================================================
  // Coordinate Helpers
  // ===========================================================================

  getCellCoords(idx: number): Point {
    return {
      x: (idx % this.gridCols) * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
      y: Math.floor(idx / this.gridCols) * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
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

  // ===========================================================================
  // Grid Analysis (Connected Components via BFS)
  // ===========================================================================

  analyzeGrid(): GridAnalysis | null {
    if (!this.grid) return null;
    const cols = this.gridCols;
    const rows = this.gridRows;
    const grid = this.grid;

    // Reuse pooled visited array
    const visited = this._visited!;
    visited.fill(0);

    const clusters: number[][] = [];
    const tips: number[] = [];
    const edges: number[] = [];

    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 1 && visited[i] === 0) {
        const cluster: number[] = [];
        const queue = [i];
        visited[i] = 1;

        while (queue.length > 0) {
          const idx = queue.pop()!;
          cluster.push(idx);

          const cx = idx % cols;
          const cy = Math.floor(idx / cols);

          let emptyNeighbors = 0;
          const validN: number[] = [];

          if (cy > 0) validN.push(idx - cols); else emptyNeighbors++;
          if (cy < rows - 1) validN.push(idx + cols); else emptyNeighbors++;
          if (cx > 0) validN.push(idx - 1); else emptyNeighbors++;
          if (cx < cols - 1) validN.push(idx + 1); else emptyNeighbors++;

          for (const nIdx of validN) {
            if (grid[nIdx] === 0) {
              emptyNeighbors++;
            } else if (visited[nIdx] === 0) {
              visited[nIdx] = 1;
              queue.push(nIdx);
            }
          }

          if (emptyNeighbors >= 3) tips.push(idx);
          else if (emptyNeighbors >= 1) edges.push(idx);
        }
        clusters.push(cluster);
      }
    }

    if (clusters.length === 0) {
      return { meatCount: 0, clusters: [], tips: [], edges: [], tipSet: new Set() };
    }

    clusters.sort((a, b) => a.length - b.length);
    return {
      meatCount: clusters.reduce((acc, c) => acc + c.length, 0),
      clusters,
      tips,
      edges,
      tipSet: new Set(tips),
    };
  }

  calculateStructure(): { islands: Point[]; perimeter: Point[]; tips: Point[] } {
    if (!this.config.showStructurePreview) return { islands: [], perimeter: [], tips: [] };

    const analysis = this.analyzeGrid();
    if (!analysis || analysis.clusters.length === 0) return { islands: [], perimeter: [], tips: [] };

    const { clusters, tips, edges } = analysis;
    const islandsIndices = clusters.length > 1 ? clusters.slice(0, -1).flat() : [];

    return {
      islands: islandsIndices.map(idx => this.getCellCoords(idx)),
      perimeter: edges.map(idx => this.getCellCoords(idx)),
      tips: tips.map(idx => this.getCellCoords(idx)),
    };
  }

  // ===========================================================================
  // Color Dominance Detection
  // ===========================================================================

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
      .map(([color, count]) => ({ color, percentage: count / totalPixels }));

    const colorRegions: Array<{ color: string; points: Point[] }> = [];
    const tolerance = this.config.colorDominance.tolerance ?? 0.2;

    for (const { color: dominantColor } of sortedColors) {
      const targetColor = hexToRgb(dominantColor);
      if (targetColor) {
        const regionPoints: Point[] = [];
        for (let i = 0; i < len; i++) {
          if (this.initialGrid[i] === 1) {
            const idx = i * 4;
            const cellColor = {
              r: this.colorGrid[idx],
              g: this.colorGrid[idx + 1],
              b: this.colorGrid[idx + 2],
            };
            if (colorSimilarity(cellColor, targetColor) >= 1 - tolerance) {
              regionPoints.push(this.getCellCoords(i));
            }
          }
        }
        if (regionPoints.length > 0) {
          colorRegions.push({ color: dominantColor, points: regionPoints });
        }
      }
    }

    this._colorDominanceData = { dominantColors: sortedColors, regions: colorRegions };

    if (this.callbacks.onColorDominanceDetected && sortedColors.length > 0) {
      this.callbacks.onColorDominanceDetected(sortedColors[0].color, sortedColors);
    }
  }

  // ===========================================================================
  // Bite Simulation (pooled arrays — no allocation per candidate)
  // ===========================================================================

  private simulateBitePooled(
    bx: number,
    by: number,
    br: number,
    maxDistInWindow: number,
  ): { wouldCreateIslands: boolean; depth: number } {
    if (!this.grid || !this._tempGrid || !this._visited) {
      return { wouldCreateIslands: false, depth: 0 };
    }

    const cols = this.gridCols;
    const rows = this.gridRows;
    const clearR = br * 1.2;
    const clearRSq = clearR * clearR;
    const { cx, cy } = this.config;

    // Copy grid into pooled temp
    this._tempGrid.set(this.grid);

    const startCol = Math.max(0, Math.floor((bx - clearR) / GRID_CELL_SIZE));
    const endCol = Math.min(cols - 1, Math.ceil((bx + clearR) / GRID_CELL_SIZE));
    const startRow = Math.max(0, Math.floor((by - clearR) / GRID_CELL_SIZE));
    const endRow = Math.min(rows - 1, Math.ceil((by + clearR) / GRID_CELL_SIZE));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const idx = r * cols + c;
        if (this._tempGrid[idx] === 1) {
          const px = c * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
          const py = r * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
          if ((px - bx) ** 2 + (py - by) ** 2 <= clearRSq) {
            this._tempGrid[idx] = 0;
          }
        }
      }
    }

    // BFS with pooled visited
    this._visited.fill(0);
    let clusterCount = 0;

    for (let i = 0; i < this._tempGrid.length; i++) {
      if (this._tempGrid[i] === 1 && this._visited[i] === 0) {
        clusterCount++;
        if (clusterCount > 1) break; // Early exit — already an island

        const queue = [i];
        this._visited[i] = 1;
        while (queue.length > 0) {
          const idx = queue.pop()!;
          const cc = idx % cols;
          const cr = Math.floor(idx / cols);

          if (cr > 0 && this._tempGrid[idx - cols] === 1 && this._visited[idx - cols] === 0) {
            this._visited[idx - cols] = 1;
            queue.push(idx - cols);
          }
          if (cr < rows - 1 && this._tempGrid[idx + cols] === 1 && this._visited[idx + cols] === 0) {
            this._visited[idx + cols] = 1;
            queue.push(idx + cols);
          }
          if (cc > 0 && this._tempGrid[idx - 1] === 1 && this._visited[idx - 1] === 0) {
            this._visited[idx - 1] = 1;
            queue.push(idx - 1);
          }
          if (cc < cols - 1 && this._tempGrid[idx + 1] === 1 && this._visited[idx + 1] === 0) {
            this._visited[idx + 1] = 1;
            queue.push(idx + 1);
          }
        }
      }
    }

    return {
      wouldCreateIslands: clusterCount > 1,
      depth: maxDistInWindow - Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2),
    };
  }

  // ===========================================================================
  // Bite Planning
  // ===========================================================================

  planNextBite(): Bite | null {
    const analysis = this.analyzeGrid();
    if (!analysis || analysis.meatCount === 0) return null;

    const { clusters, tips, edges, tipSet } = analysis;
    const mainClusterIndices = new Set(clusters[clusters.length - 1]);

    const { cx, cy, maxR, randomBitePlacement } = this.config;
    const biteSizeScale = this.config.biteSizeScale ?? 1.0;
    const biteRoundness = this.config.biteRoundness ?? 0.8;
    const biteDepthVariance = this.config.biteDepthVariance ?? 0.2;
    const drillInBias = this.config.drillInBias ?? 0.2;

    type Candidate = {
      idx: number; x: number; y: number; angle: number;
      angleDiff: number; dist: number; isTip: boolean;
    };

    let candidates: Candidate[] = [];
    const allCandidates = [...edges, ...tips];
    const lastAngle = this.lastBiteAngle;

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
          idx, x: c.x, y: c.y, angle, angleDiff, dist,
          isTip: tipSet.has(idx), // O(1) lookup instead of O(n)
        });
      }
    }

    if (candidates.length === 0) return null;

    let activeCandidates: Candidate[] = [];
    let maxDistInWindow = 0;

    if (randomBitePlacement) {
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

    const baseR = 50 * (maxR / 240) * biteSizeScale;
    const maxBiteR = baseR * 1.1;
    const minBiteR = baseR * 0.7;

    const findOptimal = (bx: number, by: number) => {
      let bestR = minBiteR;
      let bestRes = { wouldCreateIslands: false, depth: 0 };
      const testSizes = [minBiteR, minBiteR + (maxBiteR - minBiteR) * 0.5, maxBiteR];

      for (const rSize of testSizes) {
        const simulated = this.simulateBitePooled(bx, by, rSize, maxDistInWindow);
        if (!simulated.wouldCreateIslands && rSize > bestR) {
          bestR = rSize;
          bestRes = simulated;
        }
      }

      if (bestR === minBiteR) {
        bestRes = this.simulateBitePooled(bx, by, minBiteR, maxDistInWindow);
      }
      return { rSize: bestR, ...bestRes };
    };

    // Color dominance scoring
    const getCdScore = (candX: number, candY: number, checkR: number) => {
      if (!this.config.colorDominance?.enabled || !this.colorGrid || !this.config.colorDominance.targetColor) return 0;
      const target = hexToRgb(this.config.colorDominance.targetColor);
      if (!target) return 0;

      const tolerance = this.config.colorDominance.tolerance ?? 0.2;
      const strength = this.config.colorDominance.strength ?? 0.5;
      const cols = this.gridCols;

      const startCol = Math.max(0, Math.floor((candX - checkR) / GRID_CELL_SIZE));
      const endCol = Math.min(cols - 1, Math.ceil((candX + checkR) / GRID_CELL_SIZE));
      const startRow = Math.max(0, Math.floor((candY - checkR) / GRID_CELL_SIZE));
      const endRow = Math.min(this.gridRows - 1, Math.ceil((candY + checkR) / GRID_CELL_SIZE));

      let matched = 0, total = 0;
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const idx = r * cols + c;
          if (this.grid && this.grid[idx] === 1) {
            const distSq = (c * GRID_CELL_SIZE + GRID_CELL_SIZE / 2 - candX) ** 2 +
                           (r * GRID_CELL_SIZE + GRID_CELL_SIZE / 2 - candY) ** 2;
            if (distSq <= checkR * checkR) {
              total++;
              const colorIdx = idx * 4;
              const cellColor = {
                r: this.colorGrid[colorIdx],
                g: this.colorGrid[colorIdx + 1],
                b: this.colorGrid[colorIdx + 2],
              };
              if (colorSimilarity(cellColor, target) >= 1 - tolerance) {
                matched++;
              }
            }
          }
        }
      }
      return total === 0 ? 0 : -(matched / total) * strength * 3000;
    };

    const depthCostMult = 5 * (1 - drillInBias);
    let bestCand = activeCandidates[0];
    let minScore = Infinity;
    let finalBiteR = baseR;

    for (const cand of activeCandidates) {
      const opt = findOptimal(cand.x, cand.y);
      const angleCost = randomBitePlacement ? 0 : cand.angleDiff * 250;
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
      const isValid = checkCol >= 0 && checkCol < this.gridCols && checkRow >= 0 && checkRow < this.gridRows;
      const emptyPenalty = (!isValid || (this.grid && this.grid[checkIdx] === 0)) ? 2500 : 0;

      let islandPenalty = 0;
      if (opt.wouldCreateIslands) {
        islandPenalty = 5000 + opt.depth * 100;
      }

      const ratio = opt.depth / opt.rSize;
      const deepBitePenalty = ratio > 0.5 ? (ratio - 0.5) * 2000 : 0;
      const biteSizeBonus = opt.rSize >= minBiteR * 0.9 ? 0 : -500;
      const cdScore = getCdScore(cand.x, cand.y, opt.rSize);
      const noise = randomBitePlacement ? Math.random() * 2000 : Math.random() * 200;

      const score = angleCost + depthCost + tipBonus + emptyPenalty + islandPenalty +
                    deepBitePenalty + biteSizeBonus + cdScore - noise;

      if (score < minScore) {
        minScore = score;
        bestCand = cand;
        finalBiteR = opt.rSize;
      }
    }

    const isTip = tipSet.has(bestCand.idx);
    const finalR = isTip ? Math.min(maxBiteR, finalBiteR * 1.1) : finalBiteR;
    const rotation = (Math.atan2(bestCand.y - cy, bestCand.x - cx) * 180 / Math.PI) - 90;

    this.lastBiteAngle = bestCand.angle;

    return {
      id: Date.now() + Math.random(),
      x: bestCand.x,
      y: bestCand.y,
      path: generateBitePath(finalR, biteRoundness, biteDepthVariance),
      rotation,
      scale: 1.0,
      radius: finalR,
    };
  }

  // ===========================================================================
  // Crumb Spawning
  // ===========================================================================

  spawnCrumbs(x: number, y: number, intensity: number): Crumb[] {
    const count = intensity > 1.2 ? 16 : 8;
    const speedBase = intensity > 1.2 ? 18 : 10;
    const biteSizeScale = this.config.biteSizeScale ?? 1.0;
    const newCrumbs: Crumb[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (speedBase * 0.5) + Math.random() * speedBase;
      const baseColor = this.crumbColors[Math.floor(Math.random() * this.crumbColors.length)];
      const shapes: ('triangle' | 'circle' | 'rect')[] = ['triangle', 'circle', 'rect'];
      const baseSize = (4 + Math.random() * 6) * (intensity > 1.2 ? 1.4 : 1);

      newCrumbs.push({
        id: Date.now() + i + Math.random(),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        size: baseSize * biteSizeScale,
        color: varyColor(baseColor),
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 60,
        life: 0.6 + Math.random() * 0.4,
      });
    }

    return newCrumbs;
  }

  private explodeRemaining(): Crumb[] {
    if (!this.grid) return [];
    let activeCount = 0;
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === 1) activeCount++;
    }
    const probability = activeCount < 100 ? 1.0 : 100 / activeCount;
    const biteSizeScale = this.config.biteSizeScale ?? 1.0;
    const newCrumbs: Crumb[] = [];

    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === 1 && Math.random() <= probability) {
        const { x, y } = this.getCellCoords(i);
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 15;
        const baseColor = this.crumbColors[Math.floor(Math.random() * this.crumbColors.length)];

        newCrumbs.push({
          id: Date.now() + Math.random() + i,
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 5,
          size: (4 + Math.random() * 6) * biteSizeScale,
          color: varyColor(baseColor),
          shape: Math.random() > 0.5 ? 'circle' : 'rect',
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 60,
          life: 0.8 + Math.random() * 0.5,
        });
      }
    }
    return newCrumbs;
  }

  private crumbleIndices(indices: number[]): Crumb[] {
    if (!this.grid) return [];
    const probability = indices.length > 50 ? 0.4 : 1.0;
    const { cx, cy } = this.config;
    const biteSizeScale = this.config.biteSizeScale ?? 1.0;
    const newCrumbs: Crumb[] = [];

    for (const idx of indices) {
      if (this.grid[idx] === 1) {
        this.grid[idx] = 0;
        if (Math.random() <= probability) {
          const { x, y } = this.getCellCoords(idx);
          const dx = x - cx;
          const dy = y - cy;
          const angle = Math.atan2(dy, dx) + (Math.random() - 0.5);
          const speed = 5 + Math.random() * 15;
          const baseColor = this.crumbColors[Math.floor(Math.random() * this.crumbColors.length)];

          newCrumbs.push({
            id: Date.now() + Math.random() + idx,
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: (4 + Math.random() * 7) * biteSizeScale,
            color: varyColor(baseColor),
            shape: Math.random() > 0.5 ? 'triangle' : 'rect',
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 80,
            life: 0.9 + Math.random() * 0.4,
          });
        }
      }
    }
    return newCrumbs;
  }

  // ===========================================================================
  // Trigger Bite (main entry point for eating)
  // ===========================================================================

  /**
   * Take a bite. Returns the bite and crumbs generated, or null if finished/idle.
   * The caller is responsible for applying DOM updates.
   */
  triggerBite(manualPoint?: { x: number; y: number }): {
    bite: Bite;
    crumbs: Crumb[];
    nextBite: Bite | null;
    structure: { islands: Point[]; perimeter: Point[]; tips: Point[] };
    finished: boolean;
  } | null {
    if (this._isFinished || !this.grid) return null;

    if (manualPoint) {
      this.lastInteractTime = Date.now();
    } else if (Date.now() - this.lastInteractTime < IDLE_THRESHOLD) {
      return null; // Pause auto-eating during interaction
    }

    let plan = manualPoint ? null : this._nextBite;
    if (!plan && !manualPoint) plan = this.planNextBite();

    if (!plan && !manualPoint) {
      // Check if finished
      const analysis = this.analyzeGrid();
      const mainBodySize = analysis?.clusters[analysis.clusters.length - 1]?.length || 0;
      let realCount = 0;
      for (let i = 0; i < this.grid.length; i++) {
        if (this.grid[i] === 1) realCount++;
      }

      if (mainBodySize < 15 || realCount < 15) {
        const explosionCrumbs = this.explodeRemaining();
        this._isFinished = true;

        const biteRoundness = this.config.biteRoundness ?? 0.8;
        const finishBite: Bite = {
          id: Date.now() + 1,
          x: this.config.cx,
          y: this.config.cy,
          path: generateBitePath(this.config.maxR * 1.5, biteRoundness, 0),
          rotation: 0,
          scale: 1,
          radius: this.config.maxR * 1.5,
        };

        this.callbacks.onFinished?.();
        return {
          bite: finishBite,
          crumbs: explosionCrumbs,
          nextBite: null,
          structure: { islands: [], perimeter: [], tips: [] },
          finished: true,
        };
      }
      return null;
    }

    // Calculate bite params
    let tx = 0, ty = 0, bitePath = '', rotation = 0, biteRadius = 0;
    const { cx, cy, maxR } = this.config;
    const biteSizeScale = this.config.biteSizeScale ?? 1.0;
    const biteRoundness = this.config.biteRoundness ?? 0.8;
    const biteDepthVariance = this.config.biteDepthVariance ?? 0.2;

    if (manualPoint) {
      tx = manualPoint.x;
      ty = manualPoint.y;

      const sizeScale = (maxR / 240) * biteSizeScale;
      const baseR = 50 * sizeScale;
      const maxBiteR = baseR * 1.1;
      const minBiteR = baseR * 0.7;

      let optimalBiteR = baseR;
      const testSizes = [minBiteR, baseR * 0.85, baseR, maxBiteR];

      for (const testR of testSizes) {
        const result = this.simulateBitePooled(tx, ty, testR, maxR);
        if (!result.wouldCreateIslands && testR > optimalBiteR) {
          optimalBiteR = testR;
        }
      }

      const angleToCenter = Math.atan2(ty - cy, tx - cx);
      rotation = (angleToCenter * 180 / Math.PI) - 90;
      bitePath = generateBitePath(optimalBiteR, biteRoundness, biteDepthVariance);
      biteRadius = optimalBiteR;
      this.lastBiteAngle = angleToCenter;
    } else if (plan) {
      tx = plan.x;
      ty = plan.y;
      bitePath = plan.path;
      rotation = plan.rotation;
      biteRadius = plan.radius ?? (50 * (maxR / 240) * biteSizeScale);
    }

    // Remove meat from grid
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

    // Structural integrity check — crumble islands
    let allCrumbs: Crumb[] = [];
    const analysis = this.analyzeGrid();
    if (analysis && analysis.clusters.length > 1) {
      for (let i = 0; i < analysis.clusters.length - 1; i++) {
        allCrumbs = allCrumbs.concat(this.crumbleIndices(analysis.clusters[i]));
      }
    }

    const newBite: Bite = {
      id: Date.now() + Math.random(),
      x: tx, y: ty,
      path: bitePath,
      rotation,
      scale: 1.0,
      radius: biteRadius,
    };

    // Spawn crumbs from the bite itself
    const biteCrumbs = this.spawnCrumbs(tx, ty, removed > 20 ? 1.5 : 1.0);
    allCrumbs = allCrumbs.concat(biteCrumbs);

    // Replan
    this._nextBite = this.planNextBite();
    const structure = this.calculateStructure();

    return {
      bite: newBite,
      crumbs: allCrumbs,
      nextBite: this._nextBite,
      structure,
      finished: false,
    };
  }

  // ===========================================================================
  // Reset
  // ===========================================================================

  reset() {
    if (this.initialGrid && this.grid) {
      this.grid.set(this.initialGrid);
    }
    this.lastInteractTime = 0;
    this.lastBiteAngle = this.getStartAngle();
    this._isFinished = false;
    this._isResetting = false;

    this.replan();
  }

  setResetting(value: boolean) {
    this._isResetting = value;
  }

  // ===========================================================================
  // Config Update
  // ===========================================================================

  updateConfig(newConfig: Partial<YumConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.replan();
  }

  updateCrumbColors(colors: string[]) {
    this.crumbColors = colors;
  }

  getConfig(): YumConfig {
    return this.config;
  }

  // ===========================================================================
  // Internal
  // ===========================================================================

  private replan() {
    this._nextBite = this.planNextBite();
  }

  /**
   * Get the remaining pixel count (for progress calculations).
   */
  getRemainingCount(): number {
    if (!this.grid) return 0;
    let count = 0;
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === 1) count++;
    }
    return count;
  }

  getTotalCount(): number {
    if (!this.initialGrid) return 0;
    let count = 0;
    for (let i = 0; i < this.initialGrid.length; i++) {
      if (this.initialGrid[i] === 1) count++;
    }
    return count;
  }
}
