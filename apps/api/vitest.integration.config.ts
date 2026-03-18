import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['../../tests/api/**/*.integration.test.ts'],
    testTimeout: 30_000,
  },
});
