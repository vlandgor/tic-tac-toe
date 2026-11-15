/// <reference types="vitest" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// base './' so the build works from any path (artifact hosting, subfolders, file://)
export default defineConfig({
  base: './',
  plugins: [preact()],
  worker: { format: 'es' },
  build: { target: 'es2020', assetsInlineLimit: 0 },
  test: { environment: 'node' },
});
