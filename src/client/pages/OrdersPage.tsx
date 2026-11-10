import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSeoHead } from '../components/seo/SeoHead';
import { useToast } from '../components/ui/Toast';
import { OrderPushStatusCard } from '../components/notifications/NotificationCentre';
import { RateReviewSheet } from '../components/orders/RateReviewSheet';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';
import {
  Receipt,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Star,
} from 'lucide-react';
import type { OrderSummary } from '@shared/types';

const ACTIVE_STATUSES = new Set(['placed', 'accepted', 'out_for_delivery', 'at_gate']);

export function OrdersPage() {
  useSeoHead({
    title: 'My Campus Orders | TreFood NIT Patna',
    description:
      'View active packet codes, track live gate handovers, reorder favourites, and rate NIT Patna campus meals.',
    path: '/orders',
    noIndex: true,
  });

  const { user, loading: authLoading } = useAuth();
  const { addItem, clearCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  // Review sheet modal state
  const [reviewOrder, setReviewOrder] = useState<OrderSummary | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Could not load order history.');
      const data = (await res.json()) as { orders?: OrderSummary[] };
      const fetched = data.orders || [];
      setOrders(fetched);

      // Default cleanly to 'past' only if there are past orders and zero active orders
      const hasActive = fetched.some((o) => ACTIVE_STATUSES.has(o.status));
      if (!hasActive && fetched.length > 0) {
        setActiveTab('past');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error loading orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/signin?returnTo=/orders&reason=orders', { replace: true });
      } else {
        fetchOrders();
      }
    }
  }, [authLoading, user, navigate, fetchOrders]);

  const handleReorder = (order: OrderSummary) => {
    if (!order.items || order.items.length === 0) {
      navigate(`/vendor/${order.vendorSlug || order.vendorId}`);
      return;
    }

    clearCart();
    order.items.forEach((item) => {
      addItem(
        {
          id: order.vendorId,
          name: order.vendorName,
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
    showToast(`Added ${order.items.length} item(s) from ${order.vendorName} to cart.`, 'success');
    navigate(`/vendor/${order.vendorSlug || order.vendorId}`);
  };

  if (authLoading || (!user && !error)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'placed':
        return {
          label: 'Order Placed',
          color: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200',
          icon: Clock,
        };
      case 'accepted':
        return {
          label: 'Accepted & Preparing',
          color: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
          icon: Clock,
        };
      case 'out_for_delivery':
        return {
          label: 'Out for delivery',
          color: 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200',
          icon: Clock,
        };
      case 'at_gate':
        return {
          label: 'At Gate — Match Code',
          color: 'bg-emerald-800 text-white font-bold',
          icon: CheckCircle2,
        };
      case 'delivered':
        return {
          label: 'Delivered',
          color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
          icon: CheckCircle2,
        };
      case 'cancelled':
      case 'expired':
        return {
          label: status === 'cancelled' ? 'Cancelled' : 'Expired',
          color: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
          icon: XCircle,
        };
      default:
        return {
          label: status,
          color: 'bg-stone-100 text-stone-700',
          icon: Receipt,
        };
    }
  };

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.has(o.status));
  const pastOrders = orders.filter((o) => !ACTIVE_STATUSES.has(o.status));
  const visibleOrders = activeTab === 'active' ? activeOrders : pastOrders;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
            Orders
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Live gate handover codes, active trackers & quick campus reorders
          </p>
        </div>

        {!loading && orders.length > 0 && (
          <div
            role="tablist"
            aria-label="Order filter tabs"
            className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'active'}
              onClick={() => setActiveTab('active')}
              className={`min-h-[44px] rounded-lg px-3.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFB400] ${
                activeTab === 'active'
                  ? 'bg-[#830020] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              Active ({activeOrders.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'past'}
              onClick={() => setActiveTab('past')}
              className={`min-h-[44px] rounded-lg px-3.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFB400] ${
                activeTab === 'past'
                  ? 'bg-[#830020] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              Past ({pastOrders.length})
            </button>
          </div>
        )}
      </div>

      <OrderPushStatusCard compact />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <ErrorState title="Error loading orders" message={error} onRetry={fetchOrders} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-7 w-7 text-[var(--color-text-muted)]" />}
          title="No orders yet"
          description="Hungry? Explore NIT Patna campus canteens and grab a quick bite to your gate."
          actionLabel="Browse Canteens"
          onAction={() => navigate('/app')}
        />
      ) : visibleOrders.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-7 w-7 text-[var(--color-text-muted)]" />}
          title={activeTab === 'active' ? 'No active orders right now' : 'No past orders yet'}
          description={
            activeTab === 'active'
              ? 'Ready to reorder a favourite snack or meal from NIT Patna canteens?'
              : 'Completed deliveries and cancelled tickets will show up here.'
          }
          actionLabel={activeTab === 'active' && pastOrders.length > 0 ? 'View Past Orders' : 'Browse Canteens'}
          onAction={() =>
            activeTab === 'active' && pastOrders.length > 0
              ? setActiveTab('past')
              : navigate('/app')
          }
        />
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            const Icon = badge.icon;
            const dateStr = new Date(order.createdAt * 1000).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Kolkata',
            });
            const itemsSummary =
              order.items && order.items.length > 0
                ? order.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')
                : null;

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs transition-all hover:border-[#830020]/50 dark:hover:border-[#FFB400]/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[var(--color-text-muted)]">
                        #{order.publicNo}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">{dateStr}</span>
                    </div>
                    <h2 className="text-base font-extrabold text-[var(--color-text)] truncate">
                      {order.vendorName}
                    </h2>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Deliver to <span className="font-semibold text-[var(--color-text)]">{order.gateName}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.color}`}
                    >
                      <Icon className="h-3 w-3" aria-hidden="true" />
                      <span>{badge.label}</span>
                    </span>
                    <div className="font-mono text-sm font-extrabold text-[var(--color-text)]">
                      ₹{(order.totalPaise / 100).toFixed(2)}
                    </div>
                  </div>
                </div>

                {itemsSummary && (
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{itemsSummary}</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/orders/${order.id}`}
                      className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-[var(--color-surface-sunken)] px-3.5 text-xs font-bold text-[#830020] hover:bg-[#830020]/10 dark:text-[#FFB400] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
                    >
                      <span>{ACTIVE_STATUSES.has(order.status) ? 'Track live' : 'View details'}</span>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>

                    {!ACTIVE_STATUSES.has(order.status) && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReorder(order)}
                        className="min-h-[44px]"
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        <span>Reorder</span>
                      </Button>
                    )}

                    {order.status === 'delivered' && !order.hasReview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setReviewOrder(order)}
                        className="min-h-[44px] text-xs font-bold text-[#830020] dark:text-[#FFB400]"
                      >
                        <Star className="mr-1.5 h-3.5 w-3.5 fill-[#FFB400] text-[#FFB400]" aria-hidden="true" />
                        <span>Rate & Review</span>
                      </Button>
                    )}

                    {order.status === 'delivered' && order.hasReview && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        <span>Reviewed</span>
                      </span>
                    )}
                  </div>

                  {ACTIVE_STATUSES.has(order.status) && (
                    <span className="font-mono text-xs font-extrabold rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-2.5 py-1 text-[var(--color-text)]">
                      Code: {order.handoverCode}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <RateReviewSheet
        open={Boolean(reviewOrder)}
        onClose={() => setReviewOrder(null)}
        orderId={reviewOrder?.id || null}
        vendorName={reviewOrder?.vendorName || 'Campus Vendor'}
        publicNo={reviewOrder?.publicNo}
        onSubmitted={(ratedOrderId) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === ratedOrderId ? { ...o, hasReview: true } : o))
          );
        }}
      />
    </div>
  );
}
