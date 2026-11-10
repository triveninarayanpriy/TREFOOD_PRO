import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';
import type { Database } from '../db';
import { ulid } from '../utils/ulid';
import {
  getSessionCookieName,
  getSessionTokenFromCookie,
  validateSession,
  type AuthenticatedUser,
} from '../auth/session';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
    db: Database;
    user?: AuthenticatedUser;
    sessionToken?: string;
  }
}

// 1. Request ID Middleware
export const requestIdMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const reqId = c.req.header('x-request-id') || ulid();
  c.set('requestId', reqId);
  await next();
  c.header('x-request-id', reqId);
});

// 2. Security Headers & Strict CSP Middleware
export const securityHeadersMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  await next();
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; connect-src 'self' https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com; frame-ancestors 'none';"
  );
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
});

// 3. Same-Origin Check on Mutating Requests
export const sameOriginMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const origin = c.req.header('origin');
    const host = c.req.header('host');

    // If Origin is present, verify against Host
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
          return c.json(
            { error: { code: 'CSRF_VIOLATION', message: 'Cross-site mutating requests forbidden' } },
            403
          );
        }
      } catch {
        return c.json(
          { error: { code: 'INVALID_ORIGIN', message: 'Malformed Origin header' } },
          403
        );
      }
    }
  }
  await next();
});

// 4. Session Authentication Middleware (Attaches user to context if session valid)
export const sessionAuthMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const cookieHeader = c.req.header('cookie');
  const cookieName = getSessionCookieName(c.req.url);
  const token = getSessionTokenFromCookie(cookieHeader, cookieName);

  if (token) {
    const db = c.get('db');
    if (db) {
      try {
        const user = await validateSession(db, token, c.env.SESSION_KV);
        if (user) {
          c.set('user', user);
          c.set('sessionToken', token);
        }
      } catch (err) {
        console.error('Session validation error:', err);
      }
    }
  }

  await next();
});

// 5. Require Authentication Guard
export const requireAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Sign in is required to perform this action.' } },
      401
    );
  }
  await next();
});

// 6. Role Guard (student | vendor | admin)
export function requireRole(...allowedRoles: Array<'student' | 'vendor' | 'admin'>) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Sign in is required.' } },
        401
      );
    }
    if (!allowedRoles.includes(user.role)) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' } },
        403
      );
    }
    await next();
  });
}
