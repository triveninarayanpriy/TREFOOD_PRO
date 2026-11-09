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
  userId: string
): Promise<{ token: string; expiresAt: number }> {
  const token = generateRandomToken(32);
  const tokenHash = await sha256(token);
  const now = nowUtc();
  const expiresAt = now + SESSION_DURATION_SECONDS;

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
  token: string
): Promise<AuthenticatedUser | null> {
  const tokenHash = await sha256(token);
  const now = nowUtc();

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
      // Clean up expired session
      await db.delete(sessions).where(eq(sessions.id, result.session.id));
    }
    return null;
  }

  // Sliding session: extend expiry if more than 1 day has elapsed
  if (result.session.expiresAt - now < SESSION_DURATION_SECONDS - 86400) {
    await db
      .update(sessions)
      .set({ expiresAt: now + SESSION_DURATION_SECONDS })
      .where(eq(sessions.id, result.session.id));
  }

  return {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: result.user.role as 'student' | 'vendor' | 'admin',
    campusId: result.user.campusId,
    vendorId: result.user.vendorId,
  };
}

export async function destroySession(db: Database, token: string): Promise<void> {
  const tokenHash = await sha256(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}
