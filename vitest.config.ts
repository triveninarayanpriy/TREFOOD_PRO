import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';
import fs from 'node:fs';

export default defineWorkersConfig(async () => {
  const migrationsPath = path.join(__dirname, 'migrations');
  const migrations = await readD1Migrations(migrationsPath);
  const seedSql = fs.readFileSync(path.join(__dirname, 'scripts', 'seed.sql'), 'utf-8');

  return {
    test: {
      include: ['tests/**/*.test.ts'],
      setupFiles: ['./tests/setup.ts'],
      poolOptions: {
        workers: {
          wrangler: { configPath: './wrangler.jsonc' },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              TEST_SEED_SQL: seedSql,
            },
          },
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
  };
});
