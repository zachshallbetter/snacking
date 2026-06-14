/**
 * YumEater — Vanilla JavaScript controller for the YumYum eating animation.
 *
 * A thin DOM wrapper around the framework-agnostic {@link EatingEngine}.
 * Manages SVG setup, Canvas-based crumb rendering, event binding, and
 * auto-eat scheduling while delegating all algorithm work to the engine.
 *
 * @example
 * ```js
 * import { YumEater } from '@snackstudio/yumyum';
 *
 * const eater = new YumEater(container, {
 *   svgPath: "M100...",
 *   viewBox: "0 0 200 200",
 *   colors: { base: '#FF4785', shadow: '#D6336C', highlight: '#FFF', crumbs: ['#FF4785'] },
 *   config: { cx: 100, cy: 100, maxR: 90, autoEat: true }
 * });
 *
 * // Later: eater.destroy();
 * ```
 */

import { Bite, Crumb, YumConfig, Point } from '../../types';
import { isDataURI } from '../../utils/image';
import { EatingEngine, varyColor, generateBitePath, ColorDominanceData } from '../core/EatingEngine';

const GRID_CELL_SIZE = 10;

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
  onColorDominanceDetected?: (dominantColor: string, allColors: Array<{ color: string; percentage: number }>) => void;
}

export class YumEater {
  private container: HTMLElement;
  private svgPath: string;
  private viewBox: string;
  private colors: YumEaterColors;
  private config: YumConfig;
  private imageSrc?: string;

  // Engine
  private engine: EatingEngine;

  // State
  private crumbs: Crumb[] = [];
  private isResetting = false;
  private isFinished = false;
  private scale = 1;

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

  // Timing & Animation Loops
  private autoEatTimeout?: ReturnType<typeof setTimeout>;
  private resetTimeout?: ReturnType<typeof setTimeout>;
  private scaleTimeout?: ReturnType<typeof setTimeout>;
  private rafId?: number;

  // Stored event handlers (for cleanup)
  private handleClick!: (e: MouseEvent) => void;
  private handleMouseMove!: (e: MouseEvent) => void;
  private handleMouseEnter!: () => void;
  private handleMouseLeave!: () => void;

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

    // Create engine
    this.engine = new EatingEngine(this.config, this.colors.crumbs, {
      onColorDominanceDetected: (dominantColor, allColors) => {
        this.onColorDominanceDetected?.(dominantColor, allColors);
      },
      onFinished: () => {
        this.onFinished?.();
      },
    });

    this.initDOM();
    this.initGridState();
    this.bindEvents();
    this.startLoop();
  }

  // ===========================================================================
  // DOM Setup
  // ===========================================================================

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

    // Overlay Groups
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
    // Use setTransform to avoid cumulative scale bug
    this.canvasCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  };

  // ===========================================================================
  // Grid Initialization (delegated to engine)
  // ===========================================================================

  private initGridState() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const vb = this.viewBox.split(' ').map(Number);
    const w = vb[2] || 480;
    const h = vb[3] || 480;

    canvas.width = w;
    canvas.height = h;

    const path2d = new Path2D(this.svgPath);
    this.engine.initFromCanvas(ctx, path2d, w, h, this.colors.base);

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
        this.engine.updateColorGridFromImageData(imageColorData, w);
      };
      img.src = this.imageSrc;
    }

    this.updateOverlays();
    this.scheduleAutoEat();
  }

  // ===========================================================================
  // Trigger Bite (delegated to engine)
  // ===========================================================================

  public triggerBite(manualPoint?: { x: number; y: number }) {
    if (this.isFinished) return;

    const result = this.engine.triggerBite(manualPoint);
    if (!result) return;

    const { bite, crumbs: newCrumbs, finished } = result;

    // Add bite to DOM mask
    this.addBiteToDOM(bite);

    // Add crumbs
    this.crumbs = this.crumbs.concat(newCrumbs);

    // Apply scale dip animation
    if (this.scaleTimeout) clearTimeout(this.scaleTimeout);
    this.scale = 0.995;
    this.updateSVGStyle();
    this.scaleTimeout = setTimeout(() => {
      this.scale = 1;
      this.updateSVGStyle();
    }, 150);

    this.updateOverlays();

    if (finished) {
      this.isFinished = true;
      this.resetTimeout = setTimeout(() => this.reset(), 1500);
    }
  }

  private addBiteToDOM(bite: Bite) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', bite.path);
    p.setAttribute('fill', 'black');
    p.setAttribute('transform', `translate(${bite.x}, ${bite.y}) rotate(${bite.rotation}) scale(${bite.scale})`);
    this.maskEl.appendChild(p);
  }

  // ===========================================================================
  // SVG Style Update
  // ===========================================================================

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

  // ===========================================================================
  // Overlays
  // ===========================================================================

  private updateOverlays() {
    const nextBite = this.engine.nextBite;

    // 1. Next Bite Preview
    if (nextBite && !this.isFinished && !this.isResetting && this.config.showNextBitePreview) {
      this.nextBiteGEl!.style.display = 'block';
      this.nextBiteGEl!.setAttribute('transform', `translate(${nextBite.x}, ${nextBite.y}) rotate(${nextBite.rotation})`);
      this.nextBiteGEl!.firstElementChild!.setAttribute('d', nextBite.path);
    } else {
      this.nextBiteGEl!.style.display = 'none';
    }

    // 2. Structure Preview
    while (this.structureGEl!.firstChild) {
      this.structureGEl!.removeChild(this.structureGEl!.firstChild);
    }

    if (this.config.showStructurePreview && !this.isFinished && !this.isResetting) {
      const struct = this.engine.calculateStructure();

      struct.perimeter.forEach(pt => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', String(pt.x));
        c.setAttribute('cy', String(pt.y));
        c.setAttribute('r', '2');
        c.setAttribute('fill', '#06B6D4');
        c.setAttribute('opacity', '0.6');
        this.structureGEl!.appendChild(c);
      });

      struct.tips.forEach(pt => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', String(pt.x));
        c.setAttribute('cy', String(pt.y));
        c.setAttribute('r', '4');
        c.setAttribute('fill', '#D946EF');
        c.setAttribute('opacity', '0.9');
        this.structureGEl!.appendChild(c);
      });

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
    const colorData = this.engine.colorDominanceData;
    if (this.config.showColorDominance && colorData && !this.isFinished && !this.isResetting) {
      colorData.regions.forEach(reg => {
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

  // ===========================================================================
  // Reset
  // ===========================================================================

  public reset() {
    this.isResetting = true;
    this.updateSVGStyle();

    if (this.resetTimeout) clearTimeout(this.resetTimeout);

    this.resetTimeout = setTimeout(() => {
      this.engine.reset();
      this.crumbs = [];

      // Clear mask
      while (this.maskEl.children.length > 1) {
        this.maskEl.removeChild(this.maskEl.lastChild!);
      }

      this.isFinished = false;
      this.isResetting = false;

      this.updateSVGStyle();
      this.updateOverlays();
      this.scheduleAutoEat();
    }, this.config.resetDuration || 800);
  }

  // ===========================================================================
  // Auto Eat Schedule
  // ===========================================================================

  private scheduleAutoEat() {
    if (this.autoEatTimeout) clearTimeout(this.autoEatTimeout);
    if (!this.config.autoEat || this.isResetting || this.isFinished) return;

    const loop = () => {
      if (!this.config.autoEat || this.isResetting || this.isFinished) return;
      this.triggerBite();

      const variation = (this.config.interval ?? 200) * 0.2;
      const delay = (this.config.interval ?? 200) + (Math.random() * variation - variation / 2);
      const nextTick = Math.max(20, delay);

      this.autoEatTimeout = setTimeout(loop, nextTick);
    };

    this.autoEatTimeout = setTimeout(loop, this.config.interval ?? 200);
  }

  // ===========================================================================
  // DOM Event Bindings (with stored references for cleanup)
  // ===========================================================================

  private bindEvents() {
    this.handleClick = (e: MouseEvent) => {
      const pt = this.svgEl.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(this.svgEl.getScreenCTM()?.inverse());
      this.triggerBite({ x: svgP.x, y: svgP.y });
    };

    this.handleMouseMove = (e: MouseEvent) => {
      const pt = this.svgEl.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(this.svgEl.getScreenCTM()?.inverse());

      if (this.config.showDebug && !this.isFinished) {
        const radius = (this.config.maxR / 240) * (this.config.biteSizeScale ?? 1.0) * 50;
        this.debugCursorEl!.setAttribute('cx', String(svgP.x));
        this.debugCursorEl!.setAttribute('cy', String(svgP.y));
        this.debugCursorEl!.setAttribute('r', String(radius));
      }
    };

    this.handleMouseEnter = () => {
      if (this.config.showDebug && !this.isFinished) {
        this.debugCursorEl!.style.opacity = '0.6';
      }
    };

    this.handleMouseLeave = () => {
      this.debugCursorEl!.style.opacity = '0';
    };

    this.wrapperEl.addEventListener('click', this.handleClick);
    this.wrapperEl.addEventListener('mousemove', this.handleMouseMove);
    this.wrapperEl.addEventListener('mouseenter', this.handleMouseEnter);
    this.wrapperEl.addEventListener('mouseleave', this.handleMouseLeave);
  }

  // ===========================================================================
  // Animation Frame Loop (Canvas Crumb Rendering)
  // ===========================================================================

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
          vx, vy,
          rotation: crumb.rotation + crumb.rotationSpeed * drag,
          life: crumb.life - 0.015,
        };
      }).filter(c => c.life > 0);

      // 2. Draw to Canvas
      const ctx = this.canvasCtx;
      const rect = this.wrapperEl.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const vb = this.viewBox.split(' ').map(Number);
      const vbW = vb[2] || 480;
      const vbH = vb[3] || 480;

      const scaleX = rect.width / vbW;
      const scaleY = rect.height / vbH;

      this.crumbs.forEach(crumb => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, crumb.life));
        ctx.fillStyle = crumb.color;
        ctx.translate(crumb.x * scaleX, crumb.y * scaleY);
        ctx.rotate(crumb.rotation * Math.PI / 180);

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

  // ===========================================================================
  // Public API
  // ===========================================================================

  public setConfig(newConfig: Partial<YumConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.engine.updateConfig(this.config);
    this.onionSkinEl!.style.display = this.config.showOnionSkin ? 'block' : 'none';
    this.updateOverlays();
    this.scheduleAutoEat();
  }

  public setColors(newColors: Partial<YumEaterColors>) {
    this.colors = { ...this.colors, ...newColors };
    if (newColors.crumbs) {
      this.engine.updateCrumbColors(newColors.crumbs);
    }
    if (this.mainBodyUseEl) {
      this.mainBodyUseEl.setAttribute('fill', this.colors.base);
    }
    this.onionSkinEl!.setAttribute('fill', this.colors.base);
    this.onionSkinEl!.setAttribute('stroke', this.colors.base);
  }

  public destroy() {
    // Remove all event listeners
    this.wrapperEl.removeEventListener('click', this.handleClick);
    this.wrapperEl.removeEventListener('mousemove', this.handleMouseMove);
    this.wrapperEl.removeEventListener('mouseenter', this.handleMouseEnter);
    this.wrapperEl.removeEventListener('mouseleave', this.handleMouseLeave);
    window.removeEventListener('resize', this.resizeCanvas);

    // Clear all timers and animation frames
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.autoEatTimeout) clearTimeout(this.autoEatTimeout);
    if (this.resetTimeout) clearTimeout(this.resetTimeout);
    if (this.scaleTimeout) clearTimeout(this.scaleTimeout);

    // Remove DOM
    this.container.removeChild(this.wrapperEl);
  }
}
