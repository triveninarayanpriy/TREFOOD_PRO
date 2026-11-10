import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../ui/Toast';
import { ShieldCheck, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

export function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, requestOtp, verifyOtp, loginAsDemo } = useAuth();
  const { vendor, items, selectedGateId, quote, quoteLoading, refetchQuote, clearCart } = useCart();
  const { showToast } = useToast();

  // Sign-in states
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Order placement states
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Generate an Idempotency-Key when modal opens
  useEffect(() => {
    if (open) {
      const randomKey = `tf-idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setIdempotencyKey(randomKey);
      setOrderError(null);
    }
  }, [open]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.endsWith('@nitp.ac.in')) {
      setEmailError('Please enter your NIT Patna campus email (@nitp.ac.in)');
      return;
    }

    setIsSubmittingOtp(true);
    const res = await requestOtp(cleanEmail);
    setIsSubmittingOtp(false);

    if (res.ok) {
      setOtpSent(true);
      setResendTimer(60);
      if (res.demoCode) {
        setDemoOtpHint(res.demoCode);
        showToast(`Dev OTP for ${cleanEmail}: ${res.demoCode}`, 'info');
      } else {
        showToast('Verification code sent to your email', 'info');
      }
    } else {
      setEmailError(res.error || 'Failed to send OTP');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) {
      // Handle paste
      const digits = val.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 6) next[i] = d;
      });
      setOtpDigits(next);
      const nextFocus = Math.min(digits.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = val.replace(/\D/g, '');
    setOtpDigits(next);

    // Auto-advance
    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length !== 6) {
      showToast('Please enter all 6 digits', 'warning');
      return;
    }

    setIsSubmittingOtp(true);
    const res = await verifyOtp(email.trim().toLowerCase(), code);
    setIsSubmittingOtp(false);

    if (res.ok) {
      showToast('Signed in successfully!', 'success');
      setOtpSent(false);
    } else {
      showToast(res.error || 'Invalid code', 'error');
    }
  };

  const handleOneTapDemoLogin = async () => {
    setIsSubmittingOtp(true);
    const res = await loginAsDemo('student');
    setIsSubmittingOtp(false);
    if (res.ok) {
      showToast('Signed in as demo student', 'success');
      setOtpSent(false);
    } else {
      showToast(res.error || 'Demo login failed', 'error');
    }
  };

  const handlePlaceOrder = async () => {
    if (!vendor || items.length === 0) {
      setOrderError('Cart is empty');
      return;
    }

    setIsPlacingOrder(true);
    setOrderError(null);

    let activeQuote = quote;
    if (!activeQuote) {
      activeQuote = (await refetchQuote()) || null;
    }

    if (!activeQuote) {
      setIsPlacingOrder(false);
      setOrderError('Could not verify cart prices. Tap Retry to refresh quote.');
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          vendorId: vendor.id,
          gateId: selectedGateId,
          items: items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            notes: i.notes,
            expectedPricePaise: i.pricePaise,
          })),
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        if (res.status === 409) {
          setOrderError('Prices or menu items changed. Please review your cart.');
        } else {
          setOrderError(data.error?.message || 'Could not place order. Please try again.');
        }
      } else {
        showToast('Order placed successfully!', 'success');
        clearCart();
        onClose();
        navigate(`/orders/${data.order.id}`);
      }
    } catch {
      setOrderError('Network request failed. Tap Retry below to re-submit safely without double-ordering.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={user ? 'Confirm & Place Order' : 'Sign in to Place Order'}
      description={
        user
          ? 'Zero delivery fee. Pay cash or UPI at the hostel gate upon arrival.'
          : 'Campus verified delivery. Only @nitp.ac.in accounts can place orders.'
      }
    >
      {!user ? (
        <div className="space-y-5 pt-2">
          {/* One-tap Demo Student Login Option */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-800 dark:bg-amber-950/40">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Demo Mode Active
            </div>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">
              For instant testing, sign in as the seeded campus student with one click.
            </p>
            <Button
              onClick={handleOneTapDemoLogin}
              loading={isSubmittingOtp}
              variant="secondary"
              size="sm"
              className="mt-3 w-full border-amber-300 bg-white hover:bg-amber-50 text-amber-950 font-semibold"
            >
              Continue as Demo Student (student@demo.trefood.test)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-xs font-bold text-[#830020] dark:text-[#FFB400]"
              onClick={() => {
                onClose();
                const sep = location.search ? '&' : '?';
                const returnTo = `${location.pathname}${location.search}${location.search.includes('checkout=1') ? '' : `${sep}checkout=1`}`;
                navigate(`/signin?returnTo=${encodeURIComponent(returnTo)}&reason=checkout`);
              }}
            >
              Sign in with Google or Role Switcher (/signin)
            </Button>
          </div>

          <div className="relative flex items-center justify-center">
            <hr className="w-full border-stone-200 dark:border-stone-800" />
            <span className="absolute bg-white px-2 text-xs font-semibold text-stone-400 dark:bg-stone-900">
              OR USE CAMPUS EMAIL
            </span>
          </div>

          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <Input
                label="NIT Patna Email Address"
                type="email"
                placeholder="rollnumber@nitp.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={emailError}
                autoComplete="email"
                required
              />
              <div className="text-[11px] text-stone-500">
                By signing in you agree to TreFood&apos;s Terms of Service and Privacy Policy.
              </div>
              <Button type="submit" loading={isSubmittingOtp} variant="primary" className="w-full">
                Send 6-Digit Code
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              {demoOtpHint && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                  <span className="font-bold">Demo Verification Code:</span>{' '}
                  <span className="font-mono text-base font-bold text-blue-700 dark:text-blue-300 tracking-wider">
                    {demoOtpHint}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Enter 6-Digit Code sent to {email}
                </label>
                <div className="flex justify-between gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="h-12 w-11 rounded-xl border border-stone-300 text-center text-lg font-bold text-stone-900 focus:border-[#830020] focus:ring-2 focus:ring-[#830020]/20 dark:border-stone-700 dark:bg-stone-850 dark:text-stone-100"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-stone-500 hover:text-stone-800 underline"
                >
                  Change email
                </button>
                {resendTimer > 0 ? (
                  <span className="text-stone-400">Resend code in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestOtp({ preventDefault: () => {} } as any)}
                    className="text-[#830020] font-semibold hover:underline"
                  >
                    Resend code
                  </button>
                )}
              </div>

              <Button
                onClick={handleVerifyOtp}
                loading={isSubmittingOtp}
                variant="primary"
                className="w-full"
              >
                Verify & Continue
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Order Confirmation Summary */
        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-stone-100 bg-stone-50 p-3.5 dark:border-stone-800 dark:bg-stone-850">
            <div className="flex items-center justify-between text-xs text-stone-500 pb-2 border-b border-stone-200 dark:border-stone-700">
              <span>Ordering as</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">{user.email}</span>
            </div>
            <div className="mt-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400">Vendor</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{vendor?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400">Collection Gate</span>
                <span className="font-semibold text-[#830020] dark:text-amber-400">
                  {selectedGateId === 'gate_main'
                    ? 'Main Gate'
                    : selectedGateId === 'gate_h5'
                    ? 'Hostel 5 Gate'
                    : 'Hostel 7 Gate'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400">Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                <span className="font-mono">₹{((quote?.subtotalPaise || 0) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600 dark:text-stone-400">Delivery Fee</span>
                <span className="font-bold text-emerald-600">FREE</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-700 text-sm font-bold text-stone-900 dark:text-stone-100">
                <span>Total (Pay at Gate)</span>
                <span className="font-mono text-base text-[#830020] dark:text-amber-400">
                  ₹{((quote?.totalPaise || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Pay on delivery. 4-digit verification code will be generated on placement.</span>
          </div>

          {orderError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>{orderError}</div>
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={handlePlaceOrder}
              loading={isPlacingOrder || quoteLoading}
              disabled={isPlacingOrder || quoteLoading}
              variant="primary"
              className="w-full min-h-[48px] text-base"
            >
              <span>{orderError ? 'Retry Placing Order' : 'Confirm Order'}</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
