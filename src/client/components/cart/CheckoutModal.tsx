import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../ui/Toast';
import { simulatedUpiAdapter } from '../../services/paymentAdapter';
import type { Gate } from '@shared/schemas';
import {
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Clock,
  MapPin,
  Smartphone,
  Wallet,
  CalendarClock,
} from 'lucide-react';

export interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

export function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, requestOtp, verifyOtp, loginAsDemo } = useAuth();
  const {
    vendor,
    items,
    selectedGateId,
    setSelectedGateId,
    couponCode,
    scheduledFor,
    setScheduledFor,
    deliveryInstruction,
    setDeliveryInstruction,
    contactPhone,
    setContactPhone,
    paymentMethod,
    setPaymentMethod,
    quote,
    quoteLoading,
    refetchQuote,
    clearCart,
  } = useCart();
  const { showToast } = useToast();

  // Sign-in states
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Payment & Checkout states
  const [upiVpa, setUpiVpa] = useState('nitp.student@okicici');
  const [simulateUpiFailure, setSimulateUpiFailure] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(Boolean(scheduledFor));

  // Stable Idempotency-Key per cart/checkout attempt to prevent double-ordering
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const { data: gatesData } = useQuery<{ ok: boolean; gates: Gate[] }>({
    queryKey: ['gates'],
    queryFn: async () => {
      const res = await fetch('/api/gates');
      return res.json();
    },
    staleTime: 60000,
    enabled: open,
  });

  const currentGate = gatesData?.gates?.find((g) => g.id === selectedGateId);

  // Pre-fill demo contact number when logged in as seeded demo account and empty
  useEffect(() => {
    if (user?.email?.endsWith('trefood.test') && !contactPhone) {
      setContactPhone('9876543210');
    }
  }, [user, contactPhone, setContactPhone]);

  // Generate fresh Idempotency-Key when modal opens or cart signature changes
  const cartSig = `${vendor?.id || ''}:${selectedGateId}:${items.map((i) => `${i.lineKey || i.itemId}x${i.quantity}`).join(',')}:${couponCode}:${scheduledFor || 'now'}`;
  useEffect(() => {
    if (open) {
      const randomKey = `tf-idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setIdempotencyKey(randomKey);
      setOrderError(null);
      setPhoneError(null);
    }
  }, [open, cartSig]);

  useEffect(() => {
    setScheduleEnabled(Boolean(scheduledFor));
  }, [scheduledFor]);

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
      const digits = val.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 6) next[i] = d;
      });
      setOtpDigits(next);
      otpInputRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = val.replace(/\D/g, '');
    setOtpDigits(next);

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
      if (!contactPhone) setContactPhone('9876543210');
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

    const cleanPhone = contactPhone.replace(/\D/g, '');
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setPhoneError('Enter a valid 10-digit mobile number starting with 6–9');
      return;
    }
    if (!cleanPhone && !user?.email?.endsWith('trefood.test')) {
      setPhoneError('Enter a 10-digit mobile number for gate arrival call');
      return;
    }
    setPhoneError(null);

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

    if (!activeQuote.canDeliver) {
      setIsPlacingOrder(false);
      setOrderError(
        activeQuote.deliveryMessage ||
          'Selected gate cannot receive delivery right now. Switch gate or pick an open slot.'
      );
      return;
    }

    if (activeQuote.meetsMinOrder === false) {
      setIsPlacingOrder(false);
      setOrderError(
        `Add ₹${Math.ceil((activeQuote.shortfallPaise || 0) / 100)} more to meet vendor minimum order.`
      );
      return;
    }

    let upiRef: string | undefined;
    if (paymentMethod === 'upi_simulated') {
      const upiRes = await simulatedUpiAdapter.initiateUpi({
        amountPaise: activeQuote.totalPaise,
        orderAttemptKey: idempotencyKey,
        customerPhone: cleanPhone || '9876543210',
        vpaOrApp: upiVpa.trim() || 'nitp.student@okicici',
        simulatedOutcome: simulateUpiFailure ? 'failed' : 'success',
      });

      if (!upiRes.ok) {
        setIsPlacingOrder(false);
        setOrderError(
          upiRes.errorMessage ||
            'Simulated UPI authorization declined. Uncheck simulate failure, retry, or choose Pay at gate.'
        );
        return;
      }
      upiRef = upiRes.paymentRef;
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
          couponCode: couponCode || undefined,
          paymentMethod,
          upiSimulateResult: paymentMethod === 'upi_simulated' ? 'success' : undefined,
          paymentRef: upiRef,
          contactPhone: cleanPhone || undefined,
          scheduledFor: scheduleEnabled && scheduledFor ? scheduledFor : undefined,
          note: deliveryInstruction.trim() || undefined,
          items: items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            notes: i.notes,
            variantId: i.variantId,
            addonIds: i.addonIds,
            expectedPricePaise: i.pricePaise,
          })),
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        order?: { id: string };
        error?: { code?: string; message?: string };
      };
      if (!res.ok || !data.order) {
        if (res.status === 409) {
          setOrderError(
            data.error?.message || 'Prices, stock, or coupon eligibility changed. Please review.'
          );
        } else {
          setOrderError(data.error?.message || 'Could not place order. Please try again.');
        }
      } else {
        showToast('Order placed! Match your 4-digit code at the gate.', 'success');
        clearCart();
        onClose();
        navigate(`/orders/${data.order.id}`);
      }
    } catch {
      setOrderError(
        'Network request failed. Tap Retry below — your Idempotency-Key prevents double ordering.'
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const slots = quote?.availableSlots || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="max-w-lg"
      title={user ? 'Confirm & Place Order' : 'Sign in to Place Order'}
      description={
        user
          ? 'Confirm gate, contact phone, schedule, and payment method.'
          : 'Campus verified delivery. Only @nitp.ac.in accounts can place orders.'
      }
    >
      {!user ? (
        <div className="space-y-5 pt-2">
          {/* One-tap Demo Student Login */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-800 dark:bg-amber-950/40">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              Demo Mode Active
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
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
            <hr className="w-full border-[var(--color-border)]" />
            <span className="absolute bg-[var(--color-surface)] px-2 text-xs font-semibold text-[var(--color-text-muted)]">
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
              <Button type="submit" loading={isSubmittingOtp} variant="primary" className="w-full">
                Send 6-Digit Code
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              {demoOtpHint && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                  <span className="font-bold">Demo Verification Code:</span>{' '}
                  <span className="font-mono text-base font-bold tracking-wider">
                    {demoOtpHint}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text)]">
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
                      className="h-12 w-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-center text-lg font-bold text-[var(--color-text)]"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-[var(--color-text-muted)] underline"
                >
                  Change email
                </button>
                {resendTimer > 0 ? (
                  <span className="text-[var(--color-text-muted)]">Resend in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestOtp({ preventDefault: () => {} } as React.FormEvent)}
                    className="text-[#830020] font-semibold underline dark:text-[#FFB400]"
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
                Verify &amp; Continue
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          {/* Gate Confirmation & Curfew Alert */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-[var(--color-text)]">
                <MapPin className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                <span>{currentGate?.name || selectedGateId}</span>
              </span>
              {quote?.etaMinutes && (
                <span className="font-mono font-bold text-[#15803D] dark:text-[#86EFAC]">
                  ~{quote.etaMinutes} min
                </span>
              )}
            </div>
            {quote?.latestOrderTime && (
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Latest safe order time: {quote.latestOrderTime} IST</span>
              </div>
            )}

            {quote && !quote.canDeliver && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-2.5 text-red-950 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200 space-y-2">
                <div className="font-semibold">
                  {quote.deliveryMessage || 'Gate curfew or closure prevents immediate delivery.'}
                </div>
                {quote.alternativeGates && quote.alternativeGates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {quote.alternativeGates.map((alt) => (
                      <button
                        key={alt.gateId}
                        type="button"
                        onClick={() => {
                          setSelectedGateId(alt.gateId);
                          showToast(`Switched gate to ${alt.gateName}`, 'success');
                        }}
                        className="min-h-[34px] rounded-lg bg-[#830020] px-2.5 text-xs font-bold text-white dark:bg-[#FFB400] dark:text-[#1C1917]"
                      >
                        Switch to {alt.gateName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact Phone & Delivery Instruction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="checkout-phone"
              label="Contact Mobile Number"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile (e.g. 9876543210)"
              value={contactPhone}
              onChange={(e) => {
                setContactPhone(e.target.value);
                setPhoneError(null);
              }}
              error={phoneError || undefined}
            />
            <Input
              id="checkout-instruction"
              label="Delivery instruction (optional)"
              maxLength={200}
              placeholder="e.g. Wait near Main Gate kiosk"
              value={deliveryInstruction}
              onChange={(e) => setDeliveryInstruction(e.target.value)}
            />
          </div>

          {/* Optional Schedule for Later (Constrained by Vendor & Gate Hours) */}
          <div className="rounded-xl border border-[var(--color-border)] p-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-[var(--color-text)]">
                <CalendarClock className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                <span>Delivery timing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-pressed={!scheduleEnabled}
                  onClick={() => {
                    setScheduleEnabled(false);
                    setScheduledFor(null);
                  }}
                  className={`min-h-[32px] rounded-lg px-2.5 font-bold ${
                    !scheduleEnabled
                      ? 'bg-[#830020] text-white dark:bg-[#FFB400] dark:text-[#1C1917]'
                      : 'border border-[var(--color-border)] text-[var(--color-text)]'
                  }`}
                >
                  ASAP
                </button>
                <button
                  type="button"
                  aria-pressed={scheduleEnabled}
                  onClick={() => {
                    setScheduleEnabled(true);
                    if (!scheduledFor && slots[0]) {
                      setScheduledFor(slots[0].timestamp);
                    }
                  }}
                  className={`min-h-[32px] rounded-lg px-2.5 font-bold ${
                    scheduleEnabled
                      ? 'bg-[#830020] text-white dark:bg-[#FFB400] dark:text-[#1C1917]'
                      : 'border border-[var(--color-border)] text-[var(--color-text)]'
                  }`}
                >
                  Schedule later
                </button>
              </div>
            </div>

            {scheduleEnabled && (
              <div className="space-y-1.5">
                {slots.length > 0 ? (
                  <>
                    <label htmlFor="checkout-schedule-slot" className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                      Available slots constrained by vendor &amp; gate hours (IST):
                    </label>
                    <select
                      id="checkout-schedule-slot"
                      value={scheduledFor || slots[0]?.timestamp || ''}
                      onChange={(e) => setScheduledFor(Number(e.target.value) || null)}
                      className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text)]"
                    >
                      {slots.map((slot) => (
                        <option key={slot.timestamp} value={slot.timestamp}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    No schedulable slots fit inside both vendor operating hours and this gate&apos;s curfew today.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Payment Method: Pay at Gate vs Simulated UPI */}
          <fieldset className="space-y-2 rounded-xl border border-[var(--color-border)] p-3 text-xs">
            <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Payment Method
            </legend>

            <label
              className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                paymentMethod === 'pay_at_gate'
                  ? 'border-[#830020] bg-[#FFF8E1]/50 dark:border-[#FFB400] dark:bg-[#331F04]/40'
                  : 'border-[var(--color-border)]'
              }`}
            >
              <span className="flex items-center gap-2 font-bold text-[var(--color-text)]">
                <input
                  type="radio"
                  name="checkout-payment"
                  checked={paymentMethod === 'pay_at_gate'}
                  onChange={() => {
                    setPaymentMethod('pay_at_gate');
                    setOrderError(null);
                  }}
                  className="h-4 w-4 accent-[#830020]"
                />
                <Wallet className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
                <span>Pay at gate (Cash or UPI on packet arrival)</span>
              </span>
            </label>

            <label
              className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                paymentMethod === 'upi_simulated'
                  ? 'border-[#830020] bg-[#FFF8E1]/50 dark:border-[#FFB400] dark:bg-[#331F04]/40'
                  : 'border-[var(--color-border)]'
              }`}
            >
              <span className="flex items-center gap-2 font-bold text-[var(--color-text)]">
                <input
                  type="radio"
                  name="checkout-payment"
                  checked={paymentMethod === 'upi_simulated'}
                  onChange={() => {
                    setPaymentMethod('upi_simulated');
                    setOrderError(null);
                  }}
                  className="h-4 w-4 accent-[#830020]"
                />
                <Smartphone className="h-4 w-4 text-[#15803D] dark:text-[#86EFAC]" aria-hidden="true" />
                <span>Pay now with UPI (Simulated • Razorpay/Cashfree ready)</span>
              </span>
            </label>

            {paymentMethod === 'upi_simulated' && (
              <div className="mt-2 space-y-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] p-2.5">
                <Input
                  id="checkout-upi-vpa"
                  label="UPI ID / App Handle (Simulated)"
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value)}
                  placeholder="yourname@okicici"
                />
                <label className="flex min-h-[36px] cursor-pointer items-center gap-2 text-[11px] font-semibold text-[var(--color-text-muted)]">
                  <input
                    type="checkbox"
                    checked={simulateUpiFailure}
                    onChange={(e) => setSimulateUpiFailure(e.target.checked)}
                    className="h-4 w-4 accent-[#830020]"
                  />
                  <span>Simulate UPI bank decline / failure path</span>
                </label>
              </div>
            )}
          </fieldset>

          {/* Compact Itemised Bill Summary */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-[var(--color-text-muted)]">
              <span>Vendor</span>
              <span className="font-bold text-[var(--color-text)]">{vendor?.name}</span>
            </div>
            <div className="flex justify-between text-[var(--color-text-muted)]">
              <span>Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
              <span className="font-mono">₹{((quote?.subtotalPaise || 0) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[var(--color-text-muted)]">
              <span>Packing charges</span>
              <span className="font-mono">₹{((quote?.packingTotalPaise || 0) / 100).toFixed(2)}</span>
            </div>
            {(quote?.discountPaise ?? 0) > 0 && (
              <div className="flex justify-between font-semibold text-[#15803D] dark:text-[#86EFAC]">
                <span>Discount ({quote?.couponApplied})</span>
                <span className="font-mono">-₹{((quote?.discountPaise || 0) / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[var(--color-text-muted)]">
              <span>Delivery Fee</span>
              <span className="font-bold text-[#15803D] dark:text-[#86EFAC]">FREE</span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-border)] pt-2 text-sm font-extrabold text-[var(--color-text)]">
              <span>{paymentMethod === 'upi_simulated' ? 'Pay Now (UPI)' : 'Pay at Gate'}</span>
              <span className="font-mono text-base text-[#830020] dark:text-[#FFB400]">
                ₹{((quote?.totalPaise || 0) / 100).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>4-digit packet handover code is generated on order confirmation.</span>
          </div>

          {orderError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
                <div>{orderError}</div>
              </div>
              {paymentMethod === 'upi_simulated' && (
                <button
                  type="button"
                  onClick={() => {
                    setSimulateUpiFailure(false);
                    setPaymentMethod('pay_at_gate');
                    setOrderError(null);
                  }}
                  className="text-xs font-bold underline"
                >
                  Switch to Pay at gate instead
                </button>
              )}
            </div>
          )}

          <div className="pt-1">
            <Button
              onClick={handlePlaceOrder}
              loading={isPlacingOrder || quoteLoading}
              disabled={isPlacingOrder || quoteLoading || Boolean(quote && !quote.canDeliver)}
              variant="primary"
              className="w-full min-h-[48px] text-base"
            >
              <span>
                {orderError
                  ? 'Retry Placing Order'
                  : paymentMethod === 'upi_simulated'
                    ? 'Authorize UPI & Confirm Order'
                    : 'Confirm Order'}
              </span>
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
