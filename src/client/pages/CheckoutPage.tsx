import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/ui/Toast';
import { trackFunnelEvent } from '../utils/analytics';
import type { Gate } from '@shared/schemas';
import {
  ShieldCheck,
  MapPin,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Check,
  Smartphone,
  Wallet,
} from 'lucide-react';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, loginAsDemo } = useAuth();
  const {
    vendor,
    items,
    selectedGateId,
    setSelectedGateId,
    couponCode,
    setCouponCode,
    scheduledFor,
    deliveryInstruction,
    setDeliveryInstruction,
    contactPhone,
    setContactPhone,
    paymentMethod,
    setPaymentMethod,
    quote,
    refetchQuote,
    clearCart,
  } = useCart();
  const { showToast } = useToast();

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Fetch campus gates
  const { data: gatesData } = useQuery<{ ok: boolean; gates: Gate[] }>({
    queryKey: ['gates'],
    queryFn: async () => {
      const res = await fetch('/api/gates');
      return res.json();
    },
    staleTime: 60000,
  });

  const gates: Gate[] = gatesData?.gates || [];
  const currentGate = gates.find((g) => g.id === selectedGateId) || gates[0];

  // Auto-fill phone if demo user
  useEffect(() => {
    if (user?.email?.endsWith('trefood.test') && !contactPhone) {
      setContactPhone('9876543210');
    }
  }, [user, contactPhone, setContactPhone]);

  // Stable idempotency key per cart signature
  useEffect(() => {
    const key = `tf-idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setIdempotencyKey(key);
  }, [vendor?.id, selectedGateId, items.length]);

  if (!vendor || items.length === 0) {
    return (
      <div className="tf-desktop-container py-16 text-center space-y-4">
        <h1 className="font-display text-[32px] font-bold text-[var(--color-text)]">
          Your Campus Packet is Empty
        </h1>
        <p className="text-[15px] text-[var(--color-text-muted)] max-w-md mx-auto">
          Add fresh meals or drinks from NIT Patna campus counters before checking out.
        </p>
        <div className="pt-2">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-[#830020] px-6 py-3 text-[14px] font-bold text-white hover:bg-[#680019]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Browse Campus Kitchens</span>
          </Link>
        </div>
      </div>
    );
  }

  const subtotalPaise =
    quote?.subtotalPaise ??
    items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  const packingPaise = quote?.packingTotalPaise ?? (items.length > 0 ? 1000 : 0);
  const discountPaise = quote?.discountPaise ?? 0;
  const totalPaise = quote?.totalPaise ?? subtotalPaise + packingPaise - discountPaise;

  const handleApplyCoupon = async (codeToApply?: string) => {
    const target = (codeToApply || couponInput).trim().toUpperCase();
    if (!target) return;
    setApplyingCoupon(true);
    setCouponCode(target);
    await refetchQuote();
    setApplyingCoupon(false);
    showToast(`Applied coupon ${target}`, 'success');
  };

  const handleRemoveCoupon = async () => {
    setCouponCode('');
    setCouponInput('');
    await refetchQuote();
    showToast('Coupon removed', 'info');
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      setOrderError('Please sign in with your student account to place your order.');
      return;
    }

    const cleanPhone = contactPhone.replace(/\D/g, '');
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setPhoneError('Enter a valid 10-digit mobile number starting with 6–9');
      return;
    }
    if (!cleanPhone && !user?.email?.endsWith('trefood.test')) {
      setPhoneError('Enter your 10-digit mobile number for gate drop arrival call');
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
          'Selected gate cannot receive delivery right now. Switch to Main Gate or an open slot.'
      );
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
          couponCode: couponCode || undefined,
          paymentMethod,
          contactPhone: cleanPhone || undefined,
          scheduledFor: scheduledFor || undefined,
          note: deliveryInstruction.trim() || undefined,
          items: items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            notes: i.notes || undefined,
            variantId: i.variantId || undefined,
            addonIds: i.addonIds || undefined,
          })),
        }),
      });

      const body = (await res.json()) as {
        ok: boolean;
        order?: { id: string; totalPaise: number };
        error?: { code?: string; message?: string };
      };
      if (!res.ok || !body.order) {
        setIsPlacingOrder(false);
        setOrderError(
          body?.error?.message ||
            body?.error?.code ||
            'Could not place order. Please review your details and try again.'
        );
        return;
      }

      trackFunnelEvent('order_placed', {
        vendorId: vendor.id,
        gateId: selectedGateId,
      });

      clearCart();
      showToast('Order confirmed! Collect at gate with your 4-digit code.', 'success');
      navigate(`/orders/${body.order.id}`);
    } catch {
      setIsPlacingOrder(false);
      setOrderError('Network error while placing order. Tap Place Order to retry safely.');
    }
  };

  return (
    <div className="space-y-10 pb-24">
      {/* Back Link */}
      <div>
        <Link
          to={`/vendor/${vendor.slug}`}
          className="inline-flex items-center gap-2 text-[14px] font-bold text-[var(--color-text-muted)] hover:text-[#830020] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {vendor.name}</span>
        </Link>
      </div>

      <div className="border-b border-[var(--color-border)] pb-4">
        <h1 className="font-display text-[36px] font-bold text-[var(--color-text)]">
          Campus Gate Delivery Checkout
        </h1>
        <p className="text-[15px] text-[var(--color-text-muted)] mt-1">
          Zero delivery fee • Match 4-digit packet code at gate drop • Pay cash or UPI on handover
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LEFT COLUMN: Three Clear Steps (7 Columns) */}
        <div className="lg:col-span-7 space-y-8">
          {/* STEP 1: Gate & Delivery Window */}
          <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs p-7 space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 rounded-full bg-[#830020] text-white text-[14px] font-extrabold items-center justify-center shrink-0">
                1
              </span>
              <div>
                <h2 className="font-display text-[20px] font-bold text-[var(--color-text)]">
                  Campus Gate &amp; Drop Timing
                </h2>
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  Pick your hostel or academic drop location at NIT Patna
                </p>
              </div>
            </div>

            {/* Gate Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {gates.map((g) => {
                const isSelected = g.id === selectedGateId;
                const is24x7 = g.is24x7 || g.curfewTime === '23:59' || g.curfewTime.toLowerCase() === '24x7';
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setSelectedGateId(g.id);
                      refetchQuote();
                    }}
                    className={`p-3.5 rounded-[16px] border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#830020] bg-[var(--color-surface)] shadow-sm ring-2 ring-[#830020]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-sunken)] hover:border-[#830020]'
                    }`}
                  >
                    <div className="font-bold text-[14px] text-[var(--color-text)] leading-snug">
                      {g.name}
                    </div>
                    <div className="text-[13px] text-[var(--color-text-muted)] mt-1">
                      {is24x7 ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          Open 24x7
                        </span>
                      ) : (
                        <span>Curfew {g.curfewTime} IST</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Delivery Note */}
            <div>
              <label htmlFor="delivery-notes" className="block text-[13px] font-bold text-[var(--color-text-muted)] uppercase mb-1.5">
                Delivery Instructions (Room / Wing / Landmark)
              </label>
              <input
                id="delivery-notes"
                type="text"
                value={deliveryInstruction}
                onChange={(e) => setDeliveryInstruction(e.target.value)}
                placeholder="e.g. Ganga Hostel Room 304, call once you reach gate"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-3 text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
              />
            </div>
          </section>

          {/* STEP 2: Payment Method & Contact */}
          <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs p-7 space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 rounded-full bg-[#830020] text-white text-[14px] font-extrabold items-center justify-center shrink-0">
                2
              </span>
              <div>
                <h2 className="font-display text-[20px] font-bold text-[var(--color-text)]">
                  Payment &amp; Contact Details
                </h2>
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  Zero delivery fee. Pay on delivery at the gate.
                </p>
              </div>
            </div>

            {/* Payment Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('pay_at_gate')}
                className={`p-4 rounded-[16px] border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  paymentMethod === 'pay_at_gate'
                    ? 'border-[#830020] bg-[var(--color-surface)] shadow-sm ring-2 ring-[#830020]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-sunken)] hover:border-[#830020]'
                }`}
              >
                <Wallet className="h-5 w-5 text-[#830020] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[15px] text-[var(--color-text)]">
                    Pay at Gate
                  </div>
                  <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                    Pay cash or scan vendor UPI QR code upon 4-digit code handover.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('upi_simulated')}
                className={`p-4 rounded-[16px] border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  paymentMethod === 'upi_simulated'
                    ? 'border-[#830020] bg-[var(--color-surface)] shadow-sm ring-2 ring-[#830020]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-sunken)] hover:border-[#830020]'
                }`}
              >
                <Smartphone className="h-5 w-5 text-[#830020] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[15px] text-[var(--color-text)]">
                    Simulated UPI Test
                  </div>
                  <div className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                    Instant sandbox payment simulation for testing.
                  </div>
                </div>
              </button>
            </div>

            {/* Contact Phone */}
            <div>
              <label htmlFor="contact-phone" className="block text-[13px] font-bold text-[var(--color-text-muted)] uppercase mb-1.5">
                Contact Phone Number (For Gate Arrival Notice)
              </label>
              <input
                id="contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => {
                  setContactPhone(e.target.value);
                  setPhoneError(null);
                }}
                placeholder="10-digit mobile number (e.g. 9876543210)"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-3 text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
              />
              {phoneError && (
                <p className="text-[13px] text-red-600 font-semibold mt-1">{phoneError}</p>
              )}
            </div>
          </section>

          {/* STEP 3: Student Sign-in & Review */}
          <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs p-7 space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 rounded-full bg-[#830020] text-white text-[14px] font-extrabold items-center justify-center shrink-0">
                3
              </span>
              <div>
                <h2 className="font-display text-[20px] font-bold text-[var(--color-text)]">
                  Student Verification &amp; Order Placement
                </h2>
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  Zero delivery fee campus guarantee
                </p>
              </div>
            </div>

            {!user ? (
              <div className="p-5 rounded-[16px] border border-amber-300 bg-amber-500/10 space-y-3">
                <div className="text-[14px] font-bold text-amber-900 dark:text-amber-200">
                  Sign in required to confirm campus gate drop
                </div>
                <p className="text-[13px] text-amber-800 dark:text-amber-300">
                  Orders must be linked to a verified student identity to receive 4-digit handover codes.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => loginAsDemo('student')}
                    className="rounded-full bg-[#830020] px-5 py-2.5 text-[14px] font-bold text-white hover:bg-[#680019] cursor-pointer"
                  >
                    Quick Sign-in (Demo Student)
                  </button>
                  <Link
                    to="/signin"
                    className="rounded-full border border-stone-300 px-5 py-2.5 text-[14px] font-bold text-stone-900 dark:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    Use NIT Patna Email
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-[16px] bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full bg-[#830020] text-white flex items-center justify-center font-bold text-[14px]">
                    {user.name?.charAt(0) || 'S'}
                  </span>
                  <div>
                    <div className="font-bold text-[14px] text-[var(--color-text)]">
                      {user.name || 'NIT Patna Student'}
                    </div>
                    <div className="text-[13px] text-[var(--color-text-muted)]">
                      {user.email} • Verified Campus Account
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[13px] font-bold text-emerald-800 dark:text-emerald-400">
                  <Check className="h-4 w-4" />
                  <span>Ready</span>
                </span>
              </div>
            )}

            {/* Error banner if any */}
            {orderError && (
              <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-900 text-[14px] font-medium flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <span>{orderError}</span>
              </div>
            )}

            {/* Big Action Button */}
            <button
              type="button"
              disabled={isPlacingOrder || !user}
              onClick={handlePlaceOrder}
              className="w-full min-h-[54px] rounded-full bg-[#FFB400] text-stone-950 font-display text-[17px] font-extrabold shadow-md hover:bg-[#E5A200] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#830020]"
            >
              {isPlacingOrder ? (
                <span>Confirming Order...</span>
              ) : (
                <>
                  <span>Place Order • Pay ₹{Math.round(totalPaise / 100)} at Gate</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </section>
        </div>

        {/* RIGHT COLUMN: Persistent Sticky Order Summary (5 Columns) */}
        <div className="lg:col-span-5 sticky top-24 self-start space-y-6">
          <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elevation-2)] p-7 space-y-6">
            {/* Header: Untruncated Vendor Name */}
            <div className="border-b border-[var(--color-border)] pb-4 space-y-1">
              <div className="text-[13px] font-bold uppercase tracking-wider text-[#830020] dark:text-[#FFB400]">
                Order Summary
              </div>
              <h3 className="font-display text-[22px] font-bold text-[var(--color-text)] leading-snug break-words">
                {vendor.name}
              </h3>
              <div className="text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5 pt-0.5">
                <MapPin className="h-3.5 w-3.5 text-stone-500" />
                <span>Delivering to {currentGate.name}</span>
              </div>
            </div>

            {/* Packet Items */}
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
              {items.map((item) => (
                <div
                  key={item.lineKey || item.itemId}
                  className="flex items-center justify-between text-[14px] text-[var(--color-text)] gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-[#830020] mr-2">
                      {item.quantity}×
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold shrink-0">
                    ₹{Math.round((item.pricePaise * item.quantity) / 100)}
                  </span>
                </div>
              ))}
            </div>

            {/* Campus Coupons */}
            <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
              <div className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Campus Coupons
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="e.g. CAMPUS20"
                  className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[13px] uppercase font-bold text-[var(--color-text)]"
                />
                {couponCode ? (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-3 py-2 rounded-xl border border-red-300 text-red-600 text-[13px] font-bold hover:bg-red-50 cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={applyingCoupon || !couponInput.trim()}
                    onClick={() => handleApplyCoupon()}
                    className="px-4 py-2 rounded-xl bg-[#830020] text-white text-[13px] font-bold hover:bg-[#680019] disabled:opacity-50 cursor-pointer"
                  >
                    Apply
                  </button>
                )}
              </div>
              {/* Quick Coupon Chips */}
              {!couponCode && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon('CAMPUS20')}
                    className="text-[13px] font-bold text-[#830020] dark:text-[#FFB400] underline"
                  >
                    Use CAMPUS20 (20% off)
                  </button>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="border-t border-[var(--color-border)] pt-4 space-y-2.5 text-[14px]">
              <div className="flex justify-between text-[var(--color-text-muted)]">
                <span>Items Subtotal</span>
                <span className="font-semibold text-[var(--color-text)]">
                  ₹{Math.round(subtotalPaise / 100)}
                </span>
              </div>

              {discountPaise > 0 && (
                <div className="flex justify-between text-emerald-800 dark:text-emerald-400 font-bold">
                  <span>Coupon Discount ({couponCode})</span>
                  <span>-₹{Math.round(discountPaise / 100)}</span>
                </div>
              )}

              <div className="flex justify-between text-[var(--color-text-muted)]">
                <span>Packet Packaging</span>
                <span className="font-semibold text-[var(--color-text)]">
                  ₹{Math.round(packingPaise / 100)}
                </span>
              </div>

              <div className="flex justify-between text-emerald-800 dark:text-emerald-400 font-bold">
                <span>Campus Gate Drop</span>
                <span>FREE</span>
              </div>

              <div className="border-t border-[var(--color-border)] pt-3 flex justify-between items-baseline text-[18px] font-bold text-[var(--color-text)]">
                <span>Total Due at Gate</span>
                <span className="text-[24px] font-black text-[#830020] dark:text-[#FFB400]">
                  ₹{Math.round(totalPaise / 100)}
                </span>
              </div>
            </div>

            {/* 4-Digit Handover Chit Guarantee Note */}
            <div className="rounded-[16px] border border-stone-200 bg-[#FFFDF9] p-4 text-stone-900 space-y-1 shadow-xs">
              <div className="flex items-center gap-2 text-[13px] font-bold text-[#830020]">
                <ShieldCheck className="h-4 w-4" />
                <span>Match 4 Digits at Gate Drop</span>
              </div>
              <p className="text-[13px] text-stone-600 leading-snug">
                Your packet chit displays a unique 4-digit code. Inspect this code against the packet receipt at the gate before paying.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
