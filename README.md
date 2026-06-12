# Snacking Animation Library

A React library for creating interactive eating animations, progress loaders, and dynamic deletion transitions. It features configurable physics, custom particle effects, and SVG masking.

For complete usage instructions and API details, see the [documentation](docs/index.md).

## Features

- **Eating Animations**: Animate shapes being consumed with realistic bite patterns.
- **Progress Indicators**: Standard and circular animated progress displays.
- **Image Eating**: Apply eating transitions directly to images using SVG masks.
- **Delete Animations**: Deletion transitions featuring custom particle effects.
- **Configurable Settings**: Fine-tune physics parameters, visual styles, and behaviors.

## Installation

```bash
npm install @snacking/animation-library
```

## Basic Usage

```tsx
import { YumItem } from '@snacking/animation-library';

function App() {
  return (
    <YumItem
      svgPath="M100..."
      viewBox="0 0 200 200"
      colors={{ base: '#FF4785', shadow: '#D6336C' }}
    />
  );
}
```

For more examples, refer to the [examples guide](docs/examples.md) or the [API reference](docs/api-reference.md).

## License

MIT
