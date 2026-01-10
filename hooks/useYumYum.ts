import { useState, useRef, useCallback, useEffect } from 'react';
import { Bite, Crumb, YumConfig, Point } from '../types';
import { isDataURI } from '../utils/image';

// --- Constants ---
const GRID_CELL_SIZE = 10; // Resolution for structural analysis
const IDLE_THRESHOLD = 2000; // ms to wait before resuming auto-eat

// --- Geometry Helpers ---

export const generateBitePath = (radius: number, roundness: number = 0.8, depthVariance: number = 0.1): string => {
  // Number of vertices for the bite shape
  const points = 24; 
  const vertices: {x: number, y: number}[] = [];
  
  // Depth Variance Calculation
  const depthScale = 1.0 + (Math.random() - 0.5) * depthVariance * 1.5;

  const hBase = radius * depthScale;
  const wBase = radius * 1.25; 

  // Generate noisy vertices
  for (let i = 0; i < points; i++) {
    const t = i / points;
    const angle = t * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // Normalized Y for taper (-1 to 1) - creates the 'bite' oval shape
    const normalizedY = -cos;
    const taper = 1.0 + 0.3 * normalizedY; 

    // Noise Calculation (Jaggedness)
    const noiseMagnitude = (1 - roundness) * 0.5; // Up to 50% variance
    const randomScale = 1 + (Math.random() - 0.5) * noiseMagnitude;

    const rX = wBase * taper * randomScale;
    const rY = hBase * randomScale;

    vertices.push({
        x: sin * rX,
        y: -cos * rY
    });
  }
  
  // Construct Path string
  let d = "";
  if (roundness > 0.4) {
      // Smooth Curve Generator (Midpoint Strategy)
      const p0 = vertices[0];
      const pLast = vertices[vertices.length-1];
      const startX = (pLast.x + p0.x)/2;
      const startY = (pLast.y + p0.y)/2;
      
      d += `M ${startX.toFixed(2)} ${startY.toFixed(2)}`;
      
      for(let i=0; i<points; i++) {
          const curr = vertices[i];
          const next = vertices[(i+1)%points];
          // Control point is `curr`, End point is midpoint between `curr` and `next`
          const midX = (curr.x + next.x)/2;
          const midY = (curr.y + next.y)/2;
          
          d += ` Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
      }
  } else {
      // Linear Polygon Generator
      d += `M ${vertices[0].x.toFixed(2)} ${vertices[0].y.toFixed(2)}`;
      for(let i=1; i<points; i++) {
          d += ` L ${vertices[i].x.toFixed(2)} ${vertices[i].y.toFixed(2)}`;
      }
  }
  
  d += " Z";
  return d;
};

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

// Helper to convert hex to RGB
const hexToRgb = (hex: string): { r: number, g: number, b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

// Helper to calculate color similarity (0-1, where 1 is identical)
const colorSimilarity = (color1: { r: number, g: number, b: number }, color2: { r: number, g: number, b: number }): number => {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    // Normalize to 0-1 (max distance is sqrt(3 * 255^2) ≈ 441)
    return Math.max(0, 1 - (distance / 441));
};

// --- Hook ---

export const useYumYum = (config: YumConfig, pathData: string, viewBoxStr: string, crumbColors: string[], baseColor?: string, imageSrc?: string) => {
  const [bites, setBites] = useState<Bite[]>([]);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [nextBite, setNextBite] = useState<Bite | null>(null);
  
  // Structural Analysis State
  const [structure, setStructure] = useState<{ islands: Point[], perimeter: Point[], tips: Point[] }>({ islands: [], perimeter: [], tips: [] });
  
  // Color Dominance State
  const [colorDominanceData, setColorDominanceData] = useState<{ 
    dominantColors: Array<{ color: string, percentage: number }>, 
    regions: Array<{ color: string, points: Point[] }>
  } | null>(null);

  const [isResetting, setIsResetting] = useState(false);
  const [scale, setScale] = useState(1);
  const [isFinished, setIsFinished] = useState(false);

  const { 
      biteSizeScale = 1, 
      interval = 200, 
      autoEat = true,
      resetDuration = 800,
      drillInBias = 0.2,
      biteRoundness = 0.9,
      startPointRandomness = 0.0,
      biteDepthVariance = 0.2,
      randomBitePlacement = false,
      cx,
      cy,
      maxR,
      showStructurePreview = false,
      colorDominance
  } = config;
  
  // Extract colorDominance values for stable dependencies
  const colorDominanceEnabled = colorDominance?.enabled ?? false;
  const colorDominanceTargetColor = colorDominance?.targetColor;
  const colorDominanceTolerance = colorDominance?.tolerance ?? 0.2;
  const colorDominanceStrength = colorDominance?.strength ?? 0.5;

  // --- Grid State ---
  const initialGridRef = useRef<Uint8Array | null>(null);
  const gridRef = useRef<Uint8Array | null>(null);
  const gridDimsRef = useRef({ cols: 0, rows: 0, width: 0, height: 0 });
  const sortedPixelsRef = useRef<{x: number, y: number, d: number}[]>([]); // Cache for start point selection
  const colorGridRef = useRef<Uint8ClampedArray | null>(null); // RGBA color data for each cell
  
  const lastBitePosRef = useRef<{x: number, y: number} | null>(null);
  const lastBiteAngleRef = useRef<number>(-Math.PI / 2); // Current cursor angle
  
  const nextBiteRef = useRef<Bite | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const scaleTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const isFinishedRef = useRef(false);
  const lastInteractTimeRef = useRef<number>(0);
  const planNextBiteRef = useRef<typeof planNextBite | null>(null);
  const calculateStructureRef = useRef<typeof calculateStructure | null>(null);

  useEffect(() => { isFinishedRef.current = isFinished; }, [isFinished]);

  // --- Analysis ---
  
  const getCellCoords = (idx: number, cols: number) => {
      return { 
          x: (idx % cols) * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
          y: Math.floor(idx / cols) * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
      };
  };

  const analyzeGrid = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return null;
    const { cols, rows } = gridDimsRef.current;

    const visited = new Uint8Array(grid.length); 
    const clusters: number[][] = []; 
    const tips: number[] = [];
    const edges: number[] = [];

    // Find Connected Components
    for (let i = 0; i < grid.length; i++) {
        if (grid[i] === 1 && visited[i] === 0) {
            const cluster: number[] = [];
            const queue = [i];
            visited[i] = 1;
            
            while(queue.length > 0) {
                const idx = queue.pop()!;
                cluster.push(idx);

                const cx = idx % cols;
                const cy = Math.floor(idx / cols);

                // Analyze neighbors for edges/tips
                let emptyNeighbors = 0;
                
                // Directions: Up, Down, Left, Right
                const nIndices = [idx - cols, idx + cols, idx - 1, idx + 1];
                // Boundary checks
                const validN = [];

                if (cy > 0) validN.push(idx - cols); else emptyNeighbors++;
                if (cy < rows - 1) validN.push(idx + cols); else emptyNeighbors++;
                if (cx > 0) validN.push(idx - 1); else emptyNeighbors++;
                if (cx < cols - 1) validN.push(idx + 1); else emptyNeighbors++;

                for(const nIdx of validN) {
                    if (grid[nIdx] === 0) {
                        emptyNeighbors++;
                    } else if (visited[nIdx] === 0) {
                        visited[nIdx] = 1;
                        queue.push(nIdx);
                    }
                }

                if (emptyNeighbors >= 3) {
                    tips.push(idx); // It's a peninsula tip or singleton
                } else if (emptyNeighbors >= 1) {
                    edges.push(idx); // It's an edge
                }
            }
            clusters.push(cluster);
        }
    }

    if (clusters.length === 0) return { meatCount: 0, clusters: [], tips: [], edges: [] };
    
    // Sort clusters by size (smallest is island)
    clusters.sort((a, b) => a.length - b.length);

    return {
        meatCount: clusters.reduce((acc, c) => acc + c.length, 0),
        clusters,
        tips,
        edges
    };
  }, []);

  const calculateStructure = useCallback(() => {
    if (!showStructurePreview) return { islands: [], perimeter: [], tips: [] };

    const analysis = analyzeGrid();
    if (!analysis || analysis.clusters.length === 0) return { islands: [], perimeter: [], tips: [] };

    const { clusters, tips, edges } = analysis;
    const { cols } = gridDimsRef.current;

    // Islands are all clusters except the largest one
    const islandsIndices = clusters.length > 1 ? clusters.slice(0, clusters.length - 1).flat() : [];
    
    const islandPoints = islandsIndices.map(idx => getCellCoords(idx, cols));
    const tipPoints = tips.map(idx => getCellCoords(idx, cols));
    const edgePoints = edges.map(idx => getCellCoords(idx, cols));

    return { islands: islandPoints, perimeter: edgePoints, tips: tipPoints };
  }, [analyzeGrid, showStructurePreview]);

  // --- Explode Leftovers ---
  const explodeRemaining = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const { cols } = gridDimsRef.current;
    const newCrumbs: Crumb[] = [];
    
    // Calculate total active pixels first to adjust density
    let activeCount = 0;
    for(let i = 0; i < grid.length; i++) {
        if (grid[i] === 1) activeCount++;
    }

    // If we have a lot of leftovers, sample down. If very few, take all.
    // This ensures that small remaining slivers pop completely into crumbs.
    const probability = activeCount < 100 ? 1.0 : (100 / activeCount);

    for (let i = 0; i < grid.length; i++) {
        if (grid[i] === 1) {
             if (Math.random() <= probability) {
                const { x, y } = getCellCoords(i, cols);
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 15; // Higher speed variance
                const baseColor = crumbColors[Math.floor(Math.random() * crumbColors.length)];

                newCrumbs.push({
                    id: Date.now() + Math.random() + i,
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 5,
                    size: (4 + Math.random() * 6) * (biteSizeScale || 1),
                    color: varyColor(baseColor),
                    shape: Math.random() > 0.5 ? 'circle' : 'rect',
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 60,
                    life: 0.8 + Math.random() * 0.5
                });
             }
        }
    }
    if (newCrumbs.length > 0) setCrumbs(prev => [...prev, ...newCrumbs]);
  }, [crumbColors, biteSizeScale]);

  // --- Helper: Crumble a specific list of indices (Structure Collapse) ---
  const crumbleIndices = useCallback((indices: number[]) => {
      const { cols } = gridDimsRef.current;
      const newCrumbs: Crumb[] = [];
      const grid = gridRef.current;
      
      // We want these to pop dramatically.
      // We use a probability to avoid lagging if a huge chunk breaks off,
      // but higher probability than normal eating.
      const probability = indices.length > 50 ? 0.4 : 1.0;

      for (const idx of indices) {
          if (grid && grid[idx] === 1) {
              grid[idx] = 0; // Destroy grid data immediately
              
              if (Math.random() <= probability) {
                const { x, y } = getCellCoords(idx, cols);
                // Velocity based on distance from center for "explosive" feel
                const dx = x - cx;
                const dy = y - cy;
                const angle = Math.atan2(dy, dx);
                
                // Add some random spread
                const spreadAngle = angle + (Math.random() - 0.5);
                const speed = 5 + Math.random() * 15;

                const baseColor = crumbColors[Math.floor(Math.random() * crumbColors.length)];

                newCrumbs.push({
                    id: Date.now() + Math.random() + idx,
                    x, y,
                    vx: Math.cos(spreadAngle) * speed,
                    vy: Math.sin(spreadAngle) * speed, // Initial upward pop logic handled by caller usually, but here we explode outward
                    size: (4 + Math.random() * 7) * (biteSizeScale || 1),
                    color: varyColor(baseColor),
                    shape: Math.random() > 0.5 ? 'triangle' : 'rect',
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 80,
                    life: 0.9 + Math.random() * 0.4
                });
              }
          }
      }
      if (newCrumbs.length > 0) setCrumbs(prev => [...prev, ...newCrumbs]);
  }, [cx, cy, crumbColors, biteSizeScale]);


  // --- Planner ---
  const planNextBite = useCallback((): Bite | null => {
      const analysis = analyzeGrid();
      if (!analysis || analysis.meatCount === 0) return null;

      const { clusters, tips, edges } = analysis;
      const { cols } = gridDimsRef.current;
      // Use extracted values

      // STRATEGY: ALWAYS TARGET THE LARGEST CONNECTED MASS
      // This ignores disconnected 'islands' or debris.
      const mainClusterIndices = new Set(clusters[clusters.length - 1]);
      
      let candidates: { idx: number, x: number, y: number, angle: number, angleDiff: number, dist: number, isTip: boolean }[] = [];
      
      const allCandidates = [...edges, ...tips];
      const lastAngle = lastBiteAngleRef.current;
      
      // Collect candidates ONLY from the main cluster
      for (const idx of allCandidates) {
          if (mainClusterIndices.has(idx)) {
              const c = getCellCoords(idx, cols);
              const dx = c.x - cx;
              const dy = c.y - cy;
              const angle = Math.atan2(dy, dx); 
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              // Calculate angular distance in CW direction
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

      if (randomBitePlacement) {
          // Random placement: consider all candidates
          activeCandidates = candidates;
          for(const c of candidates) if (c.dist > maxDistInWindow) maxDistInWindow = c.dist;
      } else {
          // WINDOWING: Only look at candidates in the next ~120 degrees to maintain forward momentum
          const windowSize = Math.PI * 0.66; 
          
          for(const c of candidates) {
              if (c.angleDiff < windowSize) activeCandidates.push(c);
          }
          
          // Fallback if we are near end or in a weird geometry
          if (activeCandidates.length < 5) activeCandidates = candidates;

          // SURFACE DETECTION: Find the "Outer Surface" in this window.
          for(const c of activeCandidates) if (c.dist > maxDistInWindow) maxDistInWindow = c.dist;
      }

      // Base bite size calculation
      const sizeScale = (maxR / 240) * biteSizeScale; 
      const baseR = 50 * sizeScale;
      const maxBiteR = baseR * 1.1; // Maximum bite radius
      const minBiteR = baseR * 0.7; // Minimum bite radius

      // Helper to calculate available area at a point (how much "meat" is available)
      const calculateAvailableArea = (biteX: number, biteY: number, testR: number): number => {
          if (!gridRef.current) return 0;
          
          const testRSq = testR * testR;
          const startCol = Math.max(0, Math.floor((biteX - testR) / GRID_CELL_SIZE));
          const endCol = Math.min(cols - 1, Math.ceil((biteX + testR) / GRID_CELL_SIZE));
          const startRow = Math.max(0, Math.floor((biteY - testR) / GRID_CELL_SIZE));
          const endRow = Math.min(gridDimsRef.current.rows - 1, Math.ceil((biteY + testR) / GRID_CELL_SIZE));
          
          let count = 0;
          for(let r = startRow; r <= endRow; r++) {
              for(let c = startCol; c <= endCol; c++) {
                  const idx = r * cols + c;
                  if (gridRef.current[idx] === 1) {
                      const px = c * GRID_CELL_SIZE + GRID_CELL_SIZE/2;
                      const py = r * GRID_CELL_SIZE + GRID_CELL_SIZE/2;
                      if ((px - biteX)**2 + (py - biteY)**2 <= testRSq) {
                          count++;
                      }
                  }
              }
          }
          return count;
      };

      // Helper to find optimal bite size for a point (largest size that won't create islands)
      const findOptimalBiteSize = (biteX: number, biteY: number): { biteR: number, wouldCreateIslands: boolean, depth: number } => {
          // Binary search for the largest bite size that won't create islands
          let low = minBiteR;
          let high = maxBiteR;
          let bestR = low;
          let bestResult = { wouldCreateIslands: false, depth: 0 };
          
          // Test a few sizes to find the optimal one
          const testSizes = [
              minBiteR,
              minBiteR + (maxBiteR - minBiteR) * 0.3,
              minBiteR + (maxBiteR - minBiteR) * 0.6,
              maxBiteR
          ];
          
          for (const testR of testSizes) {
              const result = simulateBite(biteX, biteY, testR);
              if (!result.wouldCreateIslands && testR > bestR) {
                  bestR = testR;
                  bestResult = result;
              }
          }
          
          // If all sizes create islands, use the smallest and accept it
          if (bestR === low && bestResult.wouldCreateIslands) {
              bestR = minBiteR;
              bestResult = simulateBite(biteX, biteY, minBiteR);
          }
          
          return { biteR: bestR, ...bestResult };
      };

      // Helper to simulate bite and check for island creation
      const simulateBite = (biteX: number, biteY: number, biteR: number): { wouldCreateIslands: boolean, depth: number } => {
          if (!gridRef.current) return { wouldCreateIslands: false, depth: 0 };
          
          const clearR = biteR * 1.2; // Clear radius (slightly larger than bite)
          const clearRSq = clearR * clearR;
          
          // Create a temporary copy of the grid
          const tempGrid = new Uint8Array(gridRef.current);
          
          // Simulate removing cells in bite radius
          const startCol = Math.max(0, Math.floor((biteX - clearR) / GRID_CELL_SIZE));
          const endCol = Math.min(cols - 1, Math.ceil((biteX + clearR) / GRID_CELL_SIZE));
          const startRow = Math.max(0, Math.floor((biteY - clearR) / GRID_CELL_SIZE));
          const endRow = Math.min(gridDimsRef.current.rows - 1, Math.ceil((biteY + clearR) / GRID_CELL_SIZE));
          
          for(let r = startRow; r <= endRow; r++) {
              for(let c = startCol; c <= endCol; c++) {
                  const idx = r * cols + c;
                  if (tempGrid[idx] === 1) {
                      const px = c * GRID_CELL_SIZE + GRID_CELL_SIZE/2;
                      const py = r * GRID_CELL_SIZE + GRID_CELL_SIZE/2;
                      if ((px - biteX)**2 + (py - biteY)**2 <= clearRSq) {
                          tempGrid[idx] = 0;
                      }
                  }
              }
          }
          
          // Analyze the simulated grid for islands
          const visited = new Uint8Array(tempGrid.length);
          const clusters: number[][] = [];
          
          for (let i = 0; i < tempGrid.length; i++) {
              if (tempGrid[i] === 1 && visited[i] === 0) {
                  const cluster: number[] = [];
                  const queue = [i];
                  visited[i] = 1;
                  
                  while(queue.length > 0) {
                      const idx = queue.pop()!;
                      cluster.push(idx);
                      
                      const cx = idx % cols;
                      const cy = Math.floor(idx / cols);
                      
                      if (cy > 0 && tempGrid[idx - cols] === 1 && visited[idx - cols] === 0) {
                          visited[idx - cols] = 1;
                          queue.push(idx - cols);
                      }
                      if (cy < gridDimsRef.current.rows - 1 && tempGrid[idx + cols] === 1 && visited[idx + cols] === 0) {
                          visited[idx + cols] = 1;
                          queue.push(idx + cols);
                      }
                      if (cx > 0 && tempGrid[idx - 1] === 1 && visited[idx - 1] === 0) {
                          visited[idx - 1] = 1;
                          queue.push(idx - 1);
                      }
                      if (cx < cols - 1 && tempGrid[idx + 1] === 1 && visited[idx + 1] === 0) {
                          visited[idx + 1] = 1;
                          queue.push(idx + 1);
                      }
                  }
                  clusters.push(cluster);
              }
          }
          
          // Calculate depth - how far inward the bite center is from the surface
          const depth = maxDistInWindow - Math.sqrt((biteX - cx)**2 + (biteY - cy)**2);
          
          // Would create islands if we have more than one cluster after the bite
          const wouldCreateIslands = clusters.length > 1;
          
          return { wouldCreateIslands, depth };
      };

      // Helper to calculate color dominance score for a candidate
      const getColorDominanceScore = (candX: number, candY: number, biteR: number): number => {
          if (!colorDominanceEnabled || !colorGridRef.current || !colorDominanceTargetColor) return 0;
          
          const targetColor = hexToRgb(colorDominanceTargetColor);
          if (!targetColor) return 0;
          
          const tolerance = colorDominanceTolerance;
          const strength = colorDominanceStrength;
          
          // Sample colors in a radius around the candidate
          const sampleRadius = biteR;
          const sampleRadiusSq = sampleRadius * sampleRadius;
          const startCol = Math.max(0, Math.floor((candX - sampleRadius) / GRID_CELL_SIZE));
          const endCol = Math.min(cols - 1, Math.ceil((candX + sampleRadius) / GRID_CELL_SIZE));
          const startRow = Math.max(0, Math.floor((candY - sampleRadius) / GRID_CELL_SIZE));
          const endRow = Math.min(gridDimsRef.current.rows - 1, Math.ceil((candY + sampleRadius) / GRID_CELL_SIZE));
          
          let matchingPixels = 0;
          let totalPixels = 0;
          
          for(let r = startRow; r <= endRow; r++) {
              for(let c = startCol; c <= endCol; c++) {
                  const idx = r * cols + c;
                  if (gridRef.current && gridRef.current[idx] === 1) {
                      const coords = getCellCoords(idx, cols);
                      const distSq = (coords.x - candX)**2 + (coords.y - candY)**2;
                      
                      if (distSq <= sampleRadiusSq) {
                          totalPixels++;
                          const colorIdx = idx * 4;
                          const cellColor = {
                              r: colorGridRef.current[colorIdx],
                              g: colorGridRef.current[colorIdx + 1],
                              b: colorGridRef.current[colorIdx + 2]
                          };
                          
                          const similarity = colorSimilarity(cellColor, targetColor);
                          if (similarity >= (1 - tolerance)) {
                              matchingPixels++;
                          }
                      }
                  }
              }
          }
          
          if (totalPixels === 0) return 0;
          
          const dominanceRatio = matchingPixels / totalPixels;
          // Return negative score (lower is better) - strong preference for dominant color areas
          return -dominanceRatio * strength * 3000;
      };

      // Enhanced candidates with optimal bite sizes
      type EnhancedCandidate = typeof activeCandidates[0] & { optimalBiteR: number; biteResult: { wouldCreateIslands: boolean, depth: number } };
      const enhancedCandidates: EnhancedCandidate[] = [];

      // Calculate optimal bite size for each candidate BEFORE scoring
      for (const cand of activeCandidates) {
          const optimal = findOptimalBiteSize(cand.x, cand.y);
          enhancedCandidates.push({
              ...cand,
              optimalBiteR: optimal.biteR,
              biteResult: { wouldCreateIslands: optimal.wouldCreateIslands, depth: optimal.depth }
          });
      }

      let bestCand: EnhancedCandidate = enhancedCandidates[0];
      let minScore = Infinity;

      // DEPTH WEIGHT Calculation
      const depthCostMultiplier = 5 * (1 - (drillInBias ?? 0.2));

      for (const cand of enhancedCandidates) {
          // SCORING
          // 1. Angular Cost: Moving the clock hand (skip for random placement)
          const angleCost = randomBitePlacement ? 0 : cand.angleDiff * 250; 

          // 2. Depth Cost (Anti-Drill): 
          const depth = maxDistInWindow - cand.dist;
          const depthCost = depth * depthCostMultiplier; 

          // 3. Tip Bonus:
          const tipBonus = cand.isTip ? -100 : 0;

          // 4. "Meat" Density Check (Inward Look)
          const vx = cx - cand.x;
          const vy = cy - cand.y;
          const len = Math.sqrt(vx*vx + vy*vy) || 1;
          const checkDist = 15;
          const checkX = cand.x + (vx / len) * checkDist;
          const checkY = cand.y + (vy / len) * checkDist;
          
          const checkCol = Math.floor(checkX / GRID_CELL_SIZE);
          const checkRow = Math.floor(checkY / GRID_CELL_SIZE);
          const checkIdx = checkRow * cols + checkCol;
          
          let emptyBitePenalty = 0;
          const isValid = checkCol >= 0 && checkCol < cols && checkRow >= 0 && checkRow < gridDimsRef.current.rows;
          
          if (!isValid || (gridRef.current && gridRef.current[checkIdx] === 0)) {
              emptyBitePenalty = 2500;
          }
          
          // 5. ISLAND PENALTY: Use the pre-calculated result from optimal bite size
          let islandPenalty = 0;
          if (cand.biteResult.wouldCreateIslands) {
              // Heavy penalty for bites that would create islands
              islandPenalty = 5000 + (cand.biteResult.depth * 100);
          }
          
          // 6. Depth-based penalty for going too deep
          // Calculate how deep the bite center would be relative to the bite radius
          const biteDepthRatio = cand.biteResult.depth / cand.optimalBiteR;
          let deepBitePenalty = 0;
          if (biteDepthRatio > 0.5) {
              // Bite center is more than 50% of bite radius inward from surface
              deepBitePenalty = (biteDepthRatio - 0.5) * 2000;
          }
          
          // 7. Bite size bonus: Prefer candidates where we can take appropriately sized bites
          // This helps avoid skipping areas that need smaller bites
          const biteSizeBonus = cand.optimalBiteR >= minBiteR * 0.9 ? 0 : -500;
          
          // 8. Color Dominance: Prefer areas with the target color
          const colorDominanceScore = getColorDominanceScore(cand.x, cand.y, cand.optimalBiteR);
          
          // 9. Chaos/Randomness: More randomness when random placement is enabled
          const noise = randomBitePlacement ? Math.random() * 2000 : Math.random() * 200; 

          const totalScore = angleCost + depthCost + tipBonus + emptyBitePenalty + islandPenalty + deepBitePenalty + biteSizeBonus + colorDominanceScore - noise;

          if (totalScore < minScore) {
              minScore = totalScore;
              bestCand = cand;
          }
      }

      const targetX = bestCand.x;
      const targetY = bestCand.y;
      
      lastBiteAngleRef.current = bestCand.angle;

      // Use the optimal bite radius calculated for this candidate
      let biteR = bestCand.optimalBiteR;
      
      // Slight adjustment for tips (but don't exceed max)
      const isTip = tips.includes((targetX / GRID_CELL_SIZE) + (targetY / GRID_CELL_SIZE) * cols);
      if (isTip) {
          biteR = Math.min(maxBiteR, biteR * 1.1);
      }

      const angleToCenter = Math.atan2(targetY - cy, targetX - cx);
      const rotation = (angleToCenter * 180 / Math.PI) - 90;

      return {
          id: Date.now() + Math.random(), 
          x: targetX,
          y: targetY,
          path: generateBitePath(biteR, biteRoundness, biteDepthVariance),
          rotation,
          scale: 1.0,
          radius: biteR // Store the bite radius for accurate grid removal
      };

  }, [analyzeGrid, cx, cy, maxR, biteSizeScale, drillInBias, biteRoundness, biteDepthVariance, randomBitePlacement, colorDominanceEnabled, colorDominanceTargetColor, colorDominanceTolerance, colorDominanceStrength, gridRef]);

  // Keep refs updated with latest callbacks (update immediately, not in effect)
  planNextBiteRef.current = planNextBite;
  calculateStructureRef.current = calculateStructure;

  // --- Spawn Crumbs ---
  const spawnCrumbs = useCallback((x: number, y: number, intensity: number) => {
    const newCrumbs: Crumb[] = [];
    const count = intensity > 1.2 ? 16 : 8;
    const speedBase = intensity > 1.2 ? 18 : 10;
    const scaleFactor = biteSizeScale || 1;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (speedBase * 0.5) + Math.random() * speedBase;
      const baseColor = crumbColors[Math.floor(Math.random() * crumbColors.length)];
      const shapes: ('triangle' | 'circle' | 'rect')[] = ['triangle', 'circle', 'rect'];
      const baseSize = (4 + Math.random() * 6) * (intensity > 1.2 ? 1.4 : 1);

      newCrumbs.push({
        id: Date.now() + i + Math.random(),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        size: baseSize * scaleFactor,
        color: varyColor(baseColor), 
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 60,
        life: 0.6 + Math.random() * 0.4
      });
    }
    setCrumbs(prev => [...prev, ...newCrumbs]);
  }, [crumbColors, biteSizeScale]);


  // --- Helper to pick Start Angle based on randomness ---
  const getStartAngle = useCallback(() => {
     const sortedPixels = sortedPixelsRef.current;
     if (sortedPixels.length === 0) return -Math.PI / 2;
     
     // 0 = Pick index 0 (Furthest)
     // 1 = Pick index ~50% (Mid-Outer)
     // We limit randomness to top 50% to ensure we don't start in the dead center
     const limit = Math.max(1, Math.floor(sortedPixels.length * 0.5 * (startPointRandomness || 0)));
     const index = Math.floor(Math.random() * limit);
     
     const p = sortedPixels[index];
     return Math.atan2(p.y - cy, p.x - cx);
  }, [cx, cy, startPointRandomness]);


  // --- Init ---
  useEffect(() => {
    if (!pathData || !viewBoxStr) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const vb = viewBoxStr.split(' ').map(Number);
    const w = vb[2] || 480;
    const h = vb[3] || 480;
    if (w === 0 || h === 0) return;

    canvas.width = w;
    canvas.height = h;

    // Render path for grid initialization
    // Note: For SVG paths with decorations, we only render the base path here
    // Decorations would need to be rendered separately for full color detection
    ctx.fillStyle = baseColor || '#000000';
    ctx.beginPath();
    const path2d = new Path2D(pathData);
    ctx.fill(path2d);

    // Sample color data - will be used for color detection if enabled
    const colorData = ctx.getImageData(0, 0, w, h);

    const cols = Math.ceil(w / GRID_CELL_SIZE);
    const rows = Math.ceil(h / GRID_CELL_SIZE);
    const len = cols * rows;
    
    const masterGrid = new Uint8Array(len);
    const colorGrid = new Uint8ClampedArray(len * 4); // Always store RGBA for automatic detection
    const pixels: {x: number, y: number, d: number}[] = [];
    
    // Use extracted cx, cy values

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
         const coords = getCellCoords(r * cols + c, cols);
         if (ctx.isPointInPath(path2d, coords.x, coords.y)) {
             masterGrid[r * cols + c] = 1;
             
             // Always sample color at this cell center for automatic detection
             const pixelX = Math.floor(coords.x);
             const pixelY = Math.floor(coords.y);
             const pixelIdx = (pixelY * w + pixelX) * 4;
             const cellIdx = (r * cols + c) * 4;
             
             if (pixelIdx >= 0 && pixelIdx < colorData.data.length) {
                 colorGrid[cellIdx] = colorData.data[pixelIdx];     // R
                 colorGrid[cellIdx + 1] = colorData.data[pixelIdx + 1]; // G
                 colorGrid[cellIdx + 2] = colorData.data[pixelIdx + 2]; // B
                 colorGrid[cellIdx + 3] = colorData.data[pixelIdx + 3]; // A
             }

             // Collect pixels for start point calculation
             const d = (coords.x - cx)**2 + (coords.y - cy)**2;
             pixels.push({ x: coords.x, y: coords.y, d });
         }
      }
    }
    
    // Sort descending by distance (furthest first)
    pixels.sort((a, b) => b.d - a.d);
    sortedPixelsRef.current = pixels;

    initialGridRef.current = masterGrid;
    const activeGrid = new Uint8Array(len);
    activeGrid.set(masterGrid);
    gridRef.current = activeGrid;
    gridDimsRef.current = { cols, rows, width: w, height: h };
    colorGridRef.current = colorGrid;

    // Automatic color dominance detection - Always run when enabled, but only use for targeting when enabled
    if (colorData && colorDominanceEnabled && colorGrid) {
        const colorMap = new Map<string, number>();
        const colorToHex = (r: number, g: number, b: number) => {
            // Ensure values are clamped and properly formatted
            const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
            return `#${[clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('')}`;
        };
        
        // Count color occurrences (quantize to reduce noise, but less aggressive)
        const quantize = (val: number) => Math.round(val / 8) * 8; // Less quantization for better detection
        
        for (let i = 0; i < len; i++) {
            if (masterGrid[i] === 1) {
                const colorIdx = i * 4;
                const r = quantize(colorGrid[colorIdx]);
                const g = quantize(colorGrid[colorIdx + 1]);
                const b = quantize(colorGrid[colorIdx + 2]);
                const a = colorGrid[colorIdx + 3];
                
                // Skip transparent pixels
                if (a < 128) continue;
                
                const hex = colorToHex(r, g, b);
                colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
            }
        }
        
        // Find dominant colors (top 3, filter out very small percentages)
        const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .filter(([_, count]) => count / pixels.length > 0.01) // At least 1% of shape
            .map(([color, count]) => ({
                color,
                percentage: count / pixels.length
            }));
        
        // Separate each color into its own region
        const colorRegions: Array<{ color: string, points: Point[] }> = [];
        const tolerance = colorDominanceTolerance;
        
        for (const { color: dominantColor } of sortedColors) {
            const targetColor = hexToRgb(dominantColor);
            if (targetColor) {
                const regionPoints: Point[] = [];
                for (let i = 0; i < len; i++) {
                    if (masterGrid[i] === 1) {
                        const colorIdx = i * 4;
                        const cellColor = {
                            r: colorGrid[colorIdx],
                            g: colorGrid[colorIdx + 1],
                            b: colorGrid[colorIdx + 2]
                        };
                        const similarity = colorSimilarity(cellColor, targetColor);
                        if (similarity >= (1 - tolerance)) {
                            const coords = getCellCoords(i, cols);
                            regionPoints.push(coords);
                        }
                    }
                }
                if (regionPoints.length > 0) {
                    colorRegions.push({
                        color: dominantColor,
                        points: regionPoints
                    });
                }
            }
        }
        
        setColorDominanceData({
            dominantColors: sortedColors,
            regions: colorRegions
        });
    } else {
        setColorDominanceData(null);
    }

    setBites([]);
    setCrumbs([]);
    lastBitePosRef.current = null;
    
    // Pick start angle
    const startAngle = getStartAngle();
    lastBiteAngleRef.current = startAngle;

    setIsFinished(false);
    setIsResetting(false);
    lastInteractTimeRef.current = 0;
    
    // Use refs to avoid including callbacks in dependency array
    const initialPlan = planNextBiteRef.current?.() ?? null;
    nextBiteRef.current = initialPlan;
    setNextBite(initialPlan);
    const structure = calculateStructureRef.current?.() ?? { islands: [], perimeter: [], tips: [] };
    setStructure(structure);

  }, [pathData, viewBoxStr, cx, cy, colorDominanceEnabled, colorDominanceTolerance, getStartAngle, baseColor, imageSrc]);

  // Separate effect for image color detection (runs after image loads)
  useEffect(() => {
    if (!imageSrc || !colorDominanceEnabled || !gridRef.current || !colorGridRef.current) return;
    
    const img = new Image();
    // Only set crossOrigin for non-data URIs (data URIs don't need CORS)
    if (!isDataURI(imageSrc)) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      
      const vb = viewBoxStr.split(' ').map(Number);
      const w = vb[2] || 480;
      const h = vb[3] || 480;
      if (w === 0 || h === 0) return;
      
      canvas.width = w;
      canvas.height = h;
      
      // Draw the image
      ctx.drawImage(img, 0, 0, w, h);
      
      // Apply mask to only sample colors within the shape
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      const path2d = new Path2D(pathData);
      ctx.fill(path2d);
      ctx.globalCompositeOperation = 'source-over';
      
      const imageColorData = ctx.getImageData(0, 0, w, h);
      const { cols, rows } = gridDimsRef.current;
      const len = cols * rows;
      
      // Update color grid with actual image colors
      for (let i = 0; i < len; i++) {
        if (gridRef.current && gridRef.current[i] === 1) {
          const coords = getCellCoords(i, cols);
          const pixelX = Math.floor(coords.x);
          const pixelY = Math.floor(coords.y);
          const pixelIdx = (pixelY * w + pixelX) * 4;
          const cellIdx = i * 4;
          
          if (pixelIdx >= 0 && pixelIdx < imageColorData.data.length && colorGridRef.current) {
            colorGridRef.current[cellIdx] = imageColorData.data[pixelIdx];
            colorGridRef.current[cellIdx + 1] = imageColorData.data[pixelIdx + 1];
            colorGridRef.current[cellIdx + 2] = imageColorData.data[pixelIdx + 2];
            colorGridRef.current[cellIdx + 3] = imageColorData.data[pixelIdx + 3];
          }
        }
      }
      
      // Re-run color detection with updated colors
      const colorMap = new Map<string, number>();
      const colorToHex = (r: number, g: number, b: number) => {
        const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
        return `#${[clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('')}`;
      };
      
      const quantize = (val: number) => Math.round(val / 8) * 8;
      let pixelCount = 0;
      
      for (let i = 0; i < len; i++) {
        if (gridRef.current && gridRef.current[i] === 1 && colorGridRef.current) {
          pixelCount++;
          const colorIdx = i * 4;
          const r = quantize(colorGridRef.current[colorIdx]);
          const g = quantize(colorGridRef.current[colorIdx + 1]);
          const b = quantize(colorGridRef.current[colorIdx + 2]);
          const a = colorGridRef.current[colorIdx + 3];
          
          if (a < 128) continue;
          
          const hex = colorToHex(r, g, b);
          colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
        }
      }
      
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .filter(([_, count]) => count / pixelCount > 0.01)
        .map(([color, count]) => ({
          color,
          percentage: count / pixelCount
        }));
      
      const colorRegions: Array<{ color: string, points: Point[] }> = [];
      const tolerance = config.colorDominance?.tolerance ?? 0.2;
      
      for (const { color: dominantColor } of sortedColors) {
        const targetColor = hexToRgb(dominantColor);
        if (targetColor && colorGridRef.current) {
          const regionPoints: Point[] = [];
          for (let i = 0; i < len; i++) {
            if (gridRef.current && gridRef.current[i] === 1) {
              const colorIdx = i * 4;
              const cellColor = {
                r: colorGridRef.current[colorIdx],
                g: colorGridRef.current[colorIdx + 1],
                b: colorGridRef.current[colorIdx + 2]
              };
              const similarity = colorSimilarity(cellColor, targetColor);
              if (similarity >= (1 - tolerance)) {
                const coords = getCellCoords(i, cols);
                regionPoints.push(coords);
              }
            }
          }
          if (regionPoints.length > 0) {
            colorRegions.push({
              color: dominantColor,
              points: regionPoints
            });
          }
        }
      }
      
      setColorDominanceData({
        dominantColors: sortedColors,
        regions: colorRegions
      });
    };
    
    img.onerror = () => {
      // If image fails to load, keep existing color detection
    };
    
    img.src = imageSrc;
  }, [imageSrc, colorDominanceEnabled, pathData, viewBoxStr, colorDominanceTolerance, gridRef, colorGridRef, gridDimsRef]);


  // --- Reset ---
  const reset = useCallback(() => {
    setIsResetting(true);
    setTimeout(() => {
        if (initialGridRef.current && gridRef.current) {
            gridRef.current.set(initialGridRef.current);
        }
        setBites([]);
        setCrumbs([]);
        lastBitePosRef.current = null;
        lastInteractTimeRef.current = 0; // Reset interaction time
        
        // Pick a new random start angle on reset
        lastBiteAngleRef.current = getStartAngle();
        
        setIsFinished(false);
        setIsResetting(false);

        // Re-plan
        const plan = planNextBite();
        nextBiteRef.current = plan;
        setNextBite(plan);
        setStructure(calculateStructure());
    }, resetDuration); 
  }, [resetDuration, planNextBite, calculateStructure, getStartAngle]);


  // --- Trigger Bite ---
  const triggerBite = useCallback((manualPoint?: {x: number, y: number}) => {
    if (isFinishedRef.current) return;
    
    // Haptic Feedback (Technical feel) - only on user interaction
    if (manualPoint && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(10);
        } catch (e) {
            // Ignore vibration errors
        }
    }

    // Handle Manual Interaction
    if (manualPoint) {
       lastInteractTimeRef.current = Date.now();
    } 
    // Handle Auto Pause
    else if (Date.now() - lastInteractTimeRef.current < IDLE_THRESHOLD) {
        return; // Pause auto-eating while user is interacting/idle
    }

    let plan = manualPoint ? null : nextBiteRef.current;
    
    // If auto mode and no plan, try to plan one
    if (!plan && !manualPoint) plan = planNextBite();

    // If still no plan (finished) or manual mode
    if (!plan && !manualPoint) {
        const analysis = analyzeGrid();
        const mainBodySize = analysis?.clusters[analysis.clusters.length - 1]?.length || 0;

        // Finish if body is small OR if no plan is possible even with manual attempt (e.g. empty)
        // Check real remaining count to be safe
        let realCount = 0;
        if (gridRef.current) {
            for(let i=0; i<gridRef.current.length; i++) if(gridRef.current[i]===1) realCount++;
        }

        if (mainBodySize < 15 || realCount < 15) {
             explodeRemaining();
             setIsFinished(true);
             setBites(prev => [...prev, {
                id: Date.now() + 1,
                x: cx, 
                y: cy, 
                path: generateBitePath(maxR * 1.5, biteRoundness, 0), 
                rotation: 0, 
                scale: 1,
                radius: maxR * 1.5
            }]);
            timeoutRef.current = setTimeout(reset, 1500);
        }
        return;
    }

    // Determine target coordinates
    let tx = 0, ty = 0, bitePath = '';
    let rotation = 0;
    let biteRadius: number;

    if (manualPoint) {
        tx = manualPoint.x;
        ty = manualPoint.y;
        
        // Get grid dimensions first
        const { cols } = gridDimsRef.current;
        
        // For manual bites, find optimal bite size to avoid creating islands
        const sizeScale = (maxR / 240) * biteSizeScale; 
        const baseR = 50 * sizeScale;
        const maxBiteR = baseR * 1.1;
        const minBiteR = baseR * 0.7;
        
        // Find optimal bite size for manual point (similar to planNextBite logic)
        let optimalBiteR = baseR;
        const testSizes = [minBiteR, baseR * 0.85, baseR, maxBiteR];
        
        for (const testR of testSizes) {
            const clearR = testR * 1.2;
            const clearRSq = clearR * clearR;
            const tempGrid = gridRef.current ? new Uint8Array(gridRef.current) : null;
            
            if (!tempGrid) break;
            
            // Simulate removing cells
            const startCol = Math.max(0, Math.floor((tx - clearR) / GRID_CELL_SIZE));
            const endCol = Math.min(cols - 1, Math.ceil((tx + clearR) / GRID_CELL_SIZE));
            const startRow = Math.max(0, Math.floor((ty - clearR) / GRID_CELL_SIZE));
            const endRow = Math.min(gridDimsRef.current.rows - 1, Math.ceil((ty + clearR) / GRID_CELL_SIZE));
            
            for(let r = startRow; r <= endRow; r++) {
                for(let c = startCol; c <= endCol; c++) {
                    const idx = r * cols + c;
                    if (tempGrid[idx] === 1) {
                        const px = c * GRID_CELL_SIZE + GRID_CELL_SIZE/2;
                        const py = r * GRID_CELL_SIZE + GRID_CELL_SIZE/2;
                        if ((px - tx)**2 + (py - ty)**2 <= clearRSq) {
                            tempGrid[idx] = 0;
                        }
                    }
                }
            }
            
            // Check for islands
            const visited = new Uint8Array(tempGrid.length);
            let clusterCount = 0;
            for (let i = 0; i < tempGrid.length; i++) {
                if (tempGrid[i] === 1 && visited[i] === 0) {
                    clusterCount++;
                    const queue = [i];
                    visited[i] = 1;
                    while(queue.length > 0) {
                        const idx = queue.pop()!;
                        const cellX = idx % cols;
                        const cellY = Math.floor(idx / cols);
                        if (cellY > 0 && tempGrid[idx - cols] === 1 && visited[idx - cols] === 0) {
                            visited[idx - cols] = 1;
                            queue.push(idx - cols);
                        }
                        if (cellY < gridDimsRef.current.rows - 1 && tempGrid[idx + cols] === 1 && visited[idx + cols] === 0) {
                            visited[idx + cols] = 1;
                            queue.push(idx + cols);
                        }
                        if (cellX > 0 && tempGrid[idx - 1] === 1 && visited[idx - 1] === 0) {
                            visited[idx - 1] = 1;
                            queue.push(idx - 1);
                        }
                        if (cellX < cols - 1 && tempGrid[idx + 1] === 1 && visited[idx + 1] === 0) {
                            visited[idx + 1] = 1;
                            queue.push(idx + 1);
                        }
                    }
                }
            }
            
            // Use this size if it doesn't create islands
            if (clusterCount <= 1 && testR > optimalBiteR) {
                optimalBiteR = testR;
            }
        }
        
        // Angle from center
        const angleToCenter = Math.atan2(ty - cy, tx - cx);
        rotation = (angleToCenter * 180 / Math.PI) - 90;
        
        bitePath = generateBitePath(optimalBiteR, biteRoundness, biteDepthVariance);
        
        // Store the radius for grid removal
        biteRadius = optimalBiteR;
        
        // Update last position references for continuity if user stops clicking
        lastBitePosRef.current = { x: tx, y: ty };
        lastBiteAngleRef.current = Math.atan2(ty - cy, tx - cx);

    } else if (plan) {
        tx = plan.x;
        ty = plan.y;
        bitePath = plan.path;
        rotation = plan.rotation;
        biteRadius = plan.radius || (() => {
            // Fallback: estimate from maxR if radius not stored
            const sizeScale = (maxR / 240) * biteSizeScale; 
            return 50 * sizeScale;
        })();
        lastBitePosRef.current = { x: tx, y: ty };
    }

    // --- Remove Meat from Grid ---
    // Get grid dimensions (cols may have been declared in manualPoint block, but we need it here too)
    const { cols } = gridDimsRef.current;
    
    // biteRadius should be set above, but ensure it exists
    if (typeof biteRadius === 'undefined') {
        const sizeScale = (maxR / 240) * biteSizeScale; 
        biteRadius = 50 * sizeScale;
    }
    
    const clearR = biteRadius * 1.2; // Clear radius (slightly larger than bite)
    const clearRSq = clearR * clearR;
    
    const startCol = Math.max(0, Math.floor((tx - clearR) / GRID_CELL_SIZE));
    const endCol = Math.min(cols - 1, Math.ceil((tx + clearR) / GRID_CELL_SIZE));
    const startRow = Math.max(0, Math.floor((ty - clearR) / GRID_CELL_SIZE));
    const endRow = Math.min(gridDimsRef.current.rows - 1, Math.ceil((ty + clearR) / GRID_CELL_SIZE));

    let removed = 0;
    for(let r = startRow; r <= endRow; r++) {
        for(let c = startCol; c <= endCol; c++) {
            const idx = r * cols + c;
            if (gridRef.current![idx] === 1) {
                const px = c * GRID_CELL_SIZE + GRID_CELL_SIZE/2;
                const py = r * GRID_CELL_SIZE + GRID_CELL_SIZE/2;
                if ((px - tx)**2 + (py - ty)**2 <= clearRSq) {
                    gridRef.current![idx] = 0;
                    removed++;
                }
            }
        }
    }

    // --- STRUCTURAL INTEGRITY CHECK ---
    // After the bite, check if we created any disconnected islands (debris).
    // If we did, gravity takes over and they fall off immediately.
    const analysis = analyzeGrid();
    if (analysis && analysis.clusters.length > 1) {
        // We have more than one cluster. 
        // Logic: Keep the largest one (main body). Crumble the rest.
        // analysis.clusters is sorted by size ASC, so the last one is largest.
        
        // Iterate over all clusters EXCEPT the last one (largest)
        for(let i = 0; i < analysis.clusters.length - 1; i++) {
             const detachedCluster = analysis.clusters[i];
             // Detach and crumble
             crumbleIndices(detachedCluster);
        }
    }


    const newBite: Bite = { 
        id: Date.now() + Math.random(),
        x: tx,
        y: ty,
        path: bitePath,
        rotation,
        scale: 1.0,
        radius: biteRadius // Store radius for reference
    };
    
    setBites(prev => [...prev, newBite]);

    spawnCrumbs(tx, ty, removed > 20 ? 1.5 : 1.0);
    
    if (scaleTimeoutRef.current) clearTimeout(scaleTimeoutRef.current);
    setScale(0.995);
    scaleTimeoutRef.current = setTimeout(() => setScale(1), 150); 

    // Always re-plan after a bite (whether manual or auto)
    // For manual bites, we want the auto-planner to react to the new shape
    const nextPlan = planNextBite();
    nextBiteRef.current = nextPlan;
    setNextBite(nextPlan);
    setStructure(calculateStructure());

  }, [cx, cy, maxR, biteSizeScale, biteRoundness, biteDepthVariance, analyzeGrid, planNextBite, reset, spawnCrumbs, calculateStructure, explodeRemaining, crumbleIndices]);


  // Auto-Loop
  useEffect(() => {
    const loop = () => {
        if (!autoEat || isResetting || isFinishedRef.current) return;
        
        triggerBite();
        
        const variation = interval * 0.2; 
        const delay = interval + (Math.random() * variation - variation/2);
        
        // If we are in idle pause, check more frequently
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

  const updateCrumbs = useCallback((updated: Crumb[]) => setCrumbs(updated), []);

  return { bites, crumbs, triggerBite, updateCrumbs, isResetting, scale, isFinished, nextBite, structure, colorDominanceData };
};