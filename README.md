# Snacking Animation Library

A React library for creating interactive eating animations, loaders, progress indicators, and delete animations with customizable physics and visual effects.

## Features

- 🍪 **Eating Animations** - Animate shapes being "eaten" with realistic bite patterns
- 📊 **Progress Indicators** - Animated progress bars and circles
- 🖼️ **Image Eating** - Apply eating effects to images using SVG masks
- 🗑️ **Delete Animations** - Smooth delete animations with particle effects
- ⚙️ **Highly Configurable** - Customize physics, visuals, and behavior
- 🎨 **Flexible Styling** - Works with any styling system

## Installation

```bash
npm install @snacking/animation-library
# or
pnpm add @snacking/animation-library
# or
yarn add @snacking/animation-library
```

## Quick Start

### Basic Usage

```tsx
import { YumItem } from '@snacking/animation-library';

function App() {
  return (
    <YumItem
      svgPath="M100,100 L200,100 L200,200 L100,200 Z"
      viewBox="0 0 300 300"
      colors={{
        base: '#FF4785',
        shadow: '#9F1239',
        highlight: '#FFFFFF',
        crumbs: ['#FFFFFF', '#FF4785']
      }}
      config={{
        cx: 150,
        cy: 150,
        maxR: 150,
        autoEat: true,
        interval: 360
      }}
    />
  );
}
```

### Loader Component

```tsx
import { Loader } from '@snacking/animation-library';

function Loading() {
  return <Loader size={100} color="#FF4785" speed={200} />;
}
```

### Progress Bar

```tsx
import { ProgressBar } from '@snacking/animation-library';

function Progress() {
  const [progress, setProgress] = useState(0.5);

  return (
    <ProgressBar
      width={400}
      height={24}
      progress={progress}
      color="#FF4785"
      animated={true}
    />
  );
}
```

### Image Eater

```tsx
import { ImageEater } from '@snacking/animation-library';

function ImageAnimation() {
  return (
    <ImageEater
      src="/path/to/image.png"
      maskPath="M250.9,3.7c-.4,2.6..."
      viewBox="0 0 612.8 626.9"
      colors={{
        base: '#F59E0B',
        shadow: '#B45309',
        highlight: '#FFFFFF',
        crumbs: ['#EF4444', '#FEF3C7', '#F59E0B']
      }}
      config={{
        cx: 306.4,
        cy: 313.45,
        maxR: 310,
        autoEat: true,
        interval: 360
      }}
    />
  );
}
```

#### Base64 Image Support

The `ImageEater` component supports base64 encoded images via data URIs:

```tsx
// Using base64 data URI
<ImageEater
  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  maskPath="M250.9,3.7c-.4,2.6..."
  viewBox="0 0 612.8 626.9"
  // ... rest of props
/>
```

Base64 images are automatically detected and handled without CORS restrictions, making them ideal for:
- Embedded images in applications
- Dynamically generated images
- Images loaded from memory/cache
- Offline-capable applications

## Components

### YumItem

Main component for eating animations on SVG paths.

**Props:**
- `svgPath` (string) - SVG path data
- `viewBox` (string) - SVG viewBox
- `colors` (object) - Color configuration
- `config` (YumConfig) - Animation configuration
- `children` (ReactNode) - Optional decorations

### Loader

Circular loader with eating animation.

**Props:**
- `size` (number) - Size in pixels (default: 100)
- `color` (string) - Loader color (default: '#FF4785')
- `speed` (number) - Animation speed in ms (default: 200)
- `showCrumbs` (boolean) - Show particle effects (default: true)
- `crumbColors` (string[]) - Crumb colors

### ProgressBar

Horizontal progress bar with eating animation.

**Props:**
- `width` (number | string) - Bar width
- `height` (number) - Bar height (default: 20)
- `progress` (number) - Progress 0-1
- `color` (string) - Progress color
- `backgroundColor` (string) - Background color
- `animated` (boolean) - Use eating animation (default: true)
- `showCrumbs` (boolean) - Show particle effects

### ProgressCircle

Circular progress indicator.

**Props:**
- `size` (number) - Circle size (default: 100)
- `progress` (number) - Progress 0-1
- `color` (string) - Progress color
- `strokeWidth` (number) - Stroke width (default: 8)
- `animated` (boolean) - Use eating animation
- `showCrumbs` (boolean) - Show particle effects

### ImageEater

Eat images using SVG masks.

**Props:**
- `src` (string) - Image source URL
- `maskPath` (string) - SVG path for mask
- `viewBox` (string) - SVG viewBox
- `colors` (object) - Color configuration
- `config` (YumConfig) - Animation configuration

## Reference Files (`ref/` Directory)

The `ref/` directory contains reference assets used in the animation process, particularly for image-based eating animations.

### Files

- **`mask.svg`** - SVG file containing the shape path with white fill
- **`inverted-mask.svg`** - Inverted version of the mask
- **`contour.svg`** - Outline/contour version of the shape
- **`image.png`** - Source image file (e.g., pizza image)

### How Reference Files Are Used

#### 1. **SVG Path Data**

The SVG path data extracted from `mask.svg`, `inverted-mask.svg`, or `contour.svg` is used as the `maskPath` prop to define the shape boundary for eating animations.

```tsx
// Extract path from SVG file
const maskPath = "M250.9,3.7c-.4,2.6,4.8-.6,5.1,1.9...";

<ImageEater
  src="./ref/image.png"
  maskPath={maskPath}  // Shape boundary from ref SVG
  viewBox="0 0 612.8 626.9"
  // ...
/>
```

#### 2. **Shape Boundary Definition**

The path data defines where the eating animation can occur:

- **Grid Analysis**: The `useYumYum` hook converts the path into a grid representation
- **Boundary Detection**: Determines which pixels are inside vs. outside the shape
- **Bite Planning**: Ensures bites only occur within the shape boundary

```tsx
// In ImageEater.tsx
<path id="imageBody" d={maskPath} />  // Defines the shape
```

#### 3. **SVG Mask Creation**

The path is used to create an SVG mask that reveals/hides parts of the image:

```tsx
<mask id="imageEaterMask">
  {/* White rectangle = full visibility */}
  <rect x="-3000" y="-3000" width="10000" height="10000" fill="white" />

  {/* Black bite paths = hide eaten areas */}
  {bites.map((bite) => (
    <path
      d={bite.path}
      fill="black"
      transform={`translate(${bite.x}, ${bite.y}) rotate(${bite.rotation})`}
    />
  ))}
</mask>

{/* Apply mask to image */}
<g mask="url(#imageEaterMask)">
  <image href={src} />
</g>
```

#### 4. **Color Sampling**

The path boundary is used to sample colors from the image for color dominance detection:

- Only pixels within the shape boundary are analyzed
- Enables targeted color detection (e.g., finding specific colored regions)
- Used for intelligent bite placement based on color preferences

#### 5. **Image Source**

The `image.png` file serves as the visual content that gets "eaten":

```tsx
// In data/items.tsx
pizzaimage: {
  // ...
  imageSrc: './ref/image.png',
  isImage: true
}
```

### Workflow

1. **Extract Path**: SVG path data is extracted from `ref/mask.svg` (or similar)
2. **Define Shape**: Path is used to define the shape boundary in components
3. **Create Grid**: `useYumYum` converts path to a grid for analysis
4. **Plan Bites**: Bite planning algorithm uses grid to find valid bite locations
5. **Apply Mask**: SVG mask reveals image, hides eaten areas
6. **Sample Colors**: Color detection samples pixels within shape boundary

### Creating Custom Reference Files

To create custom eating animations:

1. **Create SVG**: Design your shape in an SVG editor
2. **Extract Path**: Copy the `d` attribute from the `<path>` element
3. **Set ViewBox**: Note the `viewBox` dimensions
4. **Provide Image**: Add your source image file
5. **Configure**: Set `cx`, `cy`, and `maxR` based on your shape's center and size

Example:
```tsx
const customMaskPath = "M100,100 L200,100 L200,200 L100,200 Z"; // Square
const customViewBox = "0 0 300 300";

<ImageEater
  src="./custom-image.png"
  maskPath={customMaskPath}
  viewBox={customViewBox}
  config={{
    cx: 150,  // Center X
    cy: 150,  // Center Y
    maxR: 150 // Max radius
  }}
/>
```

### DeleteAnimation

Delete animation wrapper component.

**Props:**
- `onComplete` (function) - Callback when deletion completes
- `duration` (number) - Animation duration in ms
- `color` (string) - Animation color
- `showCrumbs` (boolean) - Show particle effects
- `children` (ReactNode) - Content to animate deletion

## Hooks

### useYumYum

Core hook for eating animations.

```tsx
import { useYumYum } from '@snacking/animation-library';

const {
  bites,
  crumbs,
  triggerBite,
  updateCrumbs,
  isResetting,
  scale,
  isFinished,
  nextBite,
  structure
} = useYumYum(config, svgPath, viewBox, crumbColors);
```

### useShapeEater

Hook for shape-based eating animations.

```tsx
import { useShapeEater } from '@snacking/animation-library';

const {
  bites,
  crumbs,
  progress,
  isFinished,
  takeBite,
  reset
} = useShapeEater({
  shape: 'circle',
  width: 300,
  height: 300,
  radius: 150,
  autoPlay: true,
  // ... more options
});
```

## Configuration

### YumConfig

```typescript
interface YumConfig {
  cx: number;              // Center X
  cy: number;              // Center Y
  maxR: number;            // Maximum radius
  biteSizeScale?: number;  // Bite size multiplier (default: 1)
  interval?: number;       // Auto-eat interval in ms (default: 200)
  autoEat?: boolean;       // Enable auto-eating (default: true)
  gravity?: number;        // Crumb gravity (default: 0.2)
  drag?: number;           // Air resistance (default: 0.96)
  showDebug?: boolean;     // Show debug cursor
  showNextBitePreview?: boolean;  // Show next bite indicator
  showStructurePreview?: boolean; // Show structure overlay
  showOnionSkin?: boolean; // Show original shape outline
  resetDuration?: number;  // Reset animation duration
  animateExit?: boolean;   // Animate on reset
  animateEnter?: boolean;  // Animate on spawn
  drillInBias?: number;    // 0 (peel) to 1 (drill)
  biteRoundness?: number;  // 0 (jagged) to 1 (smooth)
  startPointRandomness?: number;  // 0 (strict) to 1 (random)
  biteDepthVariance?: number;    // 0 (uniform) to 1 (chaotic)
}
```

## Examples

See the `App.tsx` file for a complete example implementation.

## License

MIT
