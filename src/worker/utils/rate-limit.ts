import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import { rateLimits } from '../db/schema';
import { nowUtc } from './time';
import { ulid } from './ulid';

export async function checkRateLimit(
  db: Database,
  key: string,
  maxAttempts: number,
  windowSeconds: number,
  kv?: KVNamespace
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const now = nowUtc();

  // Optional Workers KV counter fast-path when a KV namespace is bound
  if (kv) {
    try {
      const kvKey = `rl:${key}`;
      const raw = await kv.get<{ count: number; resetAt: number }>(kvKey, 'json');
      if (!raw || raw.resetAt <= now) {
        const resetAt = now + windowSeconds;
        await kv.put(kvKey, JSON.stringify({ count: 1, resetAt }), { expirationTtl: Math.max(60, windowSeconds) });
        return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: windowSeconds };
      }
      if (raw.count >= maxAttempts) {
        return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, raw.resetAt - now) };
      }
      const nextCount = raw.count + 1;
      await kv.put(kvKey, JSON.stringify({ count: nextCount, resetAt: raw.resetAt }), {
        expirationTtl: Math.max(60, raw.resetAt - now),
      });
      return {
        allowed: true,
        remaining: maxAttempts - nextCount,
        retryAfterSeconds: Math.max(1, raw.resetAt - now),
      };
    } catch {
      // Fallback safely to strongly consistent D1 rate limiter below
    }
  }

  const existing = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .get();

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSeconds;
    await db
      .insert(rateLimits)
      .values({
        id: ulid(),
        key,
        count: 1,
        resetAt,
      })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: 1, resetAt },
      });

    return {
      allowed: true,
      remaining: maxAttempts - 1,
      retryAfterSeconds: windowSeconds,
    };
  }

  if (existing.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, existing.resetAt - now),
    };
  }

  const newCount = existing.count + 1;
  await db
    .update(rateLimits)
    .set({ count: newCount })
    .where(eq(rateLimits.key, key));

  return {
    allowed: true,
    remaining: maxAttempts - newCount,
    retryAfterSeconds: Math.max(1, existing.resetAt - now),
  };
}
