import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { Env } from '../types';
import { users, otpCodes } from '../db/schema';
import { generate6DigitOtp, generateRandomToken, sha256, timingSafeEqual } from '../utils/crypto';
import { nowUtc } from '../utils/time';
import { ulid } from '../utils/ulid';
import { checkRateLimit } from '../utils/rate-limit';
import { DemoMailer } from '../auth/mailer';
import { verifyTurnstileToken } from '../auth/turnstile';
import {
  createSession,
  destroySession,
  destroyAllUserSessions,
  getSessionCookieName,
  buildSetCookieHeader,
  buildClearCookieHeader,
} from '../auth/session';
import {
  RequestOtpSchema,
  VerifyOtpSchema,
  MockGoogleLoginSchema,
} from '@shared/schemas';

const OTP_EXPIRY_SECONDS = 600; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;
const OTP_PEPPER = 'trefood-campus-otp-pepper-2026';

function sanitizeReturnTo(raw?: string | null): string {
  if (!raw) return '/';
  const trimmed = raw.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('://')) {
    return trimmed;
  }
  return '/';
}

function getAllowedDomains(env: Env): string[] {
  return (env.ALLOWED_EMAIL_DOMAINS || 'nitp.ac.in')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

async function findOrCreateStudent(
  db: ReturnType<typeof import('../db').getDb>,
  email: string,
  displayName?: string
) {
  let user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user) {
    const userId = ulid();
    const studentName = displayName?.trim() || email.split('@')[0].replace(/[._]/g, ' ');
    await db.insert(users).values({
      id: userId,
      email,
      name: studentName,
      role: 'student',
      campusId: 'campus_nitp',
      createdAt: nowUtc(),
    });
    user = await db.select().from(users).where(eq(users.id, userId)).get();
  }
  return user;
}

export const authRoutes = new Hono<{ Bindings: Env }>();

// GET /api/auth/providers (Feature flags & OAuth availability for /signin)
authRoutes.get('/providers', (c) => {
  const isDemoMode = c.env.DEMO_MODE !== 'false';
  const googleOAuthEnabled = Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET);
  const turnstileEnabled = c.env.TURNSTILE_ENABLED === 'true';

  return c.json({
    ok: true,
    demoMode: isDemoMode,
    googleOAuthEnabled,
    mockGoogleEnabled: !googleOAuthEnabled || isDemoMode,
    turnstileEnabled,
    turnstileSiteKey: turnstileEnabled ? c.env.TURNSTILE_SITE_KEY || null : null,
  });
});

// POST /api/auth/otp/request
authRoutes.post('/otp/request', async (c) => {
  const db = c.get('db');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = RequestOtpSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parseResult.error.errors[0]?.message || 'Invalid input' } },
      400
    );
  }

  const { email, turnstileToken } = parseResult.data;
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';

  const turnstileResult = await verifyTurnstileToken({
    enabled: c.env.TURNSTILE_ENABLED,
    secretKey: c.env.TURNSTILE_SECRET_KEY,
    token: turnstileToken,
    remoteIp: clientIp,
  });
  if (!turnstileResult.ok) {
    return c.json(
      {
        error: {
          code: 'TURNSTILE_FAILED',
          message: 'Human verification failed. Please complete the Turnstile check.',
          details: turnstileResult.errorCodes,
        },
      },
      403
    );
  }

  // Rate limit by IP (max 10 requests per 10 minutes)
  const ipLimit = await checkRateLimit(db, `otp_ip:${clientIp}`, 10, 600, c.env.RATE_LIMIT_KV);
  if (!ipLimit.allowed) {
    return c.json(
      { error: { code: 'RATE_LIMIT_EXCEEDED', message: `Too many requests from this IP. Retry in ${ipLimit.retryAfterSeconds}s.` } },
      429
    );
  }

  // Rate limit by email (max 3 requests per 10 minutes)
  const emailLimit = await checkRateLimit(db, `otp_email:${email}`, 3, 600, c.env.RATE_LIMIT_KV);
  if (!emailLimit.allowed) {
    return c.json(
      { error: { code: 'RATE_LIMIT_EXCEEDED', message: `Too many OTP requests for this email. Retry in ${emailLimit.retryAfterSeconds}s.` } },
      429
    );
  }

  // Check if existing user, or student domain allowed
  const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
  const allowedDomains = getAllowedDomains(c.env);
  const emailDomain = email.split('@')[1]?.toLowerCase();
  const isAllowedDomain = emailDomain ? allowedDomains.includes(emailDomain) : false;

  if (!existingUser && !isAllowedDomain) {
    return c.json(
      {
        error: {
          code: 'DOMAIN_NOT_ALLOWED',
          message: `Only campus email addresses (@${allowedDomains.join(', @')}) are allowed for new registrations.`,
        },
      },
      403
    );
  }

  // Generate 6-digit OTP & store hash
  const otp = generate6DigitOtp();
  const codeHash = await sha256(`${otp}:${OTP_PEPPER}`);
  const now = nowUtc();
  const expiresAt = now + OTP_EXPIRY_SECONDS;

  await db.delete(otpCodes).where(eq(otpCodes.email, email));
  await db.insert(otpCodes).values({
    id: ulid(),
    email,
    codeHash,
    expiresAt,
    attempts: 0,
    createdAt: now,
  });

  const isDemoMode = c.env.DEMO_MODE !== 'false';
  const mailer = new DemoMailer(isDemoMode);
  const sendResult = await mailer.sendOtp(email, otp);

  return c.json({
    ok: true,
    message: `OTP sent to ${email}`,
    expiresInSeconds: OTP_EXPIRY_SECONDS,
    previewCode: sendResult.previewCode,
  });
});

// POST /api/auth/otp/verify
authRoutes.post('/otp/verify', async (c) => {
  const db = c.get('db');
  const body = await c.req.json().catch(() => ({}));
  const parseResult = VerifyOtpSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parseResult.error.errors[0]?.message || 'Invalid input' } },
      400
    );
  }

  const { email, code, turnstileToken } = parseResult.data;
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const turnstileResult = await verifyTurnstileToken({
    enabled: c.env.TURNSTILE_ENABLED,
    secretKey: c.env.TURNSTILE_SECRET_KEY,
    token: turnstileToken,
    remoteIp: clientIp,
  });
  if (!turnstileResult.ok) {
    return c.json(
      {
        error: {
          code: 'TURNSTILE_FAILED',
          message: 'Human verification failed. Please retry Turnstile.',
        },
      },
      403
    );
  }

  const now = nowUtc();
  const activeOtp = await db.select().from(otpCodes).where(eq(otpCodes.email, email)).get();

  if (!activeOtp || activeOtp.expiresAt <= now) {
    return c.json(
      { error: { code: 'OTP_EXPIRED', message: 'OTP has expired or does not exist. Please request a new one.' } },
      400
    );
  }

  if (activeOtp.attempts >= MAX_OTP_ATTEMPTS) {
    await db.delete(otpCodes).where(eq(otpCodes.id, activeOtp.id));
    return c.json(
      { error: { code: 'MAX_ATTEMPTS_EXCEEDED', message: 'Too many incorrect attempts. Please request a new OTP.' } },
      400
    );
  }

  const inputHash = await sha256(`${code}:${OTP_PEPPER}`);
  const matches = timingSafeEqual(inputHash, activeOtp.codeHash);

  if (!matches) {
    const updatedAttempts = activeOtp.attempts + 1;
    await db.update(otpCodes).set({ attempts: updatedAttempts }).where(eq(otpCodes.id, activeOtp.id));
    return c.json(
      {
        error: {
          code: 'INVALID_OTP',
          message: `Incorrect OTP. ${MAX_OTP_ATTEMPTS - updatedAttempts} attempt(s) remaining.`,
        },
      },
      400
    );
  }

  await db.delete(otpCodes).where(eq(otpCodes.id, activeOtp.id));

  const user = await findOrCreateStudent(db, email);
  if (!user) {
    return c.json({ error: { code: 'USER_CREATION_FAILED', message: 'Could not create user.' } }, 500);
  }

  const { token } = await createSession(db, user.id, c.env.SESSION_KV, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'student' | 'vendor' | 'admin',
    campusId: user.campusId,
    vendorId: user.vendorId,
  });
  const cookieName = getSessionCookieName(c.req.url);
  c.header('Set-Cookie', buildSetCookieHeader(cookieName, token));

  return c.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      campusId: user.campusId,
      vendorId: user.vendorId,
    },
  });
});

// POST /api/auth/google/mock (Mock Google account chooser when real OAuth client secrets are absent or DEMO_MODE=true)
authRoutes.post('/google/mock', async (c) => {
  const isDemoMode = c.env.DEMO_MODE !== 'false';
  const hasRealGoogle = Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET);
  if (hasRealGoogle && !isDemoMode) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Mock Google chooser is disabled in live OAuth mode' } }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = MockGoogleLoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: parsed.error.errors[0]?.message || 'Invalid Google profile' } },
      400
    );
  }

  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const turnstileResult = await verifyTurnstileToken({
    enabled: c.env.TURNSTILE_ENABLED,
    secretKey: c.env.TURNSTILE_SECRET_KEY,
    token: parsed.data.turnstileToken,
    remoteIp: clientIp,
  });
  if (!turnstileResult.ok) {
    return c.json({ error: { code: 'TURNSTILE_FAILED', message: 'Turnstile check failed.' } }, 403);
  }

  const db = c.get('db');
  const existing = await db.select().from(users).where(eq(users.email, parsed.data.email)).get();
  const allowedDomains = getAllowedDomains(c.env);
  const emailDomain = parsed.data.email.split('@')[1]?.toLowerCase();

  if (!existing && (!emailDomain || !allowedDomains.includes(emailDomain))) {
    return c.json(
      {
        error: {
          code: 'DOMAIN_NOT_ALLOWED',
          message: `Google account must belong to @${allowedDomains.join(', @')}.`,
        },
      },
      403
    );
  }

  const user = await findOrCreateStudent(db, parsed.data.email, parsed.data.name);
  if (!user) {
    return c.json({ error: { code: 'USER_CREATION_FAILED', message: 'Could not sign in user.' } }, 500);
  }

  const { token } = await createSession(db, user.id, c.env.SESSION_KV, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'student' | 'vendor' | 'admin',
    campusId: user.campusId,
    vendorId: user.vendorId,
  });
  const cookieName = getSessionCookieName(c.req.url);
  c.header('Set-Cookie', buildSetCookieHeader(cookieName, token));

  return c.json({
    ok: true,
    provider: 'google_mock',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      campusId: user.campusId,
      vendorId: user.vendorId,
    },
  });
});

// GET /api/auth/google/start (Real Google OAuth 2.0 when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are supplied)
authRoutes.get('/google/start', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return c.redirect('/signin?google=mock', 302);
  }

  const returnTo = sanitizeReturnTo(c.req.query('returnTo'));
  const state = generateRandomToken(16);

  if (c.env.SESSION_KV) {
    await c.env.SESSION_KV.put(`oauth_state:${state}`, JSON.stringify({ returnTo }), {
      expirationTtl: 600,
    });
  }

  const url = new URL(c.req.url);
  const redirectUri = c.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302);
});

// GET /api/auth/google/callback
authRoutes.get('/google/callback', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return c.redirect('/signin?error=oauth_not_configured', 302);
  }

  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state) {
    return c.redirect('/signin?error=oauth_missing_params', 302);
  }

  let returnTo = '/';
  if (c.env.SESSION_KV) {
    const saved = await c.env.SESSION_KV.get<{ returnTo?: string }>(`oauth_state:${state}`, 'json');
    if (!saved) {
      return c.redirect('/signin?error=oauth_invalid_state', 302);
    }
    await c.env.SESSION_KV.delete(`oauth_state:${state}`);
    returnTo = sanitizeReturnTo(saved.returnTo);
  }

  const reqUrl = new URL(c.req.url);
  const redirectUri = c.env.GOOGLE_REDIRECT_URI || `${reqUrl.origin}/api/auth/google/callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    return c.redirect('/signin?error=oauth_token_exchange_failed', 302);
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return c.redirect('/signin?error=oauth_no_token', 302);
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!profileRes.ok) {
    return c.redirect('/signin?error=oauth_profile_failed', 302);
  }

  const profile = (await profileRes.json()) as { email?: string; name?: string; email_verified?: boolean };
  const email = profile.email?.trim().toLowerCase();
  if (!email || !profile.email_verified) {
    return c.redirect('/signin?error=oauth_unverified_email', 302);
  }

  const db = c.get('db');
  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  const allowedDomains = getAllowedDomains(c.env);
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!existing && (!emailDomain || !allowedDomains.includes(emailDomain))) {
    return c.redirect('/signin?error=domain_not_allowed', 302);
  }

  const user = await findOrCreateStudent(db, email, profile.name);
  if (!user) {
    return c.redirect('/signin?error=user_creation_failed', 302);
  }

  const { token } = await createSession(db, user.id, c.env.SESSION_KV, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'student' | 'vendor' | 'admin',
    campusId: user.campusId,
    vendorId: user.vendorId,
  });
  const cookieName = getSessionCookieName(c.req.url);
  c.header('Set-Cookie', buildSetCookieHeader(cookieName, token));

  return c.redirect(returnTo, 302);
});

// POST /api/auth/demo/:role (One-tap demo accounts when DEMO_MODE=true)
authRoutes.post('/demo/:role', async (c) => {
  const isDemoMode = c.env.DEMO_MODE !== 'false';
  if (!isDemoMode) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Demo mode is disabled' } }, 404);
  }

  const role = c.req.param('role');
  if (!['student', 'vendor', 'admin'].includes(role)) {
    return c.json({ error: { code: 'INVALID_ROLE', message: 'Role must be student, vendor, or admin' } }, 400);
  }

  const db = c.get('db');
  const demoEmail = `${role}@demo.trefood.test`;

  const user = await db.select().from(users).where(eq(users.email, demoEmail)).get();
  if (!user) {
    return c.json({ error: { code: 'DEMO_USER_NOT_SEEDED', message: `Demo user ${demoEmail} not found in database.` } }, 404);
  }

  const { token } = await createSession(db, user.id, c.env.SESSION_KV, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'student' | 'vendor' | 'admin',
    campusId: user.campusId,
    vendorId: user.vendorId,
  });
  const cookieName = getSessionCookieName(c.req.url);
  c.header('Set-Cookie', buildSetCookieHeader(cookieName, token));

  return c.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      campusId: user.campusId,
      vendorId: user.vendorId,
    },
  });
});

// GET /api/auth/me
authRoutes.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ ok: false, user: null });
  }
  return c.json({ ok: true, user });
});

// POST /api/auth/logout
authRoutes.post('/logout', async (c) => {
  const db = c.get('db');
  const sessionToken = c.get('sessionToken');
  if (sessionToken && db) {
    await destroySession(db, sessionToken, c.env.SESSION_KV);
  }

  const cookieName = getSessionCookieName(c.req.url);
  c.header('Set-Cookie', buildClearCookieHeader(cookieName));

  return c.json({ ok: true, message: 'Signed out successfully' });
});

// DELETE /api/auth/delete-account (Privacy compliance: delete-my-data)
authRoutes.delete('/delete-account', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to delete your data' } }, 401);
  }

  const db = c.get('db');
  await destroyAllUserSessions(db, user.id, c.env.SESSION_KV);

  await db
    .update(users)
    .set({
      email: `deleted_${user.id.slice(0, 8)}@privacy.trefood.local`,
      name: 'Deleted Student',
    })
    .where(eq(users.id, user.id));

  const cookieName = getSessionCookieName(c.req.url);
  c.header('Set-Cookie', buildClearCookieHeader(cookieName));

  return c.json({ ok: true, message: 'Your account and personal data have been removed.' });
});
