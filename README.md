# YumYum Animation Library

A style-agnostic, low-dependency library for creating interactive eating animations, progress loaders, and dynamic deletion transitions. It works with both **React** and **Vanilla JavaScript** in any styling environment (no Tailwind CSS required).

For complete usage instructions and API details, see the [documentation](docs/index.md).

## Features

- **Framework Agnostic**: Native support for React hooks/components and Vanilla JS classes.
- **Style Agnostic**: Out-of-the-box support for any CSS setup—no external styling framework required.
- **Eating Animations**: Animate shapes being consumed with realistic bite patterns.
- **Progress Indicators**: Standard and circular animated progress displays.
- **Image Eating**: Apply eating transitions directly to images using SVG masks.
- **Delete Animations**: Deletion transitions featuring custom particle effects.
- **Configurable Settings**: Fine-tune physics parameters, visual styles, and behaviors.

## Installation

```bash
npm install @snackstudio/yumyum
```

## Quick Start

### React

```tsx
import { YumItem } from '@snackstudio/yumyum';

function App() {
  return (
    <YumItem
      svgPath="M100,100 L200,100 L200,200 L100,200 Z"
      viewBox="0 0 300 300"
      colors={{
        base: '#FF4785',
        shadow: '#D6336C',
        highlight: '#FFFFFF',
        crumbs: ['#FF4785', '#D6336C']
      }}
      config={{
        cx: 150,
        cy: 150,
        maxR: 100,
        autoEat: true,
        interval: 200
      }}
    />
  );
}
```

### Vanilla JavaScript

```html
<div id="cookie-container" style="width: 300px; height: 300px;"></div>

<script type="module">
  import { YumEater } from '@snackstudio/yumyum';

  const container = document.getElementById('cookie-container');
  const eater = new YumEater(container, {
    svgPath: "M100,100 L200,100 L200,200 L100,200 Z",
    viewBox: "0 0 300 300",
    colors: {
      base: '#FF4785',
      shadow: '#D6336C',
      highlight: '#FFFFFF',
      crumbs: ['#FF4785']
    },
    config: {
      cx: 150,
      cy: 150,
      maxR: 100,
      autoEat: true
    }
  });

  // Clean up when done
  // eater.destroy();
</script>
```

### Key Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cx`, `cy` | `number` | — | Center coordinates of the shape |
| `maxR` | `number` | — | Visual boundary radius |
| `autoEat` | `boolean` | `true` | Toggle automatic eating |
| `interval` | `number` | `200` | Auto-eat interval in ms |
| `biteSizeScale` | `number` | `1` | Multiplier for bite size |
| `biteRoundness` | `number` | `0.9` | 0 (jagged) to 1 (smooth) |
| `gravity` | `number` | `0.2` | Crumb downward force |
| `drag` | `number` | `0.96` | Crumb air resistance |
| `drillInBias` | `number` | `0.2` | 0 (peel) to 1 (drill) |
| `resetDuration` | `number` | `800` | Reset animation duration in ms |

For more examples, refer to the [examples guide](docs/examples.md) or the [API reference](docs/api-reference.md).

## License

MIT
