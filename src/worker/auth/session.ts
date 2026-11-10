import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import { sessions, users } from '../db/schema';
import { generateRandomToken, sha256 } from '../utils/crypto';
import { nowUtc } from '../utils/time';
import { ulid } from '../utils/ulid';

export const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'vendor' | 'admin';
  campusId: string;
  vendorId?: string | null;
}

interface KvSessionPayload {
  user: AuthenticatedUser;
  expiresAt: number;
}

const KV_KEY_PREFIX = 'sess:';

export function getSessionCookieName(requestUrl: string): string {
  try {
    const url = new URL(requestUrl);
    return url.protocol === 'https:' ? '__Host-session' : 'session';
  } catch {
    return 'session';
  }
}

export function getSessionTokenFromCookie(cookieHeader: string | null | undefined, cookieName: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${cookieName}=`));
  return match ? match.slice(cookieName.length + 1) : null;
}

export function buildSetCookieHeader(
  cookieName: string,
  token: string,
  maxAgeSeconds = SESSION_DURATION_SECONDS
): string {
  const parts = [
    `${cookieName}=${token}`,
    `Path=/`,
    `Max-Age=${maxAgeSeconds}`,
    `HttpOnly`,
    `SameSite=Lax`,
  ];
  if (cookieName.startsWith('__Host-')) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildClearCookieHeader(cookieName: string): string {
  const parts = [
    `${cookieName}=`,
    `Path=/`,
    `Max-Age=0`,
    `HttpOnly`,
    `SameSite=Lax`,
  ];
  if (cookieName.startsWith('__Host-')) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export async function createSession(
  db: Database,
  userId: string,
  sessionKV?: KVNamespace,
  knownUser?: AuthenticatedUser
): Promise<{ token: string; expiresAt: number }> {
  const token = generateRandomToken(32);
  const tokenHash = await sha256(token);
  const now = nowUtc();
  const expiresAt = now + SESSION_DURATION_SECONDS;

  let authUser = knownUser;
  if (!authUser) {
    const dbUser = await db.select().from(users).where(eq(users.id, userId)).get();
    if (dbUser) {
      authUser = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role as 'student' | 'vendor' | 'admin',
        campusId: dbUser.campusId,
        vendorId: dbUser.vendorId,
      };
    }
  }

  if (sessionKV && authUser) {
    const payload: KvSessionPayload = { user: authUser, expiresAt };
    await sessionKV.put(`${KV_KEY_PREFIX}${tokenHash}`, JSON.stringify(payload), {
      expirationTtl: SESSION_DURATION_SECONDS,
    });
  }

  await db.insert(sessions).values({
    id: ulid(),
    tokenHash,
    userId,
    expiresAt,
    createdAt: now,
  });

  return { token, expiresAt };
}

export async function validateSession(
  db: Database,
  token: string,
  sessionKV?: KVNamespace
): Promise<AuthenticatedUser | null> {
  const tokenHash = await sha256(token);
  const now = nowUtc();

  // Fast path: Cloudflare Workers KV session store
  if (sessionKV) {
    const kvRecord = await sessionKV.get<KvSessionPayload>(`${KV_KEY_PREFIX}${tokenHash}`, 'json');
    if (kvRecord) {
      if (kvRecord.expiresAt <= now) {
        await sessionKV.delete(`${KV_KEY_PREFIX}${tokenHash}`);
        await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
        return null;
      }

      // Refresh sliding KV TTL if more than 1 day elapsed
      if (kvRecord.expiresAt - now < SESSION_DURATION_SECONDS - 86400) {
        const nextExpiry = now + SESSION_DURATION_SECONDS;
        await sessionKV.put(
          `${KV_KEY_PREFIX}${tokenHash}`,
          JSON.stringify({ user: kvRecord.user, expiresAt: nextExpiry }),
          { expirationTtl: SESSION_DURATION_SECONDS }
        );
      }

      return kvRecord.user;
    }
  }

  // Fallback & backfill from D1
  const result = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .get();

  if (!result || result.session.expiresAt <= now) {
    if (result) {
      await db.delete(sessions).where(eq(sessions.id, result.session.id));
    }
    return null;
  }

  const authUser: AuthenticatedUser = {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: result.user.role as 'student' | 'vendor' | 'admin',
    campusId: result.user.campusId,
    vendorId: result.user.vendorId,
  };

  let nextExpiry = result.session.expiresAt;
  if (result.session.expiresAt - now < SESSION_DURATION_SECONDS - 86400) {
    nextExpiry = now + SESSION_DURATION_SECONDS;
    await db
      .update(sessions)
      .set({ expiresAt: nextExpiry })
      .where(eq(sessions.id, result.session.id));
  }

  if (sessionKV) {
    const remainingTtl = Math.max(60, nextExpiry - now);
    await sessionKV.put(
      `${KV_KEY_PREFIX}${tokenHash}`,
      JSON.stringify({ user: authUser, expiresAt: nextExpiry }),
      { expirationTtl: remainingTtl }
    );
  }

  return authUser;
}

export async function destroySession(
  db: Database,
  token: string,
  sessionKV?: KVNamespace
): Promise<void> {
  const tokenHash = await sha256(token);
  if (sessionKV) {
    await sessionKV.delete(`${KV_KEY_PREFIX}${tokenHash}`);
  }
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export async function destroyAllUserSessions(
  db: Database,
  userId: string,
  sessionKV?: KVNamespace
): Promise<void> {
  if (sessionKV) {
    const existing = await db
      .select({ tokenHash: sessions.tokenHash })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .all();
    await Promise.all(existing.map((s) => sessionKV.delete(`${KV_KEY_PREFIX}${s.tokenHash}`)));
  }
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
