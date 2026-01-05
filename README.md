# Cookie Cruncher

An interactive web application where you can watch food items get "eaten" with satisfying bite animations and physics-based crumbs. Choose from cookies, cupcakes, pizza, and ice cream, then customize the experience with various settings.

## Features

- **Interactive Food Items**: Click on food items to watch them get eaten bite by bite
- **Multiple Food Types**: Cookie, Cupcake, Pizza, and Ice Cream
- **Customizable Settings**: Adjust colors, bite sizes, physics, animations, and more
- **Auto-Eat Mode**: Watch items automatically get consumed
- **Physics-Based Crumbs**: Realistic particle effects with gravity and drag
- **Visual Debugging**: Toggle preview modes and debug overlays

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

3. Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## How It Works

### Core System

The app uses a grid-based structural analysis system to simulate realistic eating behavior:

1. **Grid Representation**: Each food item is converted into a 10px resolution grid where each cell represents part of the food
2. **Bite Planning**: An intelligent algorithm analyzes the remaining food structure to determine optimal bite locations
3. **Structural Integrity**: After each bite, the system checks for disconnected "islands" that automatically crumble away
4. **Physics Simulation**: Crumbs are generated with realistic physics (gravity, drag, rotation) for satisfying visual feedback

### Bite Algorithm

The bite planning system uses several strategies:

- **Forward Momentum**: Maintains clockwise eating pattern by looking ahead ~120 degrees
- **Surface Detection**: Targets the outer perimeter of the remaining food mass
- **Tip Detection**: Identifies and prioritizes peninsula-like protrusions for natural eating patterns
- **Depth Avoidance**: Prevents "drilling" into the food by penalizing inward bites (configurable)
- **Main Cluster Focus**: Always targets the largest connected mass, ignoring small debris

## Configuration

All settings can be adjusted in real-time via the controls panel. Each food item has default configurations that can be overridden.

### Simulation Settings

- **Auto Eat** (`autoEat`): Toggle automatic eating mode. When enabled, bites occur automatically at the configured interval.
- **Speed** (`interval`): Time between bites in milliseconds (50-800ms). Lower values = faster eating.
- **Bite Size** (`biteSizeScale`): Multiplier for bite radius (0.5x - 3.0x). Larger values create bigger bites.

### Bite Behavior

- **Drill In Bias** (`drillInBias`): Controls how much the algorithm avoids "drilling" into the food
  - `0.0` = Strict peel mode (only surface bites)
  - `1.0` = Allows deeper bites
  - Default: `0.8`

- **Bite Roundness** (`biteRoundness`): Controls the smoothness of bite edges
  - `0.0` = Jagged, irregular bites
  - `1.0` = Smooth, rounded bites
  - Default: `0.9`

- **Start Point Randomness** (`startPointRandomness`): Controls initial bite location selection
  - `0.0` = Always starts at the furthest point from center
  - `1.0` = Random selection from outer 50% of points
  - Default: `0.5`

- **Bite Depth Variance** (`biteDepthVariance`): Adds randomness to bite depth
  - `0.0` = Uniform bite sizes
  - `1.0` = Highly variable bite depths
  - Default: `0.2`

### Physics

- **Gravity** (`gravity`): Downward force applied to crumbs (0.05 - 2.0)
  - Lower values = floaty, slow-falling crumbs
  - Higher values = fast-falling, realistic crumbs
  - Default: `0.2`

- **Air Resistance** (`drag`): Air resistance multiplier (0.80 - 0.99)
  - Lower values = crumbs slow down faster
  - Higher values = crumbs maintain velocity longer
  - Default: `0.96`

### Visual Options

- **Onion Skin**: Shows the original food shape as a semi-transparent overlay
- **Show Next Bite**: Displays a preview indicator where the next bite will occur
- **Structure Preview**: Visualizes the internal structure (islands, perimeter, tips) for debugging
- **Show Bite Cursor**: Displays debug information about bite targeting
- **Animate Reset**: Enables shrink animation when food resets
- **Animate Spawn**: Enables grow animation when food appears
- **Base Color**: Customize the primary color of the food item

### Reset Behavior

- **Reset Duration** (`resetDuration`): Time in milliseconds for the reset animation (default: 800ms)
- When food is nearly consumed (< 15 pixels remaining), remaining pieces automatically explode into crumbs
- After explosion, the food automatically resets to its original state

## Food Item Configuration

Each food item is defined with:

- **SVG Path**: The shape of the food item
- **ViewBox**: SVG coordinate system
- **Center Point** (`cx`, `cy`): Center coordinates for bite calculations
- **Max Radius** (`maxR`): Visual boundary radius
- **Colors**: Base, shadow, highlight, and crumb color palette
- **Decorations**: Optional SVG decorations (e.g., chocolate chips, sprinkles)

## JSON Export

The configuration panel includes a "Show JSON" button that exports the current item configuration including all merged settings. This can be used to:

- Save custom configurations
- Share settings with others
- Programmatically configure items

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)

