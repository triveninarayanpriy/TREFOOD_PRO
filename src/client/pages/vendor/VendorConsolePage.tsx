import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { useSeoHead } from '../../components/seo/SeoHead';
import {
  Bell,
  Clock,
  Printer,
  Layers,
  Power,
  Download,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Flame,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface VendorOrder {
  id: string;
  publicNo: string;
  status: 'placed' | 'accepted' | 'out_for_delivery' | 'at_gate' | 'delivered' | 'cancelled' | 'expired';
  totalPaise: number;
  subtotalPaise: number;
  handoverCode: string;
  gateName: string;
  etaAt?: number | null;
  placedAt?: number | null;
  acceptedAt?: number | null;
  createdAt: number;
  cancelReason?: string | null;
  items: Array<{
    id: string;
    name: string;
    pricePaise: number;
    quantity: number;
    notes?: string | null;
  }>;
}

interface MenuItemData {
  id: string;
  categoryId: string;
  name: string;
  nameHi?: string;
  pricePaise: number;
  inStock: boolean;
}

// Web Audio synthesizer for counter chime
function playOrderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Two-tone bell chord
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

export function VendorConsolePage() {
  useSeoHead({
    title: 'Vendor Counter Tablet Console (/v) | TreFood NIT Patna',
    description: 'Manage live gate orders, kitchen prep timers, stock toggles, and daily settlements.',
    path: '/v',
    noIndex: true,
  });
  const { user, loginAsDemo, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'board' | 'stock' | 'settlement'>('board');
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [isCanteenOpen, setIsCanteenOpen] = useState(true);

  // Tablet screen wake lock state
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // New order visual flash
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  const lastKnownOrderCountRef = useRef(0);

  // Print Slip
  const [printOrder, setPrintOrder] = useState<VendorOrder | null>(null);

  // Reject Dialog
  const [rejectOrder, setRejectOrder] = useState<VendorOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('Out of stock ingredient');
  const [isRejecting, setIsRejecting] = useState(false);

  // Stock items
  const [menuItemsList, setMenuItemsList] = useState<MenuItemData[]>([]);
  const [stockLoading, setStockLoading] = useState(false);

  // Settlement
  const [settlementData, setSettlementData] = useState<any>(null);

  // Action busy states
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Polling orders every 4s
  const fetchOrders = useCallback(async (isInitial = false) => {
    if (!user || (user.role !== 'vendor' && user.role !== 'admin')) return;

    try {
      const res = await fetch('/api/vendor/orders');
      if (res.ok) {
        const data = (await res.json()) as any;
        const incomingOrders: VendorOrder[] = data.orders || [];

        // Check if new 'placed' orders arrived
        const currentNewCount = incomingOrders.filter((o) => o.status === 'placed').length;
        if (!isInitial && currentNewCount > lastKnownOrderCountRef.current) {
          playOrderChime();
          setNewOrderFlash(true);
          setTimeout(() => setNewOrderFlash(false), 2000);
          showToast('🔔 New order received on counter!', 'info');
        }
        lastKnownOrderCountRef.current = currentNewCount;
        setOrders(incomingOrders);
      }
    } catch {
    } finally {
      // initial fetch finished
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchOrders(true);
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Screen Wake Lock API
  const toggleWakeLock = async () => {
    if (wakeLockActive && wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
        showToast('Screen wake lock released', 'info');
      } catch {}
    } else {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
          showToast('Screen kept active for counter tablet', 'success');
        } else {
          showToast('Wake Lock not supported on this browser', 'warning');
        }
      } catch {
        showToast('Could not enable wake lock', 'warning');
      }
    }
  };

  // Status transitions
  const handleUpdateStatus = async (
    orderId: string,
    status: 'accepted' | 'out_for_delivery' | 'at_gate',
    prepMinutes = 15
  ) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, prepMinutes }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        showToast(data.error?.message || 'Could not update status', 'error');
      } else {
        showToast(`Order marked as ${status.replace('_', ' ')}`, 'success');
        fetchOrders(false);
      }
    } catch {
      showToast('Network error updating order', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Reject order
  const handleConfirmReject = async () => {
    if (!rejectOrder) return;
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/vendor/orders/${rejectOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancelReason: rejectReason }),
      });
      if (res.ok) {
        showToast('Order rejected', 'info');
        setRejectOrder(null);
        fetchOrders(false);
      } else {
        showToast('Could not reject order', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  // Toggle open/closed or busy
  const handleToggleOpen = async (isOpen: boolean) => {
    try {
      const res = await fetch('/api/vendor/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen }),
      });
      if (res.ok) {
        showToast(isOpen ? 'Canteen marked OPEN' : 'Canteen marked CLOSED', 'info');
      }
    } catch {}
  };

  const handleToggleBusy = async (minutes: number) => {
    try {
      const res = await fetch('/api/vendor/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busyMinutes: minutes }),
      });
      if (res.ok) {
        showToast(
          minutes > 0 ? `Canteen set to BUSY for ${minutes} mins` : 'Busy mode cleared',
          'info'
        );
      }
    } catch {}
  };

  // Load menu stock
  const loadStock = async () => {
    setStockLoading(true);
    try {
      const res = await fetch('/api/vendor/menu');
      if (res.ok) {
        const data = (await res.json()) as any;
        setMenuItemsList(data.items || []);
      }
    } catch {} finally {
      setStockLoading(false);
    }
  };

  const handleToggleItemStock = async (itemId: string, inStock: boolean) => {
    try {
      const res = await fetch(`/api/vendor/menu/item/${itemId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inStock }),
      });
      if (res.ok) {
        setMenuItemsList((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, inStock } : item))
        );
        showToast(inStock ? 'Item marked in stock' : 'Item marked out of stock', 'info');
      }
    } catch {}
  };

  // Load settlement
  const loadSettlement = async () => {
    try {
      const res = await fetch('/api/vendor/settlement');
      if (res.ok) {
        const data = await res.json();
        setSettlementData(data);
      }
    } catch {}
  };

  const downloadSettlementCsv = () => {
    if (!settlementData?.orders) return;
    const header = 'Order No,Delivered At,Amount (INR),Code\n';
    const rows = settlementData.orders
      .map(
        (o: any) =>
          `${o.publicNo},${new Date(o.deliveredAt * 1000).toISOString()},${(o.totalPaise / 100).toFixed(2)},${o.handoverCode}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trefood-settlement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Loading guard
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#830020] border-t-transparent dark:border-amber-400" />
      </div>
    );
  }

  // Check role guard
  if (!user || (user.role !== 'vendor' && user.role !== 'admin')) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <Layers className="h-7 w-7 text-[#830020] dark:text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
          Vendor Console Access
        </h2>
        <p className="text-xs text-stone-600 dark:text-stone-400">
          This counter tablet interface is restricted to campus vendors and administrators.
        </p>
        <div className="pt-4">
          <Button
            onClick={async () => {
              const res = await loginAsDemo('vendor');
              if (res.ok) {
                showToast('Signed in as Ganga Canteen Vendor', 'success');
                fetchOrders(true);
              }
            }}
            variant="primary"
            className="w-full min-h-[56px] text-base font-bold"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            1-Tap Login as Vendor (Ganga Canteen)
          </Button>
        </div>
      </div>
    );
  }

  // Filter 4 columns
  const newOrders = orders.filter((o) => o.status === 'placed');
  const preparingOrders = orders.filter((o) => o.status === 'accepted');
  const outOrders = orders.filter((o) => o.status === 'out_for_delivery');
  const atGateOrders = orders.filter((o) => o.status === 'at_gate');

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col">
      {/* High-Contrast Counter Header */}
      <header className="border-b border-stone-200 bg-white px-4 py-2.5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#830020] text-amber-400 font-bold">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight">TreFood Counter</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-stone-500">Ganga Canteen • NIT Patna</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
            <button
              onClick={() => setActiveTab('board')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'board'
                  ? 'bg-white text-stone-900 shadow-xs dark:bg-stone-700 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
              }`}
            >
              Order Board ({orders.filter((o) => ['placed', 'accepted', 'out_for_delivery', 'at_gate'].includes(o.status)).length})
            </button>
            <button
              onClick={() => {
                setActiveTab('stock');
                loadStock();
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'stock'
                  ? 'bg-white text-stone-900 shadow-xs dark:bg-stone-700 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
              }`}
            >
              Menu Stock
            </button>
            <button
              onClick={() => {
                setActiveTab('settlement');
                loadSettlement();
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'settlement'
                  ? 'bg-white text-stone-900 shadow-xs dark:bg-stone-700 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
              }`}
            >
              Daily Settlement
            </button>
          </div>

          {/* Counter Controls: Sound test, Wake lock, Busy toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleWakeLock}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition-all ${
                wakeLockActive
                  ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300'
                  : 'bg-white text-stone-600 border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300'
              }`}
              title="Keep tablet screen awake during counter shifts"
            >
              <Power className="h-3.5 w-3.5" />
              <span>{wakeLockActive ? 'Awake ON' : 'Stay Awake'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const nextOpen = !isCanteenOpen;
                setIsCanteenOpen(nextOpen);
                handleToggleOpen(nextOpen);
              }}
              className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${
                isCanteenOpen
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300'
              }`}
            >
              {isCanteenOpen ? 'OPEN' : 'CLOSED'}
            </button>

            <button
              type="button"
              onClick={() => handleToggleBusy(30)}
              className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            >
              Busy 30m
            </button>

            <button
              type="button"
              onClick={() => playOrderChime()}
              className="rounded-xl border border-stone-200 bg-white p-2 text-stone-600 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              title="Test counter bell"
              aria-label="Test bell chime"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-x-auto">
        {activeTab === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-w-[900px] h-full">
            {/* Column 1: NEW (placed) */}
            <div
              className={`flex flex-col rounded-2xl border bg-white p-3 dark:bg-stone-900 transition-colors ${
                newOrderFlash
                  ? 'border-amber-500 ring-4 ring-amber-400/30'
                  : 'border-stone-200 dark:border-stone-800'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-ping" />
                  <h3 className="font-extrabold text-sm tracking-wide uppercase text-stone-900 dark:text-stone-100">
                    New Orders
                  </h3>
                </div>
                <Badge variant="warning">{newOrders.length}</Badge>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pt-3">
                {newOrders.length === 0 ? (
                  <div className="py-12 text-center text-xs text-stone-400">No new incoming orders</div>
                ) : (
                  newOrders.map((order) => (
                    <div
                      key={order.id}
                      data-order-no={order.publicNo}
                      className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-base font-extrabold text-stone-900 dark:text-stone-100">
                            #{order.publicNo}
                          </span>
                          <div className="text-xs font-bold text-[#830020] dark:text-amber-400">
                            {order.gateName}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-base font-extrabold text-stone-900 dark:text-stone-100">
                            ₹{(order.totalPaise / 100).toFixed(2)}
                          </span>
                          <div className="text-[11px] text-stone-500">Pay at gate</div>
                        </div>
                      </div>

                      {/* Items List with Notes */}
                      <div className="rounded-lg bg-white p-2.5 dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                        {order.items.map((item, i) => (
                          <div key={i} className="py-1">
                            <span className="font-bold">
                              {item.quantity}x {item.name}
                            </span>
                            {item.notes && (
                              <div className="mt-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                                Note: {item.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Accept Presets (56px touch target compliant) */}
                      <div>
                        <div className="text-[11px] font-semibold text-stone-500 mb-1.5">
                          Accept with prep time:
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[10, 15, 20, 30].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => handleUpdateStatus(order.id, 'accepted', mins)}
                              disabled={updatingId === order.id}
                              className="min-h-[48px] rounded-xl bg-[#830020] text-white font-extrabold text-xs hover:bg-[#68001a] active:scale-95 transition-all shadow-xs"
                            >
                              {mins}m
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reject and Print */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setPrintOrder(order)}
                          className="flex items-center gap-1 font-semibold text-stone-600 hover:text-stone-900 underline"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print Slip</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectOrder(order)}
                          className="font-semibold text-red-600 hover:text-red-700"
                        >
                          Reject Order
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: PREPARING (accepted) */}
            <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-600" />
                  <h3 className="font-extrabold text-sm tracking-wide uppercase text-stone-900 dark:text-stone-100">
                    Preparing
                  </h3>
                </div>
                <Badge variant="brand">{preparingOrders.length}</Badge>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pt-3">
                {preparingOrders.length === 0 ? (
                  <div className="py-12 text-center text-xs text-stone-400">No active kitchen orders</div>
                ) : (
                  preparingOrders.map((order) => (
                    <div
                      key={order.id}
                      data-order-no={order.publicNo}
                      className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-850 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-base font-extrabold text-stone-900 dark:text-stone-100">
                            #{order.publicNo}
                          </span>
                          <div className="text-xs font-bold text-stone-600 dark:text-stone-300">
                            {order.gateName}
                          </div>
                        </div>
                        <span className="font-mono text-sm font-bold">
                          ₹{(order.totalPaise / 100).toFixed(2)}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="rounded-lg bg-white p-2.5 dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                        {order.items.map((item, i) => (
                          <div key={i} className="py-1">
                            <span className="font-bold">
                              {item.quantity}x {item.name}
                            </span>
                            {item.notes && (
                              <div className="mt-0.5 text-amber-700 text-[11px] font-semibold">
                                Note: {item.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Ready for delivery Button (min-h 56px) */}
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'out_for_delivery')}
                        disabled={updatingId === order.id}
                        className="w-full min-h-[56px] rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-98"
                      >
                        <span>Ready • Send to Gate</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setPrintOrder(order)}
                          className="flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-800"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Slip</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: OUT FOR DELIVERY */}
            <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <h3 className="font-extrabold text-sm tracking-wide uppercase text-stone-900 dark:text-stone-100">
                    On Route
                  </h3>
                </div>
                <Badge variant="default">{outOrders.length}</Badge>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pt-3">
                {outOrders.length === 0 ? (
                  <div className="py-12 text-center text-xs text-stone-400">None on the way</div>
                ) : (
                  outOrders.map((order) => (
                    <div
                      key={order.id}
                      data-order-no={order.publicNo}
                      className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-850 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-base font-extrabold text-stone-900 dark:text-stone-100">
                            #{order.publicNo}
                          </span>
                          <div className="text-xs font-bold text-blue-700 dark:text-blue-300">
                            Heading to {order.gateName}
                          </div>
                        </div>
                        <span className="font-mono text-sm font-bold">
                          ₹{(order.totalPaise / 100).toFixed(2)}
                        </span>
                      </div>

                      {/* Reached Gate Action (min-h 56px) */}
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'at_gate')}
                        disabled={updatingId === order.id}
                        className="w-full min-h-[56px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-98"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Arrived at Gate</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 4: AT GATE (Awaiting customer 4-digit match) */}
            <div className="flex flex-col rounded-2xl border-2 border-emerald-300 bg-emerald-50/30 p-3 dark:border-emerald-800 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100 dark:border-emerald-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-extrabold text-sm tracking-wide uppercase text-emerald-900 dark:text-emerald-200">
                    At Gate (Handover)
                  </h3>
                </div>
                <Badge variant="success">{atGateOrders.length}</Badge>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pt-3">
                {atGateOrders.length === 0 ? (
                  <div className="py-12 text-center text-xs text-stone-400">No packets at gate</div>
                ) : (
                  atGateOrders.map((order) => (
                    <div
                      key={order.id}
                      data-order-no={order.publicNo}
                      className="rounded-xl border border-emerald-300 bg-white p-4 dark:border-emerald-800 dark:bg-stone-900 space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-base font-extrabold text-stone-900 dark:text-stone-100">
                            #{order.publicNo}
                          </span>
                          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            {order.gateName}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-base font-bold text-stone-900 dark:text-stone-100">
                            ₹{(order.totalPaise / 100).toFixed(2)}
                          </span>
                          <div className="text-[10px] text-emerald-600 font-bold uppercase">
                            Collect Cash/UPI
                          </div>
                        </div>
                      </div>

                      {/* Oversized 4-digit code for matching packet */}
                      <div className="rounded-xl bg-emerald-50 p-3 text-center border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800">
                        <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">
                          Packet Handover Code
                        </div>
                        <div className="font-mono text-3xl font-black tracking-widest text-emerald-900 dark:text-emerald-100 py-1">
                          {order.handoverCode}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          Match with customer phone screen
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Menu Stock */}
        {activeTab === 'stock' && (
          <div className="mx-auto max-w-2xl bg-white p-6 rounded-2xl border border-stone-200 dark:border-stone-800 dark:bg-stone-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h2 className="text-lg font-bold">1-Tap Menu Stock Management</h2>
                <p className="text-xs text-stone-500">
                  Instantly hide dishes from students when ingredients run out.
                </p>
              </div>
              <Button onClick={loadStock} variant="secondary" size="sm">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>

            {stockLoading ? (
              <div className="py-8 text-center text-xs text-stone-400">Loading menu...</div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {menuItemsList.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {item.name}
                      </div>
                      <span className="font-mono text-xs text-stone-500">
                        ₹{(item.pricePaise / 100).toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleItemStock(item.id, !item.inStock)}
                      className={`min-h-[44px] min-w-[120px] rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        item.inStock
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 dark:bg-red-950 dark:text-red-300'
                      }`}
                    >
                      {item.inStock ? 'In Stock' : 'Sold Out'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Daily Settlement */}
        {activeTab === 'settlement' && (
          <div className="mx-auto max-w-2xl bg-white p-6 rounded-2xl border border-stone-200 dark:border-stone-800 dark:bg-stone-900 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h2 className="text-lg font-bold">Daily Settlement & Sales</h2>
                <p className="text-xs text-stone-500">Summary of today&apos;s delivered orders</p>
              </div>
              <Button onClick={downloadSettlementCsv} variant="primary" size="sm">
                <Download className="mr-1.5 h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-stone-50 p-4 border border-stone-100 dark:bg-stone-850 dark:border-stone-800 text-center">
                <div className="text-xs text-stone-500 font-semibold uppercase">
                  Orders Delivered
                </div>
                <div className="text-3xl font-extrabold font-mono mt-1 text-[#830020] dark:text-amber-400">
                  {settlementData?.totalDeliveredCount || 0}
                </div>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4 border border-stone-100 dark:bg-stone-850 dark:border-stone-800 text-center">
                <div className="text-xs text-stone-500 font-semibold uppercase">
                  Total Collected (₹)
                </div>
                <div className="text-3xl font-extrabold font-mono mt-1 text-emerald-600">
                  ₹{(settlementData?.totalCollectedRupees || 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Delivered Packets Log
              </h4>
              <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs font-mono">
                {settlementData?.orders?.map((o: any) => (
                  <div key={o.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold">#{o.publicNo}</span>
                      <span className="ml-2 text-stone-400">Code: {o.handoverCode}</span>
                    </div>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      ₹{(o.totalPaise / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Printable Packet Slip Modal (Supports 58mm Thermal & A6 Print) */}
      <Dialog
        open={!!printOrder}
        onClose={() => setPrintOrder(null)}
        title="Print Packet Slip"
        description="Print a thermal packet slip with oversized 4-digit code to paste on the packet."
      >
        {printOrder && (
          <div className="space-y-4 pt-2">
            <div
              id="print-slip"
              className="border-2 border-dashed border-stone-300 p-4 bg-white text-stone-950 font-mono text-xs rounded-xl space-y-2"
            >
              <div className="text-center pb-2 border-b border-stone-300">
                <div className="text-base font-extrabold">TREFOOD NIT PATNA</div>
                <div className="text-xs">Ganga Canteen • Campus Delivery</div>
              </div>

              <div className="flex justify-between font-bold pt-1">
                <span>ORDER #{printOrder.publicNo}</span>
                <span>{printOrder.gateName}</span>
              </div>

              {/* Huge 4-digit code */}
              <div className="my-2 border-2 border-black p-2 text-center rounded">
                <div className="text-[10px] uppercase font-bold">HANDOVER CODE</div>
                <div className="text-3xl font-black tracking-widest">{printOrder.handoverCode}</div>
              </div>

              <div className="divide-y divide-stone-200 py-1">
                {printOrder.items.map((it, idx) => (
                  <div key={idx} className="py-1">
                    <div className="flex justify-between font-bold">
                      <span>
                        {it.quantity}x {it.name}
                      </span>
                      <span>₹{((it.pricePaise * it.quantity) / 100).toFixed(2)}</span>
                    </div>
                    {it.notes && (
                      <div className="text-[10px] italic">SPECIAL: {it.notes}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-300 flex justify-between font-bold text-sm">
                <span>COLLECT AT GATE:</span>
                <span>₹{(printOrder.totalPaise / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setPrintOrder(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Print Now
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Reject Order Dialog */}
      <Dialog
        open={!!rejectOrder}
        onClose={() => setRejectOrder(null)}
        title="Reject Order?"
        description="Please provide a reason so the student knows why the canteen could not fulfill this order."
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Reason for rejection</label>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="h-10 w-full rounded-xl border border-stone-300 px-3 text-xs dark:border-stone-700 dark:bg-stone-850"
            >
              <option value="Out of stock ingredient">Out of stock ingredient</option>
              <option value="Kitchen rush / closing for break">Kitchen rush / closing for break</option>
              <option value="Cannot deliver before gate curfew">Cannot deliver before gate curfew</option>
              <option value="Canteen power / equipment issue">Canteen power / equipment issue</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRejectOrder(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={isRejecting} onClick={handleConfirmReject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
