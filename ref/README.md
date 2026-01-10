# Reference Files (`ref/` Directory)

This directory contains reference assets used in the animation process, particularly for image-based eating animations.

## Files

- **`mask.svg`** - SVG file containing the shape path with white fill (used for mask definition)
- **`inverted-mask.svg`** - Inverted version of the mask
- **`contour.svg`** - Outline/contour version of the shape
- **`image.png`** - Source image file (e.g., pizza image) used as the visual content

## Purpose

These files serve as reference materials for understanding how the animation system works with SVG paths and images. The SVG path data extracted from these files defines the shape boundary that controls:

1. **Where bites can occur** - Only within the shape boundary
2. **How the image is masked** - SVG masks reveal/hide parts as bites are taken
3. **Color sampling boundaries** - Color detection only analyzes pixels within the shape
4. **Grid analysis** - The path is converted to a grid for bite planning

## How It Works

### SVG Path Extraction

The path data (`d` attribute) from the SVG files is extracted and used as the `maskPath` prop:

```tsx
// Path extracted from mask.svg
const maskPath = "M250.9,3.7c-.4,2.6,4.8-.6,5.1,1.9...";

<ImageEater
  src="./ref/image.png"
  maskPath={maskPath}
  viewBox="0 0 612.8 626.9"
  // ...
/>
```

### Shape Boundary Definition

The path defines the shape boundary in the component:

```tsx
// In ImageEater.tsx or YumItem.tsx
<path id="imageBody" d={maskPath} />
```

### Grid Conversion

The `useYumYum` hook converts the SVG path into a grid representation:

1. Creates a canvas and renders the path
2. Samples grid cells (10x10px resolution) to determine inside/outside
3. Builds a binary grid (1 = inside shape, 0 = outside)
4. Uses grid for bite planning and collision detection

### Mask Application

The path is used to create an SVG mask that controls image visibility:

```tsx
<mask id="imageEaterMask">
  {/* White = visible, Black = hidden */}
  <rect fill="white" /> {/* Full image visible initially */}
  {bites.map(bite => (
    <path fill="black" d={bite.path} /> {/* Hide eaten areas */}
  ))}
</mask>

<g mask="url(#imageEaterMask)">
  <image href={src} />
</g>
```

### Color Sampling

The shape boundary limits color sampling to pixels within the shape:

- Only grid cells marked as "inside" (value = 1) are analyzed
- Enables targeted color detection for specific regions
- Used for intelligent bite placement based on color preferences

## Usage in Codebase

### In `data/items.tsx`

```tsx
pizzaimage: {
  id: 'pizzaimage',
  path: "M250.9,3.7c-.4,2.6...", // Extracted from mask.svg
  viewBox: "0 0 612.8 626.9",
  imageSrc: './ref/image.png',
  isImage: true
}
```

### In `components/animations/ImageEater.tsx`

```tsx
<ImageEater
  src={src}
  maskPath={maskPath}  // From ref SVG files
  viewBox={viewBox}
  // ...
/>
```

### In `hooks/useYumYum.ts`

The hook uses the path to:
- Initialize the grid (lines 776-945)
- Sample colors from the image (lines 948-1077)
- Plan bite locations (lines 352-725)
- Apply structural analysis (lines 242-259)

## Creating Custom Reference Files

To create your own eating animations:

1. **Design Shape**: Create your shape in an SVG editor (Inkscape, Illustrator, etc.)
2. **Extract Path**: Copy the `d` attribute from the `<path>` element
3. **Note ViewBox**: Record the `viewBox` dimensions
4. **Prepare Image**: Add your source image file
5. **Calculate Center**: Determine `cx`, `cy`, and `maxR` based on your shape

Example workflow:

```bash
# 1. Open mask.svg in Inkscape
# 2. Select the path element
# 3. Copy the 'd' attribute value
# 4. Use in your component:

const customPath = "M100,100 L200,100 L200,200 L100,200 Z";
const customViewBox = "0 0 300 300";

<ImageEater
  src="./custom-image.png"
  maskPath={customPath}
  viewBox={customViewBox}
  config={{
    cx: 150,  // Center X (half of width)
    cy: 150,  // Center Y (half of height)
    maxR: 150 // Maximum radius (half of width/height)
  }}
/>
```

## Technical Details

### Grid Resolution

- Default grid cell size: **10x10 pixels** (`GRID_CELL_SIZE = 10`)
- Each cell represents a 10x10px area of the shape
- Grid is used for:
  - Collision detection (is point inside shape?)
  - Bite planning (where can bites occur?)
  - Color sampling (which pixels to analyze?)
  - Structural analysis (islands, perimeter, tips)

### Path Format

The SVG path uses standard SVG path syntax:
- `M` = Move to
- `L` = Line to
- `C` = Cubic Bezier curve
- `Z` = Close path
- Coordinates are in the viewBox coordinate system

### Mask Behavior

- **White areas** in mask = visible (image shows)
- **Black areas** in mask = hidden (image hidden)
- Bites are rendered as black paths, creating "holes" in the visible image
- The mask is applied to the entire image group

## Related Files

- `components/animations/ImageEater.tsx` - Component using ref files
- `components/YumItem.tsx` - Component using SVG paths
- `hooks/useYumYum.ts` - Core hook processing paths
- `data/items.tsx` - Item definitions using ref paths
