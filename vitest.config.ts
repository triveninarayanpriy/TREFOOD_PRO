import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';

export default defineWorkersConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
      },
    },
  },
  resolve: {
    alias: {
      '@client': path.resolve(__dirname, './src/client'),
      '@worker': path.resolve(__dirname, './src/worker'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
});
