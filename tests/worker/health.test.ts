import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '@worker/index';

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database;
    DEMO_MODE: string;
    ALLOWED_EMAIL_DOMAINS: string;
    TIMEZONE: string;
    GIT_COMMIT?: string;
    APP_VERSION?: string;
  }
}

describe('Worker /api/health', () => {
  it('returns ok, version, commit, and db status', async () => {
    const request = new Request('http://localhost/api/health');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; version: string; commit: string; db: boolean };
    expect(body).toMatchObject({
      ok: true,
      version: expect.any(String),
      commit: expect.any(String),
      db: true,
    });
  });

  it('directly executes SELECT 1 on D1 binding', async () => {
    const result = await env.DB.prepare('SELECT 1 as alive').first<{ alive: number }>();
    expect(result?.alive).toBe(1);
  });
});
