import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@store': path.resolve(__dirname, 'src/store'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
