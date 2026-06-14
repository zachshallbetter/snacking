# Usage Examples

The `@snackstudio/yumyum` supports both React and Vanilla JS integrations out-of-the-box with zero configuration or style sheets required.

---

## React Examples

### Basic YumItem

```tsx
import { YumItem } from '@snackstudio/yumyum';

function CookieExample() {
  return (
    <YumItem
      svgPath="M477.8,241.1c-19.5-123.7..."
      viewBox="0 0 480 480"
      colors={{
        base: '#FF4785',
        shadow: '#9F1239',
        highlight: '#FFFFFF',
        crumbs: ['#FFFFFF', '#FF4785']
      }}
      config={{
        cx: 240,
        cy: 240,
        maxR: 245,
        autoEat: true,
        interval: 360,
        biteSizeScale: 1.5
      }}
    >
      {/* Optional decorations */}
      <circle cx={160} cy={180} r={32} fill="#FFFFFF" />
    </YumItem>
  );
}
```

### Custom Loader

```tsx
import { Loader } from '@snackstudio/yumyum';

function CustomLoader() {
  return (
    <Loader
      size={120}
      color="#3B82F6"
      speed={150}
      showCrumbs={true}
      crumbColors={['#FFFFFF', '#3B82F6']}
    />
  );
}
```

### Progress Bar with State

```tsx
import { useState, useEffect } from 'react';
import { ProgressBar } from '@snackstudio/yumyum';

function FileUpload() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 0.1, 1));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProgressBar
      width={500}
      height={30}
      progress={progress}
      color="#10B981"
      backgroundColor="#E5E7EB"
      animated={true}
      showCrumbs={true}
    />
  );
}
```

### Image Eater

```tsx
import { ImageEater } from '@snackstudio/yumyum';

function AnimatedImage() {
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
        interval: 360,
        showOnionSkin: false,
        showNextBitePreview: true
      }}
    />
  );
}
```

### Delete Animation

```tsx
import { DeleteAnimation } from '@snackstudio/yumyum';

function TodoItem({ item, onDelete }) {
  return (
    <DeleteAnimation
      onComplete={onDelete}
      duration={1000}
      color="#EF4444"
      showCrumbs={true}
    >
      <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </DeleteAnimation>
  );
}
```

---

## Vanilla JavaScript Examples

### Basic Shape Eating

```html
<div id="snack-container" style="width: 400px; height: 400px; margin: auto;"></div>

<script type="module">
  import { YumEater } from '@snackstudio/yumyum';

  const container = document.getElementById('snack-container');
  
  const eater = new YumEater(container, {
    svgPath: "M477.8,241.1c-19.5-123.7...",
    viewBox: "0 0 480 480",
    colors: {
      base: '#FF4785',
      shadow: '#9F1239',
      highlight: '#FFFFFF',
      crumbs: ['#FFFFFF', '#FF4785']
    },
    config: {
      cx: 240,
      cy: 240,
      maxR: 245,
      autoEat: true,
      interval: 300,
      showDebug: true
    }
  });

  // Manually trigger a bite or reset
  // eater.triggerBite({ x: 200, y: 150 });
  // eater.reset();
</script>
```

### Image Eating

```html
<div id="image-container" style="width: 400px; height: 400px;"></div>

<script type="module">
  import { YumEater } from '@snackstudio/yumyum';

  const container = document.getElementById('image-container');
  
  const eater = new YumEater(container, {
    imageSrc: "/path/to/picture.jpg",
    svgPath: "M250.9,3.7c-.4,2.6...",
    viewBox: "0 0 612.8 626.9",
    colors: {
      base: '#F59E0B',
      shadow: '#B45309',
      highlight: '#FFFFFF',
      crumbs: ['#EF4444', '#FEF3C7', '#F59E0B']
    },
    config: {
      cx: 306.4,
      cy: 313.45,
      maxR: 310,
      autoEat: true,
      interval: 360,
      colorDominance: {
        enabled: true,
        targetColor: '#F59E0B'
      }
    }
  });
</script>
```

### Controlling Instantiated Instances

You can dynamically change parameters or fully clean up instances when no longer needed:

```javascript
// Toggle auto eating
eater.setConfig({ autoEat: false });

// Update color dynamically
eater.setColors({ base: '#00FF00' });

// Clean up listeners and DOM elements
eater.destroy();
```
