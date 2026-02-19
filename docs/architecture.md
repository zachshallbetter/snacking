# Architecture

This document provides a high-level overview of the Snacking Animation Library's architecture.

## Project Structure

The codebase is organized into a library structure with a demo application:

```
snacking/
├── lib/                  # Main library source code
│   └── index.ts          # Entry point exporting components and hooks
├── components/           # React components
│   ├── YumItem.tsx       # Core component for SVG path eating animations
│   ├── Crumbs.tsx        # Particle system for crumbs/debris
│   ├── ImageEater.tsx    # Component for image-based eating animations
│   └── animations/       # High-level animation components (Loader, etc.)
├── hooks/                # React hooks
│   ├── useYumYum.ts      # Primary hook containing the eating logic and physics
│   └── useShapeEater.ts  # Hook for shape-based abstractions
├── types.ts              # Global TypeScript type definitions
└── utils/                # Helper functions for math and geometry
```

## Key Concepts

### 1. The "Yum" Engine (`useYumYum`)
The core of the library is the `useYumYum` hook. It handles:
- **Bite Generation**: Calculating where bites should appear based on the SVG path.
- **Physics**: Managing the "crumbs" particle system (gravity, drag, velocity).
- **State Management**: Tracking the current state of consumption.

### 2. Path-Based Eating
Almost all animations are based on SVG paths. The library parses these paths to understand the shape's boundary, ensuring bites only occur "inside" the shape.

- **`YumItem`**: Takes a raw SVG path strings and renders the eating effect.
- **`ImageEater`**: Uses an SVG mask (generated from a path) to hide parts of an image, simulating it being eaten.

### 3. Particle System (`Crumbs`)
A lightweight particle system visualizes the debris from eating. It uses canvas or simple DOM elements (depending on implementation specifics) to render particles that react to "gravity" and "explosive force" from bites.

## Component Hierarchy

- **Presentation Layer**: `Loader`, `ProgressBar`, `ProgressCircle` (Wrappers)
  - **Core Visuals**: `YumItem`, `ImageEater`
    - **Logic**: `useYumYum` hook
    - **Effects**: `Crumbs` component
