# Getting Started

## Installation

To install the Snacking Animation Library in your project, use one of the following commands:

```bash
npm install @snacking/animation-library
# or
pnpm add @snacking/animation-library
# or
yarn add @snacking/animation-library
```

## Quick Start
### Basic Usage

Here is a simple example of how to use the `YumItem` component:

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

### Other Components

The library also includes ready-to-use components like `Loader`, `ProgressBar`, and `ImageEater`. See the [examples](./examples.md) page for more details.
