import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Exclude the Playwright E2E spec (run via `npm run test:e2e`, not Vitest).
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Next provides this marker at build time. Service tests run outside its bundler.
      'server-only': path.resolve(__dirname, './tests/server-only.ts'),
    },
  },
});
