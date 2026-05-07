/**
 * IQRA Vitest Configuration
 * "وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ" — الإسراء: 36
 * No mocks. No lies. Real tests only.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,      // 60s — LLM calls need time
    hookTimeout: 30000,
    reporters: ['verbose'],
    include: ['tests/**/*.test.ts', 'tests/**/*.e2e.ts'],
    setupFiles: ['tests/setup.ts'],
    sequence: {
      sequential: true,      // Run one at a time — no race conditions
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
