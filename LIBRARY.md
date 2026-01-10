# Library Usage Guide

This codebase is structured as a reusable React library for eating animations and related effects.

## Structure

```
snacking/
├── lib/
│   └── index.ts          # Main library entry point
├── components/           # React components
│   ├── YumItem.tsx      # Main eating animation component
│   ├── Crumbs.tsx       # Particle system component
│   └── animations/      # Animation components
├── hooks/               # React hooks
│   ├── useYumYum.ts     # Core eating animation hook
│   └── useShapeEater.ts # Shape-based eating hook
├── types.ts             # TypeScript type definitions
└── utils/               # Utility functions
```

## Installation

```bash
npm install @snacking/animation-library
```

## Basic Import

```tsx
import { YumItem, Loader, ProgressBar, ImageEater } from '@snacking/animation-library';
```

## Component Flexibility

All components are designed to be flexible and adaptable:

### YumItem
- Works with any SVG path
- Configurable colors, physics, and behavior
- Supports decorations via children prop
- Can be controlled programmatically via hooks

### ImageEater
- Works with any image source
- Uses SVG masks for eating effects
- Fully configurable like YumItem
- Supports all visual overlays
- Requires SVG path data for shape boundary (see `ref/` directory documentation in README.md)

### Animation Components
- Loader: Auto-resetting circular loader
- ProgressBar: Horizontal progress with eating animation
- ProgressCircle: Circular progress indicator
- DeleteAnimation: Wrapper for delete effects

## Configuration

All components accept a `config` prop that allows full customization:

```typescript
const config: YumConfig = {
  cx: 200,              // Center X coordinate
  cy: 200,              // Center Y coordinate
  maxR: 180,            // Maximum radius
  autoEat: true,         // Enable auto-eating
  interval: 360,         // Bite interval in ms
  biteSizeScale: 1.5,    // Bite size multiplier
  gravity: 0.2,          // Crumb gravity
  drag: 0.96,           // Air resistance
  showDebug: false,      // Debug cursor
  showNextBitePreview: true,  // Next bite indicator
  showStructurePreview: false, // Structure overlay
  showOnionSkin: false, // Original shape outline
  // ... more options
};
```

## Styling

The library uses Tailwind CSS classes. To use in projects without Tailwind:

1. **Install Tailwind**: Add Tailwind to your project
2. **CSS Override**: Override styles using CSS
3. **Fork & Customize**: Fork the library and replace Tailwind classes

## Hooks for Custom Implementations

Use hooks directly for custom implementations:

```tsx
import { useYumYum } from '@snacking/animation-library';

function CustomComponent() {
  const { bites, crumbs, triggerBite } = useYumYum(config, path, viewBox, colors);
  
  // Custom rendering logic
  return <YourCustomRenderer bites={bites} crumbs={crumbs} />;
}
```

## Type Safety

All components and hooks are fully typed with TypeScript:

```tsx
import type { YumConfig, ImageEaterProps } from '@snacking/animation-library';
```

## Examples

See `EXAMPLES.md` for detailed usage examples.

## Building for Distribution

```bash
# Build library
pnpm build:lib

# Build demo app
pnpm build
```

## Requirements

- React 18+ or 19+
- Tailwind CSS (for styling)
- TypeScript (recommended)
