import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 120000,
    hookTimeout: 30000,
    reporters: ['verbose'],
    include: ['tests/**/*.test.ts', 'tests/**/*.e2e.ts'],
    setupFiles: ['tests/setup.ts'],
    sequence: {
      sequential: true,
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '#core': resolve(__dirname, 'lib/iqra/01-core'),
      '#workers': resolve(__dirname, 'lib/iqra/02-workers'),
      '#memory': resolve(__dirname, 'lib/iqra/03-memory'),
      '#quran': resolve(__dirname, 'lib/iqra/04-quran'),
      '#rewards': resolve(__dirname, 'lib/iqra/05-rewards'),
      '#security': resolve(__dirname, 'lib/iqra/06-security'),
      '#llm': resolve(__dirname, 'lib/iqra/07-llm'),
      '#skills': resolve(__dirname, 'lib/iqra/08-skills'),
      '#evolution': resolve(__dirname, 'lib/iqra/09-evolution'),
      '#topology': resolve(__dirname, 'lib/iqra/10-topology'),
      '#trading': resolve(__dirname, 'lib/iqra/11-trading'),
      '#infra': resolve(__dirname, 'lib/iqra/12-infrastructure'),
      '#utils': resolve(__dirname, 'lib/iqra/13-utils'),
    },
  },
});
