import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/__mocks__/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      'typebox': resolve(rootDir, 'node_modules/@sinclair/typebox'),
      '@earendil-works/pi-coding-agent': resolve(rootDir, 'tests/__mocks__/@earendil-works/pi-coding-agent.ts'),
      '@earendil-works/pi-ai': resolve(rootDir, 'tests/__mocks__/@earendil-works/pi-ai.ts'),
    },
  },
});
