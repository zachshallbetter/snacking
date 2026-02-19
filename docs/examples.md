# Usage Examples

## Basic YumItem

```tsx
import { YumItem } from '@snacking/animation-library';

function MyComponent() {
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

## Custom Loader

```tsx
import { Loader } from '@snacking/animation-library';

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

## Progress Bar with State

```tsx
import { useState, useEffect } from 'react';
import { ProgressBar } from '@snacking/animation-library';

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

## Image Eater

```tsx
import { ImageEater } from '@snacking/animation-library';

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

### Base64 Image Support

```tsx
import { ImageEater } from '@snacking/animation-library';

function Base64ImageAnimation() {
  // Base64 encoded image (data URI)
  const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...";
  
  return (
    <ImageEater
      src={base64Image}
      maskPath="M250.9,3.7c-.4,2.6..."
      viewBox="0 0 612.8 626.9"
      colors={{
        base: '#F59E0B',
        shadow: '#B45309',
        highlight: '#FFFFFF',
        crumbs: ['#EF4444', '#FEF3C7', '#F59E0B']
      }}
      // ... same config as above
    />
  );
}
```

**Benefits of base64 images:**
- No CORS restrictions
- Works offline
- Embedded directly in code/bundles
- Faster for small images (no network request)

## Delete Animation

```tsx
import { DeleteAnimation } from '@snacking/animation-library';

function TodoItem({ item, onDelete }) {
  return (
    <DeleteAnimation
      onComplete={onDelete}
      duration={1000}
      color="#EF4444"
      showCrumbs={true}
    >
      <div className="p-4 bg-white rounded-lg shadow">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </DeleteAnimation>
  );
}
```

## Using Hooks Directly

```tsx
import { useYumYum } from '@snacking/animation-library';

function CustomEatingAnimation() {
  const config = {
    cx: 200,
    cy: 200,
    maxR: 180,
    autoEat: true,
    interval: 300
  };

  const {
    bites,
    crumbs,
    triggerBite,
    isFinished,
    nextBite
  } = useYumYum(
    config,
    "M100,100 L300,100 L300,300 L100,300 Z",
    "0 0 400 400",
    ['#FF4785', '#FFFFFF']
  );

  return (
    <div>
      {/* Custom rendering using bites and crumbs */}
      <svg viewBox="0 0 400 400">
        {bites.map(bite => (
          <path
            key={bite.id}
            d={bite.path}
            transform={`translate(${bite.x}, ${bite.y}) rotate(${bite.rotation})`}
            fill="black"
          />
        ))}
      </svg>
    </div>
  );
}
```
