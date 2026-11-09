import { Hono } from 'hono';
import type { Env } from './types';
import type { HealthResponse } from '@shared/types';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', async (c) => {
  let dbHealthy = false;
  try {
    if (c.env.DB) {
      const result = await c.env.DB.prepare('SELECT 1 as alive').first<{ alive: number }>();
      dbHealthy = result?.alive === 1;
    }
  } catch (err) {
    console.error('Health check DB error:', err);
    dbHealthy = false;
  }

  const response: HealthResponse = {
    ok: dbHealthy,
    version: c.env.APP_VERSION || '0.1.0',
    commit: c.env.GIT_COMMIT || '0ba74a9',
    db: dbHealthy,
  };

  return c.json(response, dbHealthy ? 200 : 503);
});

// Fallback to static assets if routed through worker
app.all('*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.notFound();
});

export default app;
