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
npm install @yumyum/animation-library
```

## Quick Start

### React

```tsx
import { YumItem } from '@yumyum/animation-library';

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

### Vanilla JavaScript

```html
<div id="cookie-container" style="width: 300px; height: 300px;"></div>

<script type="module">
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
</script>
```

For more examples, refer to the [examples guide](docs/examples.md) or the [API reference](docs/api-reference.md).

## License

MIT
