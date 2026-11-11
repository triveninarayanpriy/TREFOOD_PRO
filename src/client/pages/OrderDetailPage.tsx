import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PacketChit } from '../components/ui/PacketChit';
import { StatusTimeline } from '../components/ui/StatusTimeline';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../components/ui/Toast';
import { useCart } from '../context/CartContext';
import { useSeoHead } from '../components/seo/SeoHead';
import { OrderPushStatusCard } from '../components/notifications/NotificationCentre';
import { RateReviewSheet } from '../components/orders/RateReviewSheet';
import { isNightSafetyActive } from '@shared/curfew';
import { trackFunnelEvent } from '../utils/analytics';
import { useTranslation } from '../i18n';
import {
  CheckCircle2,
  ArrowLeft,
  Star,
  MessageSquareWarning,
  RefreshCw,
  RotateCcw,
  Phone,
  Clock,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';
import type { OrderDetail } from '@shared/types';

interface TrackerOrder extends Omit<OrderDetail, 'vendorPhone'> {
  vendorSlug?: string;
  vendorPhone?: string | null;
  gateCurfewTime?: string;
  gateIs24x7?: boolean;
  codeAttempts?: number;
  remainingAttempts?: number;
  hasReview?: boolean;
  existingIssue?: {
    id: string;
    reason: string;
    description: string;
    status: string;
    createdAt: number;
  } | null;
}

const GATE_WINDOW_SECONDS = 15 * 60;

function formatCountdown(secondsLeft: number): string {
  const clamped = Math.max(0, Math.floor(secondsLeft));
  const mins = Math.floor(clamped / 60)
    .toString()
    .padStart(2, '0');
  const secs = (clamped % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  useSeoHead({
    title: 'Live Handover Ticket & Tracker | TreFood NIT Patna',
    description:
      'Track your campus order status in real time and confirm the 4-digit packet code at your gate.',
    path: `/orders/${id || ''}`,
    noIndex: true,
  });
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { addItem, clearCart } = useCart();
  const { t } = useTranslation();

  const [order, setOrder] = useState<TrackerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number>(Date.now());
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Server-verified 4-digit handover code entry
  const [handoverInput, setHandoverInput] = useState('');
  const [handoverError, setHandoverError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Cancel order modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [isCancelling, setIsCancelling] = useState(false);

  // Review sheet
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Report a problem modal
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueReason, setIssueReason] = useState<
    'wrong_item' | 'missing_item' | 'quality' | 'late' | 'not_at_gate' | 'other'
  >('not_at_gate');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueError, setIssueError] = useState<string | null>(null);
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueSubmittedId, setIssueSubmittedId] = useState<string | null>(null);

  const etagRef = useRef<string | null>(null);
  const backoffRef = useRef(5000);
  const hasVibratedRef = useRef(false);

  const fetchOrder = useCallback(
    async (forceFresh = false, showInitialLoader = false) => {
      if (!id) return;
      if (forceFresh) setIsRefreshing(true);

      try {
        const headers: Record<string, string> = {};
        if (etagRef.current && !forceFresh) {
          headers['If-None-Match'] = etagRef.current;
        }

        const res = await fetch(`/api/orders/${id}`, {
          headers,
          cache: forceFresh ? 'no-store' : 'default',
        });

        if (res.status === 304) {
          setReconnecting(false);
          setLastUpdatedMs(Date.now());
          backoffRef.current = 5000;
          return;
        }

        if (!res.ok) {
          if (showInitialLoader) setError('Could not load order details.');
          setReconnecting(true);
          backoffRef.current = Math.min(Math.round(backoffRef.current * 1.5), 20000);
          return;
        }

        const newEtag = res.headers.get('ETag');
        if (newEtag) etagRef.current = newEtag;

        const data = (await res.json()) as { ok?: boolean; order?: TrackerOrder };
        if (data.ok && data.order) {
          setOrder(data.order);
          setReviewSubmitted(Boolean(data.order.hasReview));
          if (data.order.existingIssue?.id) {
            setIssueSubmittedId(data.order.existingIssue.id);
          }
          setReconnecting(false);
          setLastUpdatedMs(Date.now());
          backoffRef.current = 5000;

          if (data.order.status === 'at_gate' && !hasVibratedRef.current) {
            hasVibratedRef.current = true;
            const navWithActivation = navigator as Navigator & {
              userActivation?: { hasBeenActive?: boolean };
            };
            if (
              typeof navigator !== 'undefined' &&
              'vibrate' in navigator &&
              (!navWithActivation.userActivation || navWithActivation.userActivation.hasBeenActive)
            ) {
              try {
                navigator.vibrate([200, 100, 200]);
              } catch {
                // Ignore vibration restrictions
              }
            }
            showToast('Your packet is at the gate! Enter the 4-digit code to confirm.', 'success');
          }
        }
      } catch {
        setReconnecting(true);
        backoffRef.current = Math.min(Math.round(backoffRef.current * 1.5), 20000);
      } finally {
        if (showInitialLoader) setLoading(false);
        if (forceFresh) setIsRefreshing(false);
      }
    },
    [id, showToast]
  );

  // 1-second local clock for freshness label ("Updated just now") and 15-min gate countdown
  useEffect(() => {
    const ticker = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // Poll every 5s with ETag + exponential backoff, paused while tab hidden
  useEffect(() => {
    fetchOrder(true, true);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let isCancelled = false;

    const scheduleNext = () => {
      if (isCancelled) return;
      timeoutId = setTimeout(poll, backoffRef.current);
    };

    const poll = async () => {
      if (isCancelled) return;
      const isFinal =
        order &&
        (order.status === 'delivered' ||
          order.status === 'cancelled' ||
          order.status === 'expired');

      if (isFinal) return;

      if (document.visibilityState === 'visible') {
        await fetchOrder(false, false);
      }
      scheduleNext();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchOrder(false, false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    timeoutId = setTimeout(poll, 5000);

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [id, order?.status, fetchOrder]);

  const handleConfirmHandover = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!order) return;

    const trimmed = handoverInput.trim();
    if (!/^\d{4}$/.test(trimmed)) {
      setHandoverError('Please enter the 4-digit numeric code printed on your packet.');
      return;
    }

    setHandoverError(null);
    setIsConfirming(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/confirm-handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoverCode: trimmed }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: { code?: string; message?: string; attemptsRemaining?: number; locked?: boolean };
      };

      if (!res.ok) {
        const msg = data.error?.message || 'Handover code did not match.';
        setHandoverError(msg);
        showToast(msg, 'error');
        await fetchOrder(true, false);
        return;
      }

      trackFunnelEvent('handover_confirmed', {
        gateId: order.gateId,
        vendorId: order.vendorId,
      });
      showToast('Delivery confirmed! Enjoy your order.', 'success');
      setHandoverInput('');
      setHandoverError(null);
      await fetchOrder(true, false);
    } catch {
      setHandoverError('Network error while confirming code. Please retry.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) {
        showToast(data.error?.message || 'Could not cancel order.', 'error');
      } else {
        showToast('Order cancelled.', 'info');
        setCancelModalOpen(false);
        await fetchOrder(true, false);
      }
    } catch {
      showToast('Network error cancelling order.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitIssue = async () => {
    if (!order) return;

    const trimmed = issueDescription.trim();
    if (trimmed.length < 5) {
      setIssueError('Please add at least 5 characters explaining what happened.');
      return;
    }

    setIssueError(null);
    setIsSubmittingIssue(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: issueReason, description: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        issueId?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        const msg = data.error?.message || 'Could not submit issue report.';
        setIssueError(msg);
        showToast(msg, 'error');
        return;
      }

      setIssueSubmittedId(data.issueId || 'open');
      showToast('Problem reported to TreFood campus support.', 'info');
      setIssueModalOpen(false);
      setIssueDescription('');
      await fetchOrder(true, false);
    } catch {
      setIssueError('Network error reporting issue.');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const handleOrderAgain = () => {
    if (!order) return;
    clearCart();
    order.items?.forEach((item) => {
      addItem(
        {
          id: order.vendorId,
          name: order.vendorName || 'Vendor',
          slug: order.vendorSlug || order.vendorId,
        },
        {
          itemId: item.itemId,
          name: item.name,
          pricePaise: item.pricePaise,
          quantity: item.quantity,
          notes: item.notes || undefined,
        }
      );
    });
    showToast(`Added items from ${order.vendorName} to your packet.`, 'success');
    navigate(`/vendor/${order.vendorSlug || order.vendorId}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <Skeleton className="h-6 w-28 rounded-md" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <ErrorState
          title="Order not found"
          message={error || 'We could not find this order.'}
          onRetry={() => fetchOrder(true, true)}
        />
        <div className="mt-4 text-center">
          <Button onClick={() => navigate('/orders')} variant="secondary" size="sm">
            View Order History
          </Button>
        </div>
      </div>
    );
  }

  const nowSec = Math.floor(nowMs / 1000);
  const secondsSinceUpdate = Math.max(0, Math.floor((nowMs - lastUpdatedMs) / 1000));
  const updatedText =
    secondsSinceUpdate < 10
      ? 'Updated just now'
      : secondsSinceUpdate < 60
      ? `Updated ${secondsSinceUpdate}s ago`
      : `Updated ${Math.floor(secondsSinceUpdate / 60)}m ago`;

  const isActive = ['placed', 'accepted', 'out_for_delivery', 'at_gate'].includes(order.status);
  const isAtGate = order.status === 'at_gate';
  const isDelivered = order.status === 'delivered';
  const canCancel = order.status === 'placed';
  const canReport = ['out_for_delivery', 'at_gate', 'delivered', 'cancelled', 'expired'].includes(
    order.status
  );

  const etaMinutesLeft = order.etaAt ? Math.max(1, Math.round((order.etaAt - nowSec) / 60)) : null;
  const etaText = etaMinutesLeft ? `ETA ~${etaMinutesLeft} mins` : undefined;

  const atGateStart = order.atGateAt || nowSec;
  const gateWindowRemainingSec = Math.max(0, atGateStart + GATE_WINDOW_SECONDS - nowSec);
  const remainingAttempts =
    typeof order.remainingAttempts === 'number'
      ? order.remainingAttempts
      : Math.max(0, 5 - (order.codeAttempts || 0));
  const isLocked = remainingAttempts <= 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-4 space-y-5 pb-24">
      <h1 className="sr-only">Order #{order.publicNo} Tracker &amp; Handover Code</h1>
      {/* Reconnecting banner on transient polling hiccup */}
      {reconnecting && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:text-amber-300"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>Reconnecting to NIT Patna tracker...</span>
        </div>
      )}

      {/* Top Navigation & Freshness Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>All Orders</span>
        </button>

        <div className="flex items-center gap-2">
          <span
            aria-live="polite"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>{updatedText}</span>
          </span>
          <button
            type="button"
            onClick={() => fetchOrder(true, false)}
            disabled={isRefreshing}
            aria-label="Refresh order status"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Signature R2 Packet Chit */}
      <PacketChit
        orderNo={order.publicNo}
        handoverCode={order.handoverCode}
        vendorName={order.vendorName || 'Campus Vendor'}
        gateName={order.gateName || 'Hostel Gate'}
        status={order.status}
        etaMinutes={etaMinutesLeft ?? undefined}
        totalPaise={order.totalPaise}
        itemSummary={
          order.items && order.items.length > 0
            ? order.items.map((it) => `${it.name} ×${it.quantity}`).join(', ')
            : undefined
        }
      />

      {/* Gate Handover Verification Zone (strict server verification + 15-min countdown) */}
      {isAtGate && (
        <section
          id="handover-verification-card"
          aria-label="Confirm packet handover at gate"
          className="rounded-3xl border-2 border-emerald-600 bg-emerald-50/75 p-5 dark:border-emerald-700 dark:bg-emerald-950/40 space-y-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="text-sm font-extrabold">Packet is at {order.gateName}</span>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-extrabold ${
                gateWindowRemainingSec <= 180
                  ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200'
                  : 'bg-white text-emerald-800 dark:bg-stone-900 dark:text-emerald-300'
              }`}
              aria-live="off"
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Gate window: {formatCountdown(gateWindowRemainingSec)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-3.5 text-center dark:border-emerald-800 dark:bg-stone-900/90">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              {t('ticket.handover_code', 'Your 4-Digit Packet Code')}
            </div>
            <div className="tf-animate-reveal mt-1 font-mono text-3xl font-black tracking-[0.28em] text-[#830020] dark:text-[#FFB400]">
              {order.handoverCode}
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {t(
                'ticket.match_digits_notice',
                'Match the digits written on the packet at the gate, then enter them below to confirm delivery.'
              )}
            </p>
          </div>

          {isLocked ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200 space-y-2"
            >
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Handover verification locked after 5 mismatched attempts</span>
              </div>
              <p>
                Show your student ID and Order #{order.publicNo} to the vendor delivery partner so they can complete handover assist from their counter tablet.
              </p>
            </div>
          ) : (
            <form onSubmit={handleConfirmHandover} className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="handover-code-input"
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 dark:text-emerald-200"
                >
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Enter 4-digit code from packet ({remainingAttempts} attempts left)</span>
                </label>
                <input
                  id="handover-code-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  autoComplete="one-time-code"
                  placeholder="e.g. 4829"
                  value={handoverInput}
                  onChange={(e) => {
                    setHandoverInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                    if (handoverError) setHandoverError(null);
                  }}
                  className="min-h-[48px] w-full rounded-2xl border-2 border-emerald-400 bg-white px-4 text-center font-mono text-xl font-extrabold tracking-[0.35em] text-stone-900 focus:border-[#830020] focus:outline-none dark:border-emerald-700 dark:bg-stone-900 dark:text-stone-100"
                />
              </div>

              {handoverError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
                >
                  {handoverError}
                </div>
              )}

              <Button
                type="submit"
                disabled={handoverInput.length !== 4 || isConfirming}
                loading={isConfirming}
                variant="primary"
                className="w-full min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm"
              >
                Confirm received
              </Button>
            </form>
          )}
        </section>
      )}

      {/* 6-Step Live Order Progress Timeline */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs space-y-4">
        <StatusTimeline
          status={order.status}
          etaText={etaText}
          showNightSafeNotice={isNightSafetyActive()}
          timestamps={{
            placedAt: order.placedAt,
            acceptedAt: order.acceptedAt,
            outForDeliveryAt: order.outForDeliveryAt,
            atGateAt: order.atGateAt,
            deliveredAt: order.deliveredAt,
          }}
        />

        {/* Vendor contact + Cancel + Report actions */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border-subtle)] pt-3">
          {order.vendorPhone && (
            <a
              href={`tel:${order.vendorPhone}`}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3.5 text-xs font-bold text-[var(--color-text)] hover:border-[#830020] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <Phone className="h-3.5 w-3.5 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
              <span>Call {order.vendorName}</span>
            </a>
          )}

          {canCancel && (
            <Button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              variant="ghost"
              size="sm"
              className="min-h-[44px] text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300 text-xs font-bold"
            >
              Cancel Order
            </Button>
          )}

          {canReport && !issueSubmittedId && (
            <Button
              type="button"
              onClick={() => setIssueModalOpen(true)}
              variant="ghost"
              size="sm"
              className="min-h-[44px] text-xs font-semibold text-[var(--color-text-muted)]"
            >
              <MessageSquareWarning className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              <span>Report a problem</span>
            </Button>
          )}
        </div>

        {issueSubmittedId && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <MessageSquareWarning className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Problem reported to TreFood campus support ({order.existingIssue?.reason || issueReason}).</span>
          </div>
        )}
      </div>

      {/* Concise Push / In-App Notification Status Card */}
      {isActive && <OrderPushStatusCard compact />}

      {/* Post-Delivery Review & Reorder Actions */}
      {isDelivered && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs space-y-3">
          {reviewSubmitted ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>Review saved. Thank you for rating {order.vendorName}!</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-[var(--color-text)]">
                  How was your order?
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Rate packaging and gate handover speed
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setReviewSheetOpen(true)}
                className="min-h-[44px]"
              >
                <Star className="mr-1.5 h-4 w-4 fill-[#FFB400] text-[#FFB400]" aria-hidden="true" />
                <span>Rate & Review</span>
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Button
              type="button"
              onClick={handleOrderAgain}
              variant="primary"
              size="sm"
              className="flex-1 min-h-[44px]"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
              <span>Reorder Items</span>
            </Button>
          </div>
        </div>
      )}

      {/* Itemized Bill */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Items Ordered ({order.items?.length || 0})
        </h2>
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {order.items?.map((item, idx) => (
            <div key={item.id || idx} className="py-2.5 flex justify-between items-center text-xs">
              <div>
                <span className="font-semibold text-[var(--color-text)]">
                  {item.quantity}x {item.name}
                </span>
                {item.notes && (
                  <div className="text-[11px] text-[var(--color-text-muted)] italic">
                    Note: {item.notes}
                  </div>
                )}
              </div>
              <span className="font-mono font-medium text-[var(--color-text)]">
                ₹{((item.pricePaise * item.quantity) / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--color-border-subtle)] pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-[var(--color-text-muted)]">
            <span>Items subtotal</span>
            <span className="font-mono">₹{(order.subtotalPaise / 100).toFixed(2)}</span>
          </div>
          {(order.packingTotalPaise ?? 0) > 0 && (
            <div className="flex justify-between text-[var(--color-text-muted)]">
              <span>Packing charges</span>
              <span className="font-mono">₹{((order.packingTotalPaise || 0) / 100).toFixed(2)}</span>
            </div>
          )}
          {(order.discountPaise ?? 0) > 0 && (
            <div className="flex justify-between font-semibold text-emerald-700 dark:text-emerald-400">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
              <span className="font-mono">-₹{((order.discountPaise || 0) / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-[var(--color-text-muted)]">
            <span>Delivery Fee</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">FREE</span>
          </div>
          <div className="flex justify-between text-[var(--color-text-muted)]">
            <span>Payment</span>
            <span className="font-semibold text-[var(--color-text)]">
              {order.paymentMethod === 'upi_simulated'
                ? 'Paid via UPI (Simulated)'
                : 'Pay at Gate (Cash or UPI)'}
            </span>
          </div>
          {order.note && (
            <div className="flex justify-between text-[var(--color-text-muted)]">
              <span>Delivery instruction</span>
              <span className="font-medium text-right max-w-[210px] truncate">{order.note}</span>
            </div>
          )}
          {order.contactPhone && (
            <div className="flex justify-between text-[var(--color-text-muted)]">
              <span>Contact</span>
              <span className="font-mono">{order.contactPhone}</span>
            </div>
          )}
          <div className="flex justify-between pt-1.5 font-bold text-sm text-[var(--color-text)]">
            <span>{order.paymentMethod === 'upi_simulated' ? 'Total Paid' : 'Total to Collect'}</span>
            <span className="font-mono text-[#830020] dark:text-[#FFB400]">
              ₹{(order.totalPaise / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      <Dialog
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Order?"
        description="Orders can only be cancelled before the campus vendor begins preparing food."
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label
              htmlFor="cancel-reason-select"
              className="text-xs font-semibold text-[var(--color-text)]"
            >
              Reason for cancellation
            </label>
            <select
              id="cancel-reason-select"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text)]"
            >
              <option value="Change of plans">Change of plans</option>
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Too long ETA">Too long ETA</option>
              <option value="Gate curfew approaching">Gate curfew approaching</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCancelModalOpen(false)} className="min-h-[44px]">
              Keep Order
            </Button>
            <Button
              variant="danger"
              loading={isCancelling}
              onClick={handleCancelOrder}
              className="min-h-[44px]"
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Report a Problem Modal */}
      <Dialog
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Report a Problem"
        description="Your report goes straight to the TreFood NIT Patna support queue."
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label
              htmlFor="issue-reason-select"
              className="text-xs font-semibold text-[var(--color-text)]"
            >
              What went wrong?
            </label>
            <select
              id="issue-reason-select"
              value={issueReason}
              onChange={(e) =>
                setIssueReason(
                  e.target.value as
                    | 'wrong_item'
                    | 'missing_item'
                    | 'quality'
                    | 'late'
                    | 'not_at_gate'
                    | 'other'
                )
              }
              className="min-h-[44px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text)]"
            >
              <option value="not_at_gate">Partner not at gate yet</option>
              <option value="late">Order delayed significantly</option>
              <option value="wrong_item">Wrong item delivered</option>
              <option value="missing_item">Missing item from packet</option>
              <option value="quality">Quality or temperature issue</option>
              <option value="other">Other issue</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="issue-details-input"
              className="text-xs font-semibold text-[var(--color-text)]"
            >
              Details
            </label>
            <textarea
              id="issue-details-input"
              rows={3}
              placeholder="Describe the issue (e.g. packet arrived 25 mins late or samosa missing)..."
              value={issueDescription}
              onChange={(e) => {
                setIssueDescription(e.target.value);
                if (issueError) setIssueError(null);
              }}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text)]"
            />
          </div>

          {issueError && (
            <div role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
              {issueError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIssueModalOpen(false)} className="min-h-[44px]">
              Close
            </Button>
            <Button
              variant="primary"
              loading={isSubmittingIssue}
              onClick={handleSubmitIssue}
              className="min-h-[44px]"
            >
              Submit Report
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Post-Delivery Rating & Review Sheet */}
      <RateReviewSheet
        open={reviewSheetOpen}
        onClose={() => setReviewSheetOpen(false)}
        orderId={order.id}
        vendorName={order.vendorName || 'Campus Vendor'}
        publicNo={order.publicNo}
        onSubmitted={() => {
          setReviewSubmitted(true);
          fetchOrder(true, false);
        }}
      />
    </div>
  );
}
