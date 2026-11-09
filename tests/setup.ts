import { applyD1Migrations, env } from 'cloudflare:test';
import type { D1Migration } from '@cloudflare/vitest-pool-workers/config';

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database;
    DEMO_MODE: string;
    ALLOWED_EMAIL_DOMAINS: string;
    TIMEZONE: string;
    TEST_MIGRATIONS: D1Migration[];
    TEST_SEED_SQL: string;
  }
}

// 1. Apply D1 migrations to local test database instance
if (env.TEST_MIGRATIONS) {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
}

// 2. Apply seed data if provided
if (env.TEST_SEED_SQL) {
  const statements = env.TEST_SEED_SQL
    .split(';')
    .map((s) =>
      s
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await env.DB.prepare(stmt).run();
    } catch (err) {
      console.error('Error executing seed statement:', stmt, err);
      throw err;
    }
  }
}
