import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@store': path.resolve(__dirname, 'src/store'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome130',
    assetsInlineLimit: 16384,
    cssCodeSplit: false,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
