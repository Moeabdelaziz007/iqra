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
    testTimeout: 120000,     // 120s — mission loop needs more time
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
      '@': '/Applications/iqra/src',
      '#core': '/Applications/iqra/lib/iqra/01-core',
      '#workers': '/Applications/iqra/lib/iqra/02-workers',
      '#memory': '/Applications/iqra/lib/iqra/03-memory',
      '#quran': '/Applications/iqra/lib/iqra/04-quran',
      '#rewards': '/Applications/iqra/lib/iqra/05-rewards',
      '#security': '/Applications/iqra/lib/iqra/06-security',
      '#llm': '/Applications/iqra/lib/iqra/07-llm',
      '#skills': '/Applications/iqra/lib/iqra/08-skills',
      '#evolution': '/Applications/iqra/lib/iqra/09-evolution',
      '#topology': '/Applications/iqra/lib/iqra/10-topology',
      '#trading': '/Applications/iqra/lib/iqra/11-trading',
      '#infra': '/Applications/iqra/lib/iqra/12-infrastructure',
      '#utils': '/Applications/iqra/lib/iqra/13-utils'
    },
  },
});
