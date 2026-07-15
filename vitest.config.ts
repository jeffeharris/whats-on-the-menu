import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Server integration tests run against a real (throwaway) Postgres.
    include: ['server/**/*.test.ts'],
    environment: 'node',
    globals: true,
    setupFiles: ['server/__tests__/setup.ts'],
    // Integration tests share a database; run files serially to avoid cross-talk.
    fileParallelism: false,
    hookTimeout: 20000,
    testTimeout: 20000,
  },
});
