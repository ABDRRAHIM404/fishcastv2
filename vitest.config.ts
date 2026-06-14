import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Vitest config for the deterministic scoring engine (and future pure-logic
 * tests). Uses vite-tsconfig-paths so the @/* alias resolves the same as the
 * app. Tests live next to the code under src/**/__tests__ or *.test.ts.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
