# Library Usage Guide

This codebase is structured as a reusable library for eating animations and related effects, offering first-class support for both React and Vanilla JavaScript.

## Structure

```
yumyum/
├── lib/
│   ├── index.ts          # Main library entry point
│   └── vanilla/
│       └── YumEater.ts   # Vanilla JS controller class
├── components/           # React components
│   ├── YumItem.tsx       # Main eating animation component
│   ├── Crumbs.tsx        # Particle system component
│   └── animations/       # Animation components
├── hooks/                # React hooks
│   ├── useYumYum.ts      # Core eating animation hook
│   └── useShapeEater.ts  # Shape-based eating hook
├── types.ts              # TypeScript type definitions
└── utils/                # Utility functions
```

## Installation

```bash
npm install @yumyum/animation-library
```

---

## React Integration

### Basic Usage

```tsx
import { YumItem, Loader, ProgressBar, ImageEater } from '@yumyum/animation-library';

function App() {
  return (
    <YumItem
      svgPath="M100..."
      viewBox="0 0 200 200"
      colors={{ base: '#FF4785', shadow: '#D6336C', highlight: '#FFFFFF', crumbs: ['#FF4785'] }}
    />
  );
}
```

### Hooks for Custom Implementations

For custom React rendering pipelines, you can import and use the hooks directly:

```tsx
import { useYumYum } from '@yumyum/animation-library';

function CustomComponent() {
  const { bites, crumbs, triggerBite } = useYumYum(config, path, viewBox, colors.crumbs);
  
  return <YourCustomRenderer bites={bites} crumbs={crumbs} />;
}
```

---

## Vanilla JavaScript Integration

The library exposes a native `YumEater` controller class which directly manages the DOM, SVG paths, masks, and crumb particles utilizing a high-performance Canvas overlay.

### Basic Usage

```javascript
import { YumEater } from '@yumyum/animation-library';

const container = document.getElementById('cookie-container');

const eater = new YumEater(container, {
  svgPath: "M100...",
  viewBox: "0 0 200 200",
  colors: {
    base: '#FF4785',
    shadow: '#D6336C',
    highlight: '#FFFFFF',
    crumbs: ['#FF4785']
  },
  config: {
    cx: 100,
    cy: 100,
    maxR: 90,
    autoEat: true
  }
});
```

### Vanilla API Reference

#### `new YumEater(container, options)`
Instantiates a new instance of the engine inside a specified DOM node.

#### `eater.triggerBite(manualPoint?)`
Triggers an eating event. If a `manualPoint` (e.g. `{ x, y }`) is provided, a bite is executed at those coordinates. Otherwise, the auto-eating pathfinding algorithm places the next bite.

#### `eater.reset()`
Resets the grid state, clears all bites, and regenerates the shape.

#### `eater.setConfig(config)`
Updates active settings (e.g. `autoEat`, `interval`, `showDebug`).

#### `eater.setColors(colors)`
Updates base, shadow, or crumb colors dynamically.

#### `eater.destroy()`
Cleans up event listeners, stops physics loops, cancels timeouts, and removes the wrapper elements from the DOM.

---

## Configuration

Both the React components and the Vanilla class accept the same `config` options:

```typescript
const config: YumConfig = {
  cx: 200,                    // Center X coordinate
  cy: 200,                    // Center Y coordinate
  maxR: 180,                  // Maximum radius
  autoEat: true,              // Enable auto-eating
  interval: 360,              // Bite interval in ms
  biteSizeScale: 1.5,          // Bite size multiplier
  gravity: 0.2,                // Crumb gravity force
  drag: 0.96,                 // Air resistance drag coefficient
  showDebug: false,            // Render hover target indicator
  showNextBitePreview: true,    // Highlight upcoming automatic bite path
  showStructurePreview: false,  // Show coastline, peninsula tips, and islands
  showOnionSkin: false,       // Render outline of original shape
  biteRoundness: 0.8,         // Jaggedness of bites (0 to 1)
  biteDepthVariance: 0.2,     // Random depth fluctuation of bites (0 to 1)
  drillInBias: 0.2,           // Inward drilling bias vs surface peeling (0 to 1)
  randomBitePlacement: false,  // Random bite targeting vs clockwise sequence
};
```

---

## Styling

This library is **fully style-agnostic** and dependency-free. Components utilize inline styles for structure (positioning, width, height, cursors) and do not require Tailwind CSS or any external stylesheets.

---

## Requirements

- **For React**: React 18+ or 19+
- **For Vanilla JS**: Modern browser environment supporting SVGs and `<canvas>`
- **TypeScript**: Optional, but recommended (types are bundled out-of-the-box)

## License

MIT
