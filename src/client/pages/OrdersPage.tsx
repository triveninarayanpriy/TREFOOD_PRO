import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { CheckoutModal } from '../components/cart/CheckoutModal';
import { useSeoHead } from '../components/seo/SeoHead';
import {
  ShoppingBag,
  Clock,
  ChevronRight,
  LogIn,
} from 'lucide-react';
import type { OrderSummary } from '@shared/types';

export function OrdersPage() {
  useSeoHead({
    title: 'Your Campus Orders & Handover Codes | TreFood NIT Patna',
    description: 'Track live NIT Patna hostel gate deliveries, handover codes, and past campus orders.',
    path: '/orders',
    noIndex: true,
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);

  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useQuery<{ ok: boolean; orders: OrderSummary[] }>({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Could not load orders');
      return res.json();
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState
          icon={<LogIn className="h-8 w-8 text-stone-400" />}
          title="Sign in to view your orders"
          description="Track active deliveries, view packet handover codes, and review your campus order history."
          actionLabel="Sign In with Campus Account"
          onAction={() => setSignInOpen(true)}
        />
        <CheckoutModal open={signInOpen} onClose={() => setSignInOpen(false)} />
      </div>
    );
  }

  const orders = ordersData?.orders || [];

  return (
    <div className="mx-auto max-w-xl px-4 py-4 space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Order History
          </h1>
          <p className="text-xs text-stone-500">Track current and past campus packets</p>
        </div>
        <Button onClick={() => navigate('/browse')} variant="secondary" size="sm">
          + New Order
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8 text-stone-400" />}
          title="No orders yet"
          description="You haven't placed any campus orders yet. Explore our canteens and fruit stalls!"
          actionLabel="Browse Canteens"
          onAction={() => navigate('/browse')}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isActive = ['placed', 'accepted', 'out_for_delivery', 'at_gate'].includes(
              order.status
            );

            const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'brand'> = {
              placed: 'warning',
              accepted: 'brand',
              out_for_delivery: 'brand',
              at_gate: 'success',
              delivered: 'default',
              cancelled: 'danger',
              expired: 'danger',
            };

            const statusLabels: Record<string, string> = {
              placed: 'Placed',
              accepted: 'Preparing',
              out_for_delivery: 'Out for delivery',
              at_gate: 'At Gate',
              delivered: 'Delivered',
              cancelled: 'Cancelled',
              expired: 'Expired',
            };

            return (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-xs transition-all hover:border-[#830020] hover:shadow-md cursor-pointer dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-400">
                        #{order.publicNo}
                      </span>
                      <Badge variant={statusVariants[order.status] || 'default'}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-stone-900 dark:text-stone-100">
                      {order.vendorName}
                    </h3>
                    <p className="text-xs text-stone-500">
                      {order.gateName} • {new Date(order.createdAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-stone-900 dark:text-stone-100">
                      ₹{(order.totalPaise / 100).toFixed(2)}
                    </span>
                    <div className="mt-2 flex items-center justify-end text-xs text-[#830020] dark:text-amber-400 font-semibold gap-0.5">
                      <span>View</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>

                {isActive && (
                  <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2 text-xs text-stone-500 dark:border-stone-800">
                    <div className="flex items-center gap-1.5 font-mono text-amber-700 dark:text-amber-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Code: {order.handoverCode}</span>
                    </div>
                    <span className="font-semibold text-emerald-600">Active Order</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
