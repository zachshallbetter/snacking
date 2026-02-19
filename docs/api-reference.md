# API Reference

## Components

### `<YumItem />`
The main component for creating eating animations on SVG paths.

**Props:**
- `svgPath` (string, required): The SVG path data (`d` attribute).
- `viewBox` (string, required): The SVG viewBox attribute (e.g., "0 0 100 100").
- `colors` (object):
  - `base`: Main color of the item.
  - `shadow`: Color for the bite shadows.
  - `highlight`: Color for glossy highlights.
  - `crumbs`: Array of strings for particle colors.
- `config` (YumConfig): Configuration object (see below).

### `<ImageEater />`
Applies eating animations to images using SVG masks.

**Props:**
- `src` (string, required): URL or base64 data URI of the image.
- `maskPath` (string, required): SVG path data defining the shape boundary.
- `viewBox` (string, required): SVG viewBox for the mask path.
- `config` (YumConfig): Animation configuration.
- `colors` (object): Used for crumbs and background effects.

### `<Loader />`
A circular loading indicator.

**Props:**
- `size` (number): Diameter in pixels. Default: 100.
- `color` (string): Main color. Default: '#FF4785'.
- `speed` (number): Animation speed ms. Default: 200.
- `showCrumbs` (boolean): Whether to show particles. Default: true.

### `<ProgressBar />`
A horizontal progress bar.

**Props:**
- `width` (number | string): Width of the bar.
- `height` (number): Height of the bar.
- `progress` (number): Value between 0 and 1.
- `animated` (boolean): Enable eating animation.

## Hooks

### `useYumYum(config, svgPath, viewBox, crumbColors)`
The core hook for custom implementations.

**Returns:**
- `bites`: Array of current bite objects.
- `crumbs`: Array of current crumb particles.
- `triggerBite()`: Function to manually trigger a bite.
- `isFinished`: Boolean indicating if the item is fully eaten.

## Types

### `YumConfig`
Configuration object for fine-tuning animations.

```typescript
interface YumConfig {
  cx: number;              // Center X coordinate
  cy: number;              // Center Y coordinate
  maxR: number;            // Maximum radius for eating logic
  autoEat?: boolean;       // If true, bites happen automatically
  interval?: number;       // Time between bites (ms)
  biteSizeScale?: number;  // Multiplier for bite size
  gravity?: number;        // Gravity force for crumbs
  drag?: number;           // Air resistance for crumbs
  // ... (see types.ts for full list)
}
```
