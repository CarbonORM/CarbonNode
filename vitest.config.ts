import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    include: ['src/__tests__/**/*.test.ts'],
    environment: 'node',
    coverage: {
      enabled: false,
    },
  },
});

