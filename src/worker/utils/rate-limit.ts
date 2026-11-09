import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import { rateLimits } from '../db/schema';
import { nowUtc } from './time';
import { ulid } from './ulid';

export async function checkRateLimit(
  db: Database,
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const now = nowUtc();

  const existing = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .get();

  if (!existing || existing.resetAt <= now) {
    // New or expired window
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

  // Increment within active window
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
