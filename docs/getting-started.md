# Getting Started

## Installation

To install the YumYum Animation Library in your project, run:

```bash
npm install @snackstudio/yumyum
# or
pnpm add @snackstudio/yumyum
# or
yarn add @snackstudio/yumyum
```

## Quick Start

### React

Here is a simple example of how to use the `YumItem` component:

```tsx
import { YumItem } from '@snackstudio/yumyum';

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

### Vanilla JavaScript

Use the native class wrapper directly in raw HTML or modules:

```html
<div id="snack-box" style="width: 300px; height: 300px;"></div>

<script type="module">
  import { YumEater } from '@snackstudio/yumyum';

  const container = document.getElementById('snack-box');
  const eater = new YumEater(container, {
    svgPath: "M100,100 L200,100 L200,200 L100,200 Z",
    viewBox: "0 0 300 300",
    colors: {
      base: '#FF4785',
      shadow: '#9F1239',
      highlight: '#FFFFFF',
      crumbs: ['#FFFFFF', '#FF4785']
    },
    config: {
      cx: 150,
      cy: 150,
      maxR: 150,
      autoEat: true,
      interval: 360
    }
  });
</script>
```

### Other Components

The library also includes ready-to-use components like `Loader`, `ProgressBar`, `ProgressCircle`, and `ImageEater`. See the [examples](./examples.md) page for more details.
