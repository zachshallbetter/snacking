# Architecture

This document provides a high-level overview of the YumYum Animation Library's architecture.

## Project Structure

The codebase is organized into a library structure with a demo application:

```
yumyum/
├── lib/                  # Main library source code
│   ├── index.ts          # Entry point exporting components, hooks, and classes
│   └── vanilla/
│       └── YumEater.ts   # Vanilla JS class wrapper
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

### 1. The Core Engines
The logic of the library is shared across two consumption interfaces:
- **`useYumYum`**: The primary React hook containing the eating logic, state management, and physics hooks.
- **`YumEater`**: The native JavaScript controller class providing the exact same pathfinding and bite simulation algorithm directly in DOM environments without needing React.

### 2. Path-Based Eating
Almost all animations are based on SVG paths. The library parses these paths to understand the shape's boundary, ensuring bites only occur "inside" the shape.

- **`YumItem`**: Takes a raw SVG path string and renders the eating effect.
- **`ImageEater`**: Uses an SVG mask (generated from a path) to hide parts of an image, simulating it being eaten.

### 3. Particle System (`Crumbs`)
A lightweight particle system visualizes the debris from eating:
- **React**: Renders paths and shapes within a nested `<svg>` layer.
- **Vanilla JS**: Uses a high-performance `<canvas>` overlay to render particles reacting to gravity and velocity.

## Component Hierarchy

- **Presentation Layer**: `Loader`, `ProgressBar`, `ProgressCircle` (Wrappers)
  - **Core Visuals**: `YumItem`, `ImageEater` (React) or `YumEater` (Vanilla class)
    - **Logic**: `useYumYum` hook (React) or internal grid analysis (Vanilla class)
    - **Effects**: `Crumbs` component (React) or Canvas drawing (Vanilla class)
