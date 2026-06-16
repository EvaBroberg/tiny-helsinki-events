import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone static web build (GitHub Pages). The Electron build uses
// electron.vite.config.ts instead; unit tests use vitest.config.ts.
//
// `base` must match the GitHub Pages sub-path (https://<user>.github.io/<repo>/).
// Override with VITE_BASE for a custom domain / different repo name.
export default defineConfig({
  root: resolve(__dirname, 'src/web'),
  base: process.env.VITE_BASE ?? '/tiny-helsinki-events/',
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
