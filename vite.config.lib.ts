import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      tsconfigPath: path.resolve(__dirname, './tsconfig.json'),
      include: [
        'lib/**/*',
        'components/**/*',
        'hooks/**/*',
        'utils/**/*',
        'types.ts'
      ],
      exclude: [
        'App.tsx',
        'index.tsx',
        'data/**/*',
        'ref/**/*',
        'vite.config.ts',
        'vite.config.lib.ts',
        'components/AnimationsDemo.tsx',
        'components/Controls.tsx',
        'components/Cookie.tsx',
        'components/FoodSelector.tsx',
        'components/ColorDominanceControl.tsx',
        'utils/audio.ts',
        '**/*.test.*',
        '**/*.spec.*'
      ],
    }),
  ],
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'lib/index.ts'),
      name: 'SnackStudioYumYum',
      fileName: (format) => `snackstudio-yumyum.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
  },
});
