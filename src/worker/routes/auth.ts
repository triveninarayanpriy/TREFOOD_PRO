import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { Env } from '../types';
import { users, otpCodes } from '../db/schema';
import { generate6DigitOtp, sha256, timingSafeEqual } from '../utils/crypto';
import { nowUtc } from '../utils/time';
import { ulid } from '../utils/ulid';
import { checkRateLimit } from '../utils/rate-limit';
import { DemoMailer } from '../auth/mailer';
import {
  createSession,
  destroySession,
  getSessionCookieName,
  buildSetCookieHeader,
  buildClearCookieHeader,
} from '../auth/session';
import { RequestOtpSchema, VerifyOtpSchema } from '@shared/schemas';

const OTP_EXPIRY_SECONDS = 600; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;
const OTP_PEPPER = 'trefood-campus-otp-pepper-2026';

export const authRoutes = new Hono<{ Bindings: Env }>();

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

  const { email } = parseResult.data;
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';

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

  const allowedDomains = (c.env.ALLOWED_EMAIL_DOMAINS || 'nitp.ac.in')
    .split(',')
    .map((d) => d.trim().toLowerCase());

  const emailDomain = email.split('@')[1]?.toLowerCase();
  const isAllowedDomain = allowedDomains.includes(emailDomain);

  // If user does not exist, they must be from the allowed domain to sign up as a student
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

  // Clean old active OTPs for this email
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
    previewCode: sendResult.previewCode, // Only returned in DEMO_MODE
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

  const { email, code } = parseResult.data;
  const now = nowUtc();

  const activeOtp = await db
    .select()
    .from(otpCodes)
    .where(eq(otpCodes.email, email))
    .get();

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
    await db
      .update(otpCodes)
      .set({ attempts: updatedAttempts })
      .where(eq(otpCodes.id, activeOtp.id));

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

  // OTP verified! Delete used OTP
  await db.delete(otpCodes).where(eq(otpCodes.id, activeOtp.id));

  // Find or create student user
  let user = await db.select().from(users).where(eq(users.email, email)).get();

  if (!user) {
    const userId = ulid();
    const studentName = email.split('@')[0].replace(/[._]/g, ' ');
    await db.insert(users).values({
      id: userId,
      email,
      name: studentName,
      role: 'student',
      campusId: 'campus_nitp',
      createdAt: now,
    });
    user = await db.select().from(users).where(eq(users.id, userId)).get();
  }

  if (!user) {
    return c.json({ error: { code: 'USER_CREATION_FAILED', message: 'Could not create user.' } }, 500);
  }

  // Create session
  const { token } = await createSession(db, user.id);
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

  const { token } = await createSession(db, user.id);
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
    await destroySession(db, sessionToken);
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
  const sessionToken = c.get('sessionToken');
  if (sessionToken) {
    await destroySession(db, sessionToken);
  }

  // Anonymize user record and remove personal identifiers
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
