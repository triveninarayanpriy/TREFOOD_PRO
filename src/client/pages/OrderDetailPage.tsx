import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HandoverTicket } from '../components/ui/HandoverTicket';
import { Stepper } from '../components/ui/Stepper';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { Dialog } from '../components/ui/Dialog';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useToast } from '../components/ui/Toast';
import { useCart } from '../context/CartContext';
import { useSeoHead } from '../components/seo/SeoHead';
import {
  CheckCircle2,
  ArrowLeft,
  Star,
  MessageSquareWarning,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import type { OrderDetail } from '@shared/types';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  useSeoHead({
    title: 'Live Handover Ticket & Tracker | TreFood NIT Patna',
    description: 'Track your campus order status in real time and confirm the 4-digit packet code at your gate.',
    path: `/orders/${id || ''}`,
    noIndex: true,
  });
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { addItem, clearCart } = useCart();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  // Delivery confirmation checkbox
  const [packetDigitsMatched, setPacketDigitsMatched] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Cancel order modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [isCancelling, setIsCancelling] = useState(false);

  // Review & Rating
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Issue reporting
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueType, setIssueType] = useState<'wrong_item' | 'missing_item' | 'quality' | 'late' | 'other'>('wrong_item');
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  const etagRef = useRef<string | null>(null);
  const backoffRef = useRef(5000);
  const hasVibratedRef = useRef(false);

  // Fetch / Poll Order with ETag support
  const fetchOrder = async (isInitial = false) => {
    if (!id) return;

    try {
      const headers: Record<string, string> = {};
      if (etagRef.current && !isInitial) {
        headers['If-None-Match'] = etagRef.current;
      }

      const res = await fetch(`/api/orders/${id}`, { headers });

      if (res.status === 304) {
        // Not modified - everything is fresh!
        setReconnecting(false);
        backoffRef.current = 5000;
        return;
      }

      if (!res.ok) {
        if (isInitial) setError('Could not load order details.');
        setReconnecting(true);
        backoffRef.current = Math.min(backoffRef.current * 1.5, 20000);
        return;
      }

      const newEtag = res.headers.get('ETag');
      if (newEtag) etagRef.current = newEtag;

      const data = (await res.json()) as any;
      if (data.ok && data.order) {
        setOrder(data.order);
        setReconnecting(false);
        backoffRef.current = 5000;

        // Vibrate once when arriving at gate!
        if (data.order.status === 'at_gate' && !hasVibratedRef.current) {
          hasVibratedRef.current = true;
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
          showToast('Your packet has arrived at the gate! Match the 4 digits to collect.', 'success');
        }
      }
    } catch {
      setReconnecting(true);
      backoffRef.current = Math.min(backoffRef.current * 1.5, 20000);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder(true);

    let timeoutId: any;
    let isCancelled = false;

    const poll = async () => {
      // Only poll if tab is visible and order is still active
      if (!isCancelled && document.visibilityState === 'visible') {
        if (order && (order.status === 'delivered' || order.status === 'cancelled' || order.status === 'expired')) {
          return; // No need to keep polling completed orders
        }
        await fetchOrder(false);
      }
      if (!isCancelled) {
        timeoutId = setTimeout(poll, backoffRef.current);
      }
    };

    timeoutId = setTimeout(poll, 5000);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [id, order?.status]);

  const handleConfirmHandover = async () => {
    if (!order || !packetDigitsMatched) return;

    setIsConfirming(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        showToast(data.error?.message || 'Could not confirm delivery.', 'error');
      } else {
        showToast('Delivery confirmed! Enjoy your food.', 'success');
        fetchOrder(false);
      }
    } catch {
      showToast('Network error confirming delivery.', 'error');
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
      const data = (await res.json()) as any;
      if (!res.ok) {
        showToast(data.error?.message || 'Could not cancel order.', 'error');
      } else {
        showToast('Order cancelled.', 'info');
        setCancelModalOpen(false);
        fetchOrder(false);
      }
    } catch {
      showToast('Network error cancelling order.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!order) return;

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: reviewComment }),
      });
      if (res.ok) {
        setReviewSubmitted(true);
        showToast('Thank you for rating your delivery!', 'success');
      } else {
        showToast('Could not save rating.', 'error');
      }
    } catch {
      showToast('Network error submitting review.', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSubmitIssue = async () => {
    if (!order) return;

    setIsSubmittingIssue(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueType, description: issueDescription }),
      });
      if (res.ok) {
        setIssueModalOpen(false);
        showToast('Support issue reported. Our campus team will assist.', 'info');
      } else {
        showToast('Failed to report issue.', 'error');
      }
    } catch {
      showToast('Network error submitting issue.', 'error');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const handleOrderAgain = () => {
    if (!order) return;
    clearCart();
    order.items?.forEach((item: any) => {
      addItem(
        { id: order.vendorId, name: order.vendorName || 'Vendor', slug: order.vendorId },
        { itemId: item.itemId, name: item.name, pricePaise: item.pricePaise }
      );
    });
    showToast(`Items from ${order.vendorName} added to packet!`, 'success');
    navigate('/browse');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <Skeleton className="h-6 w-28 rounded-md" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <ErrorState
          title="Order not found"
          message={error || 'We could not find this order.'}
          onRetry={() => fetchOrder(true)}
        />
        <div className="mt-4 text-center">
          <Button onClick={() => navigate('/orders')} variant="secondary" size="sm">
            View Order History
          </Button>
        </div>
      </div>
    );
  }

  const isDelivered = order.status === 'delivered';
  const isAtGate = order.status === 'at_gate';
  const canCancel = order.status === 'placed';

  return (
    <div className="mx-auto max-w-lg px-4 py-4 space-y-6 pb-20">
      {/* Reconnecting banner if polling faces weak network */}
      {reconnecting && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Reconnecting to campus worker...</span>
        </div>
      )}

      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All Orders</span>
        </button>
        <span className="font-mono text-xs text-stone-400">Order #{order.publicNo}</span>
      </div>

      {/* Signature Handover Ticket */}
      <HandoverTicket
        orderNo={order.publicNo}
        handoverCode={order.handoverCode}
        vendorName={order.vendorName || 'Campus Vendor'}
        gateName={order.gateName || 'Hostel Gate'}
        status={order.status}
        eta={order.etaAt ? `${Math.max(1, Math.round((order.etaAt - Math.floor(Date.now() / 1000)) / 60))} mins` : undefined}
      />

      {/* Status Stepper */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 shadow-xs">
        <Stepper currentStatus={order.status} />
      </div>

      {/* Action Zone based on status */}
      {isAtGate && (
        <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50/60 p-5 dark:border-emerald-700 dark:bg-emerald-950/40 space-y-4">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-bold">Packet reached {order.gateName}!</span>
          </div>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
            Please meet the delivery partner at the gate, check that the packet carries code{' '}
            <span className="font-mono font-bold text-sm bg-white dark:bg-stone-900 px-1.5 py-0.5 rounded border border-emerald-300">
              {order.handoverCode}
            </span>
            , and confirm delivery.
          </p>

          <Checkbox
            label="The 4 digits on my packet match"
            description="Verified with delivery partner at gate"
            checked={packetDigitsMatched}
            onChange={(e) => setPacketDigitsMatched(e.target.checked)}
          />

          <Button
            onClick={handleConfirmHandover}
            disabled={!packetDigitsMatched || isConfirming}
            loading={isConfirming}
            variant="primary"
            className="w-full min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm"
          >
            Confirm Handover & Collected
          </Button>
        </div>
      )}

      {/* Can Cancel button if still in 'placed' status */}
      {canCancel && (
        <div className="flex justify-center">
          <Button
            onClick={() => setCancelModalOpen(true)}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
          >
            Cancel Order
          </Button>
        </div>
      )}

      {/* Post-Delivery Rating & Issue Zone */}
      {isDelivered && (
        <div className="space-y-4">
          {!reviewSubmitted ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Rate your order from {order.vendorName}
              </h3>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none"
                    aria-label={`${star} star`}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-300 dark:text-stone-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Optional feedback (e.g. delicious, hot, prompt)"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs dark:border-stone-700 dark:bg-stone-850"
              />
              <Button
                onClick={handleSubmitReview}
                loading={isSubmittingReview}
                variant="secondary"
                size="sm"
              >
                Submit Rating
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Thank you for rating! Your review helps campus canteens.</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              onClick={handleOrderAgain}
              variant="primary"
              size="sm"
              className="flex-1 min-h-[42px]"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              <span>Order Again</span>
            </Button>
            <Button
              onClick={() => setIssueModalOpen(true)}
              variant="ghost"
              size="sm"
              className="text-stone-600 text-xs"
            >
              <MessageSquareWarning className="mr-1 h-3.5 w-3.5" />
              <span>Report Issue</span>
            </Button>
          </div>
        </div>
      )}

      {/* Order Item Details */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Items Ordered ({order.items?.length || 0})
        </h3>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
              <div>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {item.quantity}x {item.name}
                </span>
                {item.notes && (
                  <div className="text-[11px] text-stone-400 italic">Note: {item.notes}</div>
                )}
              </div>
              <span className="font-mono font-medium text-stone-700 dark:text-stone-300">
                ₹{((item.pricePaise * item.quantity) / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-stone-100 pt-3 dark:border-stone-800 space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-600 dark:text-stone-400">
            <span>Items subtotal</span>
            <span className="font-mono">₹{(order.subtotalPaise / 100).toFixed(2)}</span>
          </div>
          {(order.packingTotalPaise ?? 0) > 0 && (
            <div className="flex justify-between text-stone-600 dark:text-stone-400">
              <span>Packing charges</span>
              <span className="font-mono">₹{((order.packingTotalPaise || 0) / 100).toFixed(2)}</span>
            </div>
          )}
          {(order.discountPaise ?? 0) > 0 && (
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
              <span className="font-mono">-₹{((order.discountPaise || 0) / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-stone-600 dark:text-stone-400">
            <span>Delivery Fee</span>
            <span className="font-bold text-emerald-600">FREE</span>
          </div>
          <div className="flex justify-between text-stone-600 dark:text-stone-400">
            <span>Payment</span>
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              {order.paymentMethod === 'upi_simulated'
                ? 'Paid via UPI (Simulated)'
                : 'Pay at Gate (Cash or UPI)'}
            </span>
          </div>
          {order.note && (
            <div className="flex justify-between text-stone-600 dark:text-stone-400">
              <span>Delivery instruction</span>
              <span className="font-medium text-right max-w-[200px] truncate">{order.note}</span>
            </div>
          )}
          {order.contactPhone && (
            <div className="flex justify-between text-stone-600 dark:text-stone-400">
              <span>Contact</span>
              <span className="font-mono">{order.contactPhone}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 font-bold text-sm text-stone-900 dark:text-stone-100">
            <span>{order.paymentMethod === 'upi_simulated' ? 'Total Paid' : 'Total to Collect'}</span>
            <span className="font-mono text-[#830020] dark:text-amber-400">
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
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Reason for cancellation
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="h-10 w-full rounded-xl border border-stone-300 px-3 text-xs dark:border-stone-700 dark:bg-stone-850"
            >
              <option value="Change of plans">Change of plans</option>
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Too long ETA">Too long ETA</option>
              <option value="Gate curfew approaching">Gate curfew approaching</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCancelModalOpen(false)}>
              Keep Order
            </Button>
            <Button variant="danger" loading={isCancelling} onClick={handleCancelOrder}>
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Report Issue Modal */}
      <Dialog
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Report an Issue"
        description="Let our campus team know if anything was wrong with your packet."
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Issue Category
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as any)}
              className="h-10 w-full rounded-xl border border-stone-300 px-3 text-xs dark:border-stone-700 dark:bg-stone-850"
            >
              <option value="wrong_item">Wrong item delivered</option>
              <option value="missing_item">Missing item from packet</option>
              <option value="quality">Quality or temperature issue</option>
              <option value="late">Unreasonable delivery delay</option>
              <option value="other">Other issue</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Details
            </label>
            <textarea
              rows={3}
              placeholder="Please describe the issue..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              className="w-full rounded-xl border border-stone-300 p-2.5 text-xs dark:border-stone-700 dark:bg-stone-850"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIssueModalOpen(false)}>
              Close
            </Button>
            <Button variant="primary" loading={isSubmittingIssue} onClick={handleSubmitIssue}>
              Submit Issue
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
