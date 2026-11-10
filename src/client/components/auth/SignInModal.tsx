import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { Sparkles, MailCheck, ShieldCheck } from 'lucide-react';

export interface SignInModalProps {
  open: boolean;
  onClose: () => void;
}

export function SignInModal({ open, onClose }: SignInModalProps) {
  const { requestOtp, verifyOtp, loginAsDemo } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    const clean = email.trim().toLowerCase();
    if (!clean.endsWith('@nitp.ac.in')) {
      setEmailError('Enter your official @nitp.ac.in campus email');
      return;
    }

    setBusy(true);
    const res = await requestOtp(clean);
    setBusy(false);

    if (res.ok) {
      setOtpSent(true);
      setDemoCode(res.demoCode ?? null);
      showToast('6-digit OTP generated for your campus email.', 'info');
    } else {
      setEmailError(res.error || 'Could not send verification code.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      showToast('Enter all 6 digits from your OTP.', 'warning');
      return;
    }

    setBusy(true);
    const res = await verifyOtp(email.trim().toLowerCase(), cleanCode);
    setBusy(false);

    if (res.ok) {
      showToast('Signed in to TreFood!', 'success');
      setOtpSent(false);
      setOtpCode('');
      onClose();
    } else {
      showToast(res.error || 'Invalid or expired OTP.', 'error');
    }
  };

  const handleDemoStudent = async () => {
    setBusy(true);
    const res = await loginAsDemo('student');
    setBusy(false);
    if (res.ok) {
      showToast('Signed in with Demo Student account', 'success');
      onClose();
    } else {
      showToast(res.error || 'Demo login unavailable', 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Campus Sign In"
      description="Browsing is always open for guests. Sign in with @nitp.ac.in when ready to place an order."
    >
      <div className="space-y-4">
        {!otpSent ? (
          <form onSubmit={handleRequestOtp} className="space-y-3">
            <Input
              id="signin-email"
              label="NIT Patna Email"
              type="email"
              placeholder="aarav.ug24@nitp.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              required
            />
            <Button type="submit" className="w-full" loading={busy}>
              Send 6-Digit Campus OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-xs text-[var(--color-text)]">
              <MailCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Code sent to {email}</span>
            </div>

            {demoCode && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-center text-xs font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                DEMO_MODE Code:{' '}
                <span className="font-mono text-sm font-black tracking-widest">{demoCode}</span>
              </div>
            )}

            <Input
              id="signin-otp"
              label="6-Digit OTP"
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
                onClick={() => setOtpSent(false)}
              >
                Change Email
              </Button>
              <Button type="submit" className="flex-1" loading={busy}>
                Verify & Sign In
              </Button>
            </div>
          </form>
        )}

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-[var(--color-border)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[var(--color-surface)] px-2 text-xs font-medium text-[var(--color-text-muted)]">
              Prototype Demo Evaluation
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="amber"
          className="w-full"
          onClick={handleDemoStudent}
          disabled={busy}
        >
          <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
          One-Tap Demo Student Login
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>HttpOnly 30-day session cookie • Pay at gate when packet arrives</span>
        </p>
      </div>
    </Dialog>
  );
}
