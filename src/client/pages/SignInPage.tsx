import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ui/Toast';
import { useSeoHead } from '../components/seo/SeoHead';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { TurnstileWidget } from '../components/auth/TurnstileWidget';
import {
  ShieldCheck,
  Sparkles,
  MailCheck,
  Store,
  ShieldAlert,
  GraduationCap,
  ArrowLeft,
} from 'lucide-react';

const MOCK_GOOGLE_ACCOUNTS = [
  { name: 'Aarav Verma', email: 'aarav.ug24@nitp.ac.in', note: 'B.Tech CSE • Hostel 5' },
  { name: 'Ananya Sharma', email: 'ananya.ug25@nitp.ac.in', note: 'B.Tech ECE • Girls Hostel' },
  { name: 'Rohan Tiwari', email: 'rohan.mtech@nitp.ac.in', note: 'M.Tech Civil • Academic Block' },
] as const;

function sanitizeReturnPath(raw: string | null): string {
  if (!raw) return '/';
  const trimmed = raw.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('://')) {
    return trimmed;
  }
  return '/';
}

const CONTEXT_REASONS: Record<string, string> = {
  checkout: 'Sign in with your campus account to place your order and receive your 4-digit gate code.',
  favorites: 'Sign in to save favourite campus canteens and quick-reorder lists.',
  orders: 'Sign in to view your live packet trackers, handover codes, and order history.',
};

export function SignInPage() {
  useSeoHead({
    title: 'Sign In | TreFood NIT Patna',
    description: 'Sign in to TreFood NIT Patna using Campus Google account, Email OTP fallback, or Demo Role Switcher.',
    path: '/signin',
    noIndex: true,
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, providers, requestOtp, verifyOtp, loginWithMockGoogle, loginAsDemo } = useAuth();
  const { resolvedTheme } = useTheme();
  const { showToast } = useToast();

  const returnTo = sanitizeReturnPath(searchParams.get('returnTo'));
  const hasExplicitReturn = Boolean(searchParams.get('returnTo'));
  const reasonKey = searchParams.get('reason') || '';
  const reasonMessage = CONTEXT_REASONS[reasonKey] || null;

  // Google mock chooser dialog
  const [googleChooserOpen, setGoogleChooserOpen] = useState(false);

  // Email OTP state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const completeRedirect = (role: 'student' | 'vendor' | 'admin') => {
    if (hasExplicitReturn && returnTo !== '/signin') {
      navigate(returnTo, { replace: true });
      return;
    }
    if (role === 'vendor') {
      navigate('/v', { replace: true });
    } else if (role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate(returnTo === '/signin' ? '/browse' : returnTo, { replace: true });
    }
  };

  const handleGoogleClick = () => {
    if (providers.googleOAuthEnabled) {
      window.location.href = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }
    setGoogleChooserOpen(true);
  };

  const handlePickMockGoogle = async (account: { email: string; name: string }) => {
    setBusy(true);
    const res = await loginWithMockGoogle(account, turnstileToken ?? undefined);
    setBusy(false);

    if (res.ok && res.user) {
      setGoogleChooserOpen(false);
      showToast(`Signed in via Google (${account.email})`, 'success');
      completeRedirect(res.user.role);
    } else {
      showToast(res.error || 'Google sign-in failed', 'error');
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    const clean = email.trim().toLowerCase();
    if (!clean.includes('@')) {
      setEmailError('Enter your campus @nitp.ac.in email address.');
      return;
    }

    setBusy(true);
    const res = await requestOtp(clean, turnstileToken ?? undefined);
    setBusy(false);

    if (res.ok) {
      setOtpSent(true);
      setDevOtpHint(res.demoCode ?? null);
      if (res.demoCode) {
        showToast(`Dev Email OTP for ${clean}: ${res.demoCode}`, 'info');
      } else {
        showToast(`OTP sent to ${clean}`, 'info');
      }
    } else {
      setEmailError(res.error || 'Could not generate OTP.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = otpCode.replace(/\D/g, '').slice(0, 6);
    if (digits.length !== 6) {
      showToast('Enter all 6 digits from your OTP.', 'warning');
      return;
    }

    setBusy(true);
    const res = await verifyOtp(email.trim().toLowerCase(), digits, turnstileToken ?? undefined);
    setBusy(false);

    if (res.ok && res.user) {
      showToast('Signed in successfully!', 'success');
      completeRedirect(res.user.role);
    } else {
      showToast(res.error || 'Invalid or expired OTP', 'error');
    }
  };

  const handleDemoRole = async (role: 'student' | 'vendor' | 'admin') => {
    setBusy(true);
    const res = await loginAsDemo(role);
    setBusy(false);
    if (res.ok && res.user) {
      showToast(`Signed in as Demo ${role.toUpperCase()}`, 'success');
      completeRedirect(res.user.role);
    } else {
      showToast(res.error || 'Demo login unavailable', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to={returnTo || '/'}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-[#830020] hover:bg-[var(--color-surface)] dark:text-[#FFB400]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back</span>
        </Link>

        {user && (
          <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
            Active: <strong className="text-[var(--color-text)] uppercase">{user.role}</strong>
          </span>
        )}
      </div>

      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
            Sign in to TreFood
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
            {reasonMessage || 'NIT Patna campus verification. Browsing stays open without an account.'}
          </p>
          {hasExplicitReturn && (
            <p className="text-[11px] font-mono text-[var(--color-text-muted)]">
              Will return to: <span className="font-bold text-[var(--color-text)]">{returnTo}</span>
            </p>
          )}
        </div>

        {/* 1. Sign in with Google */}
        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full min-h-[48px] justify-center font-bold border-2"
            onClick={handleGoogleClick}
            disabled={busy}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="mr-2.5 shrink-0">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>Sign in with Google</span>
            {!providers.googleOAuthEnabled && (
              <span className="ml-2 rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-bold text-[#78350F]">
                Mock Chooser
              </span>
            )}
          </Button>
        </div>

        <TurnstileWidget
          enabled={providers.turnstileEnabled}
          siteKey={providers.turnstileSiteKey}
          onToken={setTurnstileToken}
          theme={resolvedTheme}
        />

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-[var(--color-border)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text-muted)]">
              or Email OTP Fallback
            </span>
          </div>
        </div>

        {/* 2. Email OTP Fallback */}
        {!otpSent ? (
          <form onSubmit={handleRequestOtp} className="space-y-3">
            <Input
              id="signin-page-email"
              label="Campus Email (@nitp.ac.in)"
              type="email"
              placeholder="aarav.ug24@nitp.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              required
            />
            <Button type="submit" className="w-full" loading={busy}>
              Send 6-Digit Email OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-xs text-[var(--color-text)]">
              <MailCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>OTP generated for {email}</span>
            </div>

            {devOtpHint && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-center text-xs font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                Dev Mock OTP: <span className="font-mono text-sm font-black tracking-widest">{devOtpHint}</span>
              </div>
            )}

            <Input
              id="signin-page-otp"
              label="Enter 6-Digit OTP"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setOtpSent(false);
                  setDevOtpHint(null);
                }}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" loading={busy}>
                Verify & Continue
              </Button>
            </div>
          </form>
        )}

        {/* 3. Prominent Demo Mode (3 Role Buttons) */}
        {providers.demoMode && (
          <div className="rounded-2xl border-2 border-amber-300 bg-[#FFF8E1] p-4 dark:border-[#92400E] dark:bg-[#331F04]/70 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#78350F] dark:text-[#FDE68A]">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Demo Mode (Instant Role Switcher)
              </span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#78350F] dark:bg-black/40 dark:text-[#FDE68A]">
                KV Session
              </span>
            </div>

            <p className="text-xs text-[#78350F]/90 dark:text-[#FDE68A]/90">
              Switch between Student ordering, Vendor counter tablet, and Campus Admin roles.
            </p>

            <div className="space-y-2">
              <Button
                type="button"
                variant="amber"
                className="w-full min-h-[48px] justify-between px-4 font-bold"
                onClick={() => handleDemoRole('student')}
                disabled={busy}
              >
                <span className="inline-flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  Continue as Student
                </span>
                <span className="text-xs opacity-75">student@demo</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full min-h-[48px] justify-between px-4 font-bold"
                onClick={() => handleDemoRole('vendor')}
                disabled={busy}
              >
                <span className="inline-flex items-center gap-2">
                  <Store className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                  Continue as Vendor
                </span>
                <span className="text-xs opacity-75">vendor@demo • /v</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full min-h-[48px] justify-between px-4 font-bold"
                onClick={() => handleDemoRole('admin')}
                disabled={busy}
              >
                <span className="inline-flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                  Continue as Admin
                </span>
                <span className="text-xs opacity-75">admin@demo • /admin</span>
              </Button>
            </div>
          </div>
        )}

        <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>HttpOnly session cookie backed by Cloudflare KV</span>
        </p>
      </div>

      {/* Mock Google Account Chooser Dialog */}
      <Dialog
        open={googleChooserOpen}
        onClose={() => setGoogleChooserOpen(false)}
        title="Choose an NIT Patna Google Account"
        description="Prototype mock Google OAuth chooser (switches automatically to live OAuth when Client ID & Secret are set)."
      >
        <div className="space-y-2 pt-1">
          {MOCK_GOOGLE_ACCOUNTS.map((acct) => (
            <button
              key={acct.email}
              type="button"
              disabled={busy}
              onClick={() => handlePickMockGoogle(acct)}
              className="flex w-full min-h-[56px] items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition-colors hover:border-[#830020] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#830020] text-sm font-extrabold text-[#FFB400]">
                {acct.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-[var(--color-text)] truncate">{acct.name}</div>
                <div className="text-xs text-[var(--color-text-muted)] truncate">{acct.email}</div>
                <div className="text-[11px] text-[var(--color-text-muted)]">{acct.note}</div>
              </div>
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
