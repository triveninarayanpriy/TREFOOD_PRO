import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { useSeoHead } from '../../components/seo/SeoHead';
import { getGateCurfewStatus } from '@shared/curfew';
import type { Gate } from '@shared/schemas';
import {
  VendorMenuTab,
  type VendorMenuItemRow,
  type VendorMenuCategoryRow,
} from '../../components/vendor/VendorMenuTab';
import {
  VendorInsightsTab,
  type VendorInsightsPayload,
} from '../../components/vendor/VendorInsightsTab';
import {
  Bell,
  Volume2,
  VolumeX,
  Clock,
  Printer,
  Layers,
  Power,
  CheckCircle2,
  ShieldCheck,
  Flame,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  KeyRound,
  MapPin,
} from 'lucide-react';

interface VendorOrder {
  id: string;
  publicNo: string;
  status: 'placed' | 'accepted' | 'out_for_delivery' | 'at_gate' | 'delivered' | 'cancelled' | 'expired';
  totalPaise: number;
  subtotalPaise: number;
  handoverCode: string;
  codeAttempts?: number;
  gateId: string;
  gateName: string;
  gateCurfewTime?: string;
  gateIs24x7?: boolean;
  etaAt?: number | null;
  placedAt?: number | null;
  acceptedAt?: number | null;
  outForDeliveryAt?: number | null;
  atGateAt?: number | null;
  deliveredAt?: number | null;
  createdAt: number;
  cancelReason?: string | null;
  paymentMethod?: string;
  items: Array<{
    id: string;
    name: string;
    pricePaise: number;
    quantity: number;
    notes?: string | null;
  }>;
}

interface VendorProfileMeta {
  id: string;
  name: string;
  isOpen: boolean;
  busyUntil: number | null;
  prepMinutes: number;
  prepMaxMinutes: number;
  nightSafe: boolean;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

const GATE_WINDOW_SECONDS = 15 * 60;

function formatMmSs(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(clamped / 60)
    .toString()
    .padStart(2, '0');
  const s = (clamped % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function playOrderChime(isMuted: boolean, vibrateAlso = false) {
  if (isMuted) return;
  try {
    const navWithActivation = navigator as Navigator & {
      userActivation?: { hasBeenActive?: boolean };
    };
    if (
      vibrateAlso &&
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator &&
      (!navWithActivation.userActivation || navWithActivation.userActivation.hasBeenActive)
    ) {
      navigator.vibrate([250, 100, 250]);
    }

    const win = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext || win.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio playback may be restricted until user interacts
  }
}

export function VendorConsolePage() {
  useSeoHead({
    title: 'Vendor Counter Tablet Console (/vendor) | TreFood NIT Patna',
    description:
      'Manage live campus gate orders, kitchen prep timers, one-tap stock & prices, and daily insights.',
    path: '/vendor',
    noIndex: true,
  });

  const { user, loginAsDemo, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'board' | 'stock' | 'settlement'>('board');
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [gatesList, setGatesList] = useState<Gate[]>([]);
  const [vendorMeta, setVendorMeta] = useState<VendorProfileMeta | null>(null);

  // Per-order adjustable prep time before accepting
  const [newOrderPrepDrafts, setNewOrderPrepDrafts] = useState<Record<string, number>>({});

  // Live 1-second tick for gate handover countdowns & busy timer
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Mute control persisted in localStorage
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('trefood_vendor_muted') === '1';
  });

  // Tablet Screen Wake Lock state
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  // New order flash highlight
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  const lastKnownOrderCountRef = useRef(0);

  // Modals
  const [printOrder, setPrintOrder] = useState<VendorOrder | null>(null);
  const [rejectOrder, setRejectOrder] = useState<VendorOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('Out of stock ingredient');
  const [customRejectNote, setCustomRejectNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Menu stock & prices tab
  const [menuItemsList, setMenuItemsList] = useState<VendorMenuItemRow[]>([]);
  const [menuCategoriesList, setMenuCategoriesList] = useState<VendorMenuCategoryRow[]>([]);
  const [stockLoading, setStockLoading] = useState(false);

  // Insights & Settlement tab
  const [settlementData, setSettlementData] = useState<VendorInsightsPayload | null>(null);

  // Busy mutation ID
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchOrders = useCallback(
    async (isInitial = false) => {
      if (!user || (user.role !== 'vendor' && user.role !== 'admin')) return;

      try {
        const res = await fetch('/api/vendor/orders');
        if (res.ok) {
          const data = (await res.json()) as {
            orders?: VendorOrder[];
            vendor?: VendorProfileMeta | null;
            gates?: Gate[];
          };
          const incomingOrders: VendorOrder[] = data.orders || [];
          if (data.vendor) setVendorMeta(data.vendor);
          if (data.gates) setGatesList(data.gates);

          const currentNewCount = incomingOrders.filter((o) => o.status === 'placed').length;
          if (!isInitial && currentNewCount > lastKnownOrderCountRef.current) {
            playOrderChime(isMuted, true);
            setNewOrderFlash(true);
            setTimeout(() => setNewOrderFlash(false), 2000);
            showToast('New order received on counter!', 'info');
          }
          lastKnownOrderCountRef.current = currentNewCount;
          setOrders(incomingOrders);
        }
      } catch {
        // Keep current board on transient network hiccup
      }
    },
    [user, showToast, isMuted]
  );

  useEffect(() => {
    fetchOrders(true);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOrders(false);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('trefood_vendor_muted', next ? '1' : '0');
    }
    showToast(
      next ? 'New-order chime and vibration muted' : 'Counter chime and vibration active',
      'info'
    );
  };

  const toggleWakeLock = async () => {
    if (wakeLockActive && wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
        showToast('Screen wake lock released', 'info');
      } catch {
        setWakeLockActive(false);
      }
      return;
    }

    try {
      const navWithWake = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      };
      if (navWithWake.wakeLock) {
        wakeLockRef.current = await navWithWake.wakeLock.request('screen');
        setWakeLockActive(true);
        showToast('Screen kept active for counter tablet', 'success');
      } else {
        showToast('Wake Lock not supported on this browser', 'warning');
      }
    } catch {
      showToast('Could not enable wake lock', 'warning');
    }
  };

  const handleUpdateStatus = async (
    orderId: string,
    status: 'accepted' | 'out_for_delivery' | 'at_gate',
    prepMinutes = 15
  ) => {
    setUpdatingId(orderId);
    try {
      const endpoint =
        status === 'accepted'
          ? `/api/vendor/orders/${orderId}/accept`
          : status === 'out_for_delivery'
          ? `/api/vendor/orders/${orderId}/ready`
          : `/api/vendor/orders/${orderId}/status`;

      const res = await fetch(endpoint, {
        method: status === 'at_gate' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(status === 'at_gate' ? { status } : { prepMinutes }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) {
        showToast(data.error?.message || 'Could not update status', 'error');
      } else {
        showToast(`Order marked ${status.replace(/_/g, ' ')}`, 'success');
        fetchOrders(false);
      }
    } catch {
      showToast('Network error updating order', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAdjustOrderPrep = async (orderId: string, newMinutes: number) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/prep-time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prepMinutes: Math.max(5, Math.min(120, newMinutes)) }),
      });
      if (res.ok) {
        showToast(`Prep time updated to ${newMinutes} mins`, 'success');
        fetchOrders(false);
      } else {
        showToast('Could not adjust order prep time', 'error');
      }
    } catch {
      showToast('Network error updating prep time', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectOrder) return;
    setIsRejecting(true);
    const fullReason =
      customRejectNote.trim().length >= 3
        ? `${rejectReason}: ${customRejectNote.trim()}`
        : rejectReason;
    try {
      const res = await fetch(`/api/vendor/orders/${rejectOrder.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: fullReason }),
      });
      if (res.ok) {
        showToast('Order rejected with reason logged', 'info');
        setRejectOrder(null);
        setCustomRejectNote('');
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

  const handleHandoverAssist = async (orderId: string, completeDelivery: boolean) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/handover-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completeDelivery,
          note: completeDelivery
            ? 'Vendor verified student ID at gate after lockout'
            : 'Vendor unlocked 4-digit attempt counter',
        }),
      });
      if (res.ok) {
        showToast(
          completeDelivery
            ? 'Delivery completed via handover assist'
            : 'Student 4-digit retry counter unlocked',
          'success'
        );
        fetchOrders(false);
      } else {
        showToast('Could not apply handover assist', 'error');
      }
    } catch {
      showToast('Network error during handover assist', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateVendorStatus = async (payload: {
    isOpen?: boolean;
    busyMinutes?: number;
    nightSafe?: boolean;
  }) => {
    try {
      const res = await fetch('/api/vendor/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as { vendor?: VendorProfileMeta };
        if (data.vendor) setVendorMeta(data.vendor);
        if (payload.isOpen !== undefined) {
          showToast(payload.isOpen ? 'Canteen marked OPEN' : 'Canteen marked CLOSED', 'info');
        } else if (payload.busyMinutes !== undefined) {
          showToast(
            payload.busyMinutes > 0
              ? `Busy mode enabled for ${payload.busyMinutes} mins`
              : 'Busy mode cleared',
            'info'
          );
        } else if (payload.nightSafe !== undefined) {
          showToast(
            payload.nightSafe
              ? 'Night Safety Staff marked ON DUTY'
              : 'Night Safety Staff marked OFF DUTY',
            'info'
          );
        }
      }
    } catch {
      showToast('Network error updating canteen status', 'error');
    }
  };

  const loadStock = async () => {
    setStockLoading(true);
    try {
      const res = await fetch('/api/vendor/menu');
      if (res.ok) {
        const data = (await res.json()) as {
          vendor?: VendorProfileMeta | null;
          categories?: VendorMenuCategoryRow[];
          items?: VendorMenuItemRow[];
        };
        if (data.vendor) setVendorMeta(data.vendor);
        setMenuCategoriesList(data.categories || []);
        setMenuItemsList(data.items || []);
      }
    } finally {
      setStockLoading(false);
    }
  };

  const handleToggleItemStock = async (itemId: string, inStock: boolean) => {
    const res = await fetch(`/api/vendor/menu/item/${itemId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inStock }),
    });
    if (res.ok) {
      setMenuItemsList((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, inStock } : item))
      );
      showToast(inStock ? 'Item marked in stock' : 'Item marked sold out', 'info');
    } else {
      showToast('Could not update stock status', 'error');
    }
  };

  const handleUpdateItemPrice = async (itemId: string, pricePaise: number) => {
    const res = await fetch(`/api/vendor/menu/item/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricePaise }),
    });
    if (res.ok) {
      setMenuItemsList((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, pricePaise } : item))
      );
      showToast(`Price updated to ₹${(pricePaise / 100).toFixed(2)}`, 'success');
    } else {
      showToast('Could not update item price', 'error');
    }
  };

  const handleUpdateDefaultPrepTime = async (prepMinutes: number) => {
    const res = await fetch('/api/vendor/prep-time', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prepMinutes }),
    });
    if (res.ok) {
      const data = (await res.json()) as { vendor?: VendorProfileMeta };
      if (data.vendor) setVendorMeta(data.vendor);
      showToast(`Default kitchen prep time set to ${prepMinutes} mins`, 'success');
    } else {
      showToast('Could not update default prep time', 'error');
    }
  };

  const loadSettlement = async () => {
    try {
      const res = await fetch('/api/vendor/settlement');
      if (res.ok) {
        const data = (await res.json()) as VendorInsightsPayload;
        setSettlementData(data);
      }
    } catch {
      // ignore transient error
    }
  };

  const downloadSettlementCsv = () => {
    if (!settlementData?.orders) return;
    const header = 'Order No,Delivered At,Amount (INR),Payment,Code\n';
    const rows = settlementData.orders
      .map(
        (o) =>
          `${o.publicNo},${o.deliveredAt ? new Date(o.deliveredAt * 1000).toISOString() : ''},${(
            o.totalPaise / 100
          ).toFixed(2)},${o.paymentMethod || 'pay_at_gate'},${o.handoverCode}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trefood-settlement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#830020] border-t-transparent dark:border-[#FFB400]" />
      </div>
    );
  }

  if (!user || (user.role !== 'vendor' && user.role !== 'admin')) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <Layers className="h-7 w-7 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
          Vendor Console Access
        </h1>
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
            <Sparkles className="mr-2 h-5 w-5" aria-hidden="true" />
            1-Tap Login as Vendor (Ganga Canteen)
          </Button>
        </div>
      </div>
    );
  }

  const nowSec = Math.floor(nowMs / 1000);
  const isCanteenOpen = vendorMeta ? vendorMeta.isOpen : true;
  const busySecondsLeft = vendorMeta?.busyUntil ? Math.max(0, vendorMeta.busyUntil - nowSec) : 0;
  const isBusyActive = busySecondsLeft > 0;
  const isNightSafeOn = vendorMeta ? vendorMeta.nightSafe : true;
  const defaultPrep = vendorMeta?.prepMinutes || 15;

  const newOrders = orders.filter((o) => o.status === 'placed');
  const preparingOrders = orders.filter((o) => o.status === 'accepted');
  const readyAndGateOrders = orders.filter(
    (o) => o.status === 'out_for_delivery' || o.status === 'at_gate'
  );
  const handedOverOrders = orders
    .filter((o) => o.status === 'delivered')
    .sort((a, b) => (b.deliveredAt || b.createdAt) - (a.deliveredAt || a.createdAt))
    .slice(0, 12);

  const activeCount = newOrders.length + preparingOrders.length + readyAndGateOrders.length;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col">
      {/* Tablet-First Counter Header (zero horizontal overflow at 768px & 1024px) */}
      <header className="border-b border-stone-200 bg-white px-3 sm:px-4 py-3 shadow-xs dark:border-stone-800 dark:bg-stone-900 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#830020] text-[#FFB400] font-bold shrink-0">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight">TreFood Counter</h1>
                <span className="rounded-full bg-emerald-800 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                {vendorMeta?.name || 'Ganga Canteen'} • NIT Patna ({defaultPrep}m default prep)
              </p>
            </div>
          </div>

          {/* Primary Navigation Tabs (56px touch targets) */}
          <nav
            aria-label="Vendor console sections"
            className="flex flex-wrap items-center gap-1.5 rounded-xl bg-stone-100 p-1 dark:bg-stone-800"
          >
            <button
              type="button"
              onClick={() => setActiveTab('board')}
              className={`min-h-[56px] rounded-xl px-4 text-xs font-extrabold transition-all ${
                activeTab === 'board'
                  ? 'bg-white text-stone-900 shadow-xs dark:bg-stone-700 dark:text-stone-100'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-300'
              }`}
            >
              Order Board ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('stock');
                loadStock();
              }}
              className={`min-h-[56px] rounded-xl px-4 text-xs font-extrabold transition-all ${
                activeTab === 'stock'
                  ? 'bg-white text-stone-900 shadow-xs dark:bg-stone-700 dark:text-stone-100'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-300'
              }`}
            >
              Menu Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('settlement');
                loadSettlement();
              }}
              className={`min-h-[56px] rounded-xl px-4 text-xs font-extrabold transition-all ${
                activeTab === 'settlement'
                  ? 'bg-white text-stone-900 shadow-xs dark:bg-stone-700 dark:text-stone-100'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-300'
              }`}
            >
              Insights &amp; Daily Settlement
            </button>
          </nav>
        </div>

        {/* Tablet Controls Bar (56px touch targets: Open/Close, Busy, Night Safety, Sound/Mute, Test Bell, Stay Awake) */}
        <div
          className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-2.5 dark:border-stone-800"
          role="toolbar"
          aria-label="Counter operational controls"
        >
          <button
            type="button"
            aria-pressed={!isCanteenOpen}
            onClick={() => handleUpdateVendorStatus({ isOpen: !isCanteenOpen })}
            className={`min-h-[56px] rounded-xl border px-4 text-xs font-extrabold transition-colors ${
              isCanteenOpen
                ? 'border-emerald-700 bg-emerald-800 text-white hover:bg-emerald-900'
                : 'border-red-700 bg-red-800 text-white hover:bg-red-900'
            }`}
          >
            {isCanteenOpen ? 'Store: OPEN' : 'Store: CLOSED'}
          </button>

          <button
            type="button"
            aria-pressed={isBusyActive}
            onClick={() => handleUpdateVendorStatus({ busyMinutes: isBusyActive ? 0 : 30 })}
            className={`min-h-[56px] rounded-xl border px-4 text-xs font-extrabold transition-colors ${
              isBusyActive
                ? 'border-amber-600 bg-amber-400 text-stone-950 hover:bg-amber-500'
                : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200'
            }`}
          >
            {isBusyActive
              ? `Busy ON (${Math.ceil(busySecondsLeft / 60)}m) • Clear`
              : 'Busy 30m'}
          </button>

          <button
            type="button"
            aria-pressed={isNightSafeOn}
            onClick={() => handleUpdateVendorStatus({ nightSafe: !isNightSafeOn })}
            className={`inline-flex min-h-[56px] items-center gap-1.5 rounded-xl border px-4 text-xs font-extrabold transition-colors ${
              isNightSafeOn
                ? 'border-[#830020] bg-[#830020] text-white hover:bg-[#6a001a]'
                : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200'
            }`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Night Staff: {isNightSafeOn ? 'On Duty' : 'Off Duty'}</span>
          </button>

          <button
            type="button"
            aria-pressed={isMuted}
            onClick={toggleMute}
            className={`inline-flex min-h-[56px] items-center gap-1.5 rounded-xl border px-3.5 text-xs font-extrabold transition-colors ${
              isMuted
                ? 'border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200'
                : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200'
            }`}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          <button
            type="button"
            onClick={() => playOrderChime(false, true)}
            className="inline-flex min-h-[56px] min-w-[56px] items-center justify-center rounded-xl border border-stone-300 bg-white px-3 text-xs font-bold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
            title="Test counter bell"
            aria-label="Test bell chime"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-pressed={wakeLockActive}
            onClick={toggleWakeLock}
            className={`inline-flex min-h-[56px] items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-colors ${
              wakeLockActive
                ? 'border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-200'
                : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200'
            }`}
          >
            <Power className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{wakeLockActive ? 'Awake ON' : 'Stay Awake'}</span>
          </button>
        </div>

        {/* Gate Windows Countdown Strip */}
        {activeTab === 'board' && gatesList.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 pt-1 text-xs"
            aria-label="Gate curfew windows"
          >
            <span className="font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Gate Windows:
            </span>
            {gatesList.map((gate) => {
              const status = getGateCurfewStatus(gate, nowSec);
              return (
                <span
                  key={gate.id}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold ${
                    status.is24x7
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : !status.isOpen
                      ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                      : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                  }`}
                >
                  <span>{gate.name.split('/')[0].trim()}:</span>
                  <span className="font-mono font-bold">
                    {status.countdownText || status.statusText}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area (Responsive at 768px portrait & 1024px landscape) */}
      <main className="flex-1 p-3 sm:p-4">
        {activeTab === 'board' && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start"
            aria-live="polite"
          >
            {/* COLUMN 1: NEW (placed) */}
            <section
              aria-label="New Orders column"
              className={`flex flex-col rounded-2xl border bg-white p-3 dark:bg-stone-900 transition-colors ${
                newOrderFlash
                  ? 'border-amber-500 ring-4 ring-amber-400/30'
                  : 'border-stone-200 dark:border-stone-800'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-ping" aria-hidden="true" />
                  <h2 className="font-extrabold text-sm tracking-wide uppercase text-stone-900 dark:text-stone-100">
                    New Orders
                  </h2>
                </div>
                <Badge variant="warning">{newOrders.length}</Badge>
              </div>

              <div className="space-y-3 pt-3">
                {newOrders.length === 0 ? (
                  <div className="py-10 text-center text-xs text-stone-500">No new incoming orders</div>
                ) : (
                  newOrders.map((order) => {
                    const selectedPrep = newOrderPrepDrafts[order.id] ?? defaultPrep;
                    return (
                      <div
                        key={order.id}
                        data-order-no={order.publicNo}
                        className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-3.5 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-base font-extrabold text-stone-900 dark:text-stone-100">
                              #{order.publicNo}
                            </span>
                            <div className="text-xs font-bold text-[#830020] dark:text-[#FFB400]">
                              {order.gateName}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-base font-extrabold text-stone-900 dark:text-stone-100">
                              ₹{(order.totalPaise / 100).toFixed(2)}
                            </span>
                            <div className="text-[11px] text-stone-600 dark:text-stone-400">
                              {order.paymentMethod === 'upi_simulated' ? 'Paid UPI' : 'Pay at gate'}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg bg-white p-2.5 dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                          {order.items.map((item, i) => (
                            <div key={item.id || i} className="py-1">
                              <span className="font-bold">
                                {item.quantity}x {item.name}
                              </span>
                              {item.notes && (
                                <div className="mt-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-950 dark:bg-amber-950 dark:text-amber-200">
                                  Note: {item.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Adjustable Prep Time + Quick Accept Presets (56px touch targets) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 dark:text-stone-400">
                            <span>Prep time: {selectedPrep}m</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setNewOrderPrepDrafts((prev) => ({
                                    ...prev,
                                    [order.id]: Math.max(5, selectedPrep - 5),
                                  }))
                                }
                                aria-label={`Decrease prep time for #${order.publicNo}`}
                                className="min-h-[44px] min-w-[44px] rounded-lg border border-stone-300 bg-white font-mono text-xs font-extrabold dark:border-stone-700 dark:bg-stone-800"
                              >
                                -5
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setNewOrderPrepDrafts((prev) => ({
                                    ...prev,
                                    [order.id]: Math.min(90, selectedPrep + 5),
                                  }))
                                }
                                aria-label={`Increase prep time for #${order.publicNo}`}
                                className="min-h-[44px] min-w-[44px] rounded-lg border border-stone-300 bg-white font-mono text-xs font-extrabold dark:border-stone-700 dark:bg-stone-800"
                              >
                                +5
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            {[10, 15, 20, 30].map((mins) => (
                              <button
                                key={mins}
                                type="button"
                                onClick={() => handleUpdateStatus(order.id, 'accepted', mins)}
                                disabled={updatingId === order.id}
                                className="min-h-[56px] rounded-xl bg-[#830020] text-white font-extrabold text-xs hover:bg-[#68001a] active:scale-95 transition-all shadow-xs"
                              >
                                {mins}m
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order.id, 'accepted', selectedPrep)}
                            disabled={updatingId === order.id}
                            className="w-full min-h-[56px] rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs shadow-xs"
                          >
                            Accept Order ({selectedPrep}m)
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setPrintOrder(order)}
                            className="inline-flex min-h-[48px] items-center gap-1 rounded-lg px-2 font-bold text-stone-700 hover:bg-white dark:text-stone-300"
                          >
                            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Print Slip</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectOrder(order)}
                            className="inline-flex min-h-[48px] items-center rounded-lg px-3 font-bold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* COLUMN 2: PREPARING (accepted) */}
            <section
              aria-label="Preparing Orders column"
              className="flex flex-col rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  <h2 className="font-extrabold text-sm tracking-wide uppercase text-stone-900 dark:text-stone-100">
                    Preparing
                  </h2>
                </div>
                <Badge variant="brand">{preparingOrders.length}</Badge>
              </div>

              <div className="space-y-3 pt-3">
                {preparingOrders.length === 0 ? (
                  <div className="py-10 text-center text-xs text-stone-500">No active kitchen orders</div>
                ) : (
                  preparingOrders.map((order) => {
                    const minsToEta = order.etaAt
                      ? Math.max(1, Math.round((order.etaAt - nowSec) / 60))
                      : defaultPrep;

                    return (
                      <div
                        key={order.id}
                        data-order-no={order.publicNo}
                        className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 dark:border-stone-800 dark:bg-stone-850 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-base font-extrabold text-stone-900 dark:text-stone-100">
                              #{order.publicNo}
                            </span>
                            <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
                              {order.gateName}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-sm font-extrabold">
                              ₹{(order.totalPaise / 100).toFixed(2)}
                            </span>
                            <div className="font-mono text-[11px] font-bold text-amber-800 dark:text-amber-300">
                              ETA ~{minsToEta}m
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg bg-white p-2.5 dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800 text-xs">
                          {order.items.map((item, i) => (
                            <div key={item.id || i} className="py-1">
                              <span className="font-bold">
                                {item.quantity}x {item.name}
                              </span>
                              {item.notes && (
                                <div className="mt-0.5 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                                  Note: {item.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Adjust prep time (+5m / +10m) & Mark Ready (56px) */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAdjustOrderPrep(order.id, minsToEta + 5)}
                            disabled={updatingId === order.id}
                            className="min-h-[56px] rounded-xl border border-stone-300 bg-white px-3 font-mono text-xs font-extrabold text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                          >
                            +5m Prep
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order.id, 'out_for_delivery')}
                            disabled={updatingId === order.id}
                            className="flex-1 min-h-[56px] rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-xs px-3"
                          >
                            <span>Mark Ready • Send to Gate</span>
                            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                          </button>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setPrintOrder(order)}
                            className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-300"
                          >
                            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Print Slip</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* COLUMN 3: READY (out_for_delivery = On Route & at_gate = At Gate Handover) */}
            <section
              aria-label="Ready and On Route column"
              className="flex flex-col rounded-2xl border-2 border-emerald-200 bg-white p-3 dark:border-emerald-900/70 dark:bg-stone-900"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                    <h2 className="font-extrabold text-sm tracking-wide uppercase text-stone-900 dark:text-stone-100">
                      Ready
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-500">
                    <span>On Route</span>
                    <span>•</span>
                    <span>At Gate (Handover)</span>
                  </div>
                </div>
                <Badge variant="success">{readyAndGateOrders.length}</Badge>
              </div>

              <div className="space-y-3 pt-3">
                {readyAndGateOrders.length === 0 ? (
                  <div className="py-10 text-center text-xs text-stone-500">
                    No packets out for delivery or waiting at gate
                  </div>
                ) : (
                  readyAndGateOrders.map((order) => {
                    const isOutForDelivery = order.status === 'out_for_delivery';
                    const isAtGate = order.status === 'at_gate';
                    const isLockedOut = (order.codeAttempts || 0) >= 5;
                    const gateWindowLeftSec = order.atGateAt
                      ? Math.max(0, order.atGateAt + GATE_WINDOW_SECONDS - nowSec)
                      : GATE_WINDOW_SECONDS;

                    return (
                      <div
                        key={order.id}
                        data-order-no={order.publicNo}
                        className={`rounded-xl border p-3.5 space-y-3 ${
                          isLockedOut
                            ? 'border-2 border-red-500 bg-red-50/70 dark:border-red-700 dark:bg-red-950/30'
                            : isAtGate
                            ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                            : 'border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-850'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-base font-extrabold text-stone-900 dark:text-stone-100">
                              #{order.publicNo}
                            </span>
                            <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
                              {order.gateName}
                            </div>
                            <span
                              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                isOutForDelivery
                                  ? 'bg-blue-800 text-white'
                                  : 'bg-emerald-800 text-white'
                              }`}
                            >
                              {isOutForDelivery ? 'Out for delivery • Heading to gate' : 'Packet at gate'}
                            </span>
                          </div>
                          <span className="font-mono text-sm font-extrabold">
                            ₹{(order.totalPaise / 100).toFixed(2)}
                          </span>
                        </div>

                        {isOutForDelivery && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order.id, 'at_gate')}
                            disabled={updatingId === order.id}
                            className="w-full min-h-[56px] rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xs"
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            <span>Arrived at Gate</span>
                          </button>
                        )}

                        {isAtGate && (
                          <div className="space-y-2.5">
                            <div className="rounded-xl border border-emerald-200 bg-white p-3 text-center dark:border-emerald-800 dark:bg-stone-900">
                              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                                <span>Packet Code</span>
                                <span className="font-mono">
                                  Window: {formatMmSs(gateWindowLeftSec)}
                                </span>
                              </div>
                              <div className="py-1 font-mono text-3xl font-black tracking-widest text-stone-900 dark:text-stone-100">
                                {order.handoverCode}
                              </div>
                              <div className="text-[11px] text-stone-500">
                                Failed student tries: {order.codeAttempts || 0} / 5
                              </div>
                            </div>

                            {isLockedOut && (
                              <div
                                role="alert"
                                className="flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-2 text-xs font-extrabold text-red-900 dark:bg-red-950 dark:text-red-200"
                              >
                                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>Student Locked Out (5/5) — Assist Needed</span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleHandoverAssist(order.id, false)}
                                disabled={updatingId === order.id}
                                className="min-h-[56px] rounded-xl border border-stone-300 bg-white px-2.5 text-xs font-extrabold text-stone-900 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 inline-flex items-center justify-center gap-1"
                              >
                                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Unlock Retry</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleHandoverAssist(order.id, true)}
                                disabled={updatingId === order.id}
                                className="min-h-[56px] rounded-xl bg-emerald-800 hover:bg-emerald-900 px-2.5 text-xs font-extrabold text-white inline-flex items-center justify-center gap-1"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Assist &amp; Hand Over</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* COLUMN 4: HANDED OVER (delivered) */}
            <section
              aria-label="Handed Over column"
              className="flex flex-col rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  <h2 className="font-extrabold text-sm tracking-wide uppercase text-stone-900 dark:text-stone-100">
                    Handed over
                  </h2>
                </div>
                <Badge variant="default">{handedOverOrders.length}</Badge>
              </div>

              <div className="space-y-2.5 pt-3">
                {handedOverOrders.length === 0 ? (
                  <div className="py-10 text-center text-xs text-stone-500">
                    Completed deliveries appear here
                  </div>
                ) : (
                  handedOverOrders.map((order) => (
                    <div
                      key={order.id}
                      data-order-no={order.publicNo}
                      className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-850 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-extrabold text-stone-900 dark:text-stone-100">
                          #{order.publicNo}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                          ₹{(order.totalPaise / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-400">
                        <span>{order.gateName}</span>
                        <span className="font-mono">
                          {order.deliveredAt
                            ? new Date(order.deliveredAt * 1000).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Kolkata',
                              })
                            : 'Verified'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'stock' && (
          <VendorMenuTab
            items={menuItemsList}
            categories={menuCategoriesList}
            loading={stockLoading}
            promisedPrepMinutes={defaultPrep}
            onRefresh={loadStock}
            onToggleStock={handleToggleItemStock}
            onUpdatePrice={handleUpdateItemPrice}
            onUpdateDefaultPrepTime={handleUpdateDefaultPrepTime}
          />
        )}

        {activeTab === 'settlement' && (
          <VendorInsightsTab data={settlementData} onExportCsv={downloadSettlementCsv} />
        )}
      </main>

      {/* Printable Packet Slip Dialog */}
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
                <div className="text-xs">{vendorMeta?.name || 'Ganga Canteen'} • Campus Delivery</div>
              </div>

              <div className="flex justify-between font-bold pt-1">
                <span>ORDER #{printOrder.publicNo}</span>
                <span>{printOrder.gateName}</span>
              </div>

              <div className="my-2 border-2 border-black p-2 text-center rounded">
                <div className="text-[10px] uppercase font-bold">HANDOVER CODE</div>
                <div className="text-3xl font-black tracking-widest">{printOrder.handoverCode}</div>
              </div>

              <div className="divide-y divide-stone-200 py-1">
                {printOrder.items.map((it, idx) => (
                  <div key={it.id || idx} className="py-1">
                    <div className="flex justify-between font-bold">
                      <span>
                        {it.quantity}x {it.name}
                      </span>
                      <span>₹{((it.pricePaise * it.quantity) / 100).toFixed(2)}</span>
                    </div>
                    {it.notes && <div className="text-[10px] italic">SPECIAL: {it.notes}</div>}
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-300 flex justify-between font-bold text-sm">
                <span>COLLECT AT GATE:</span>
                <span>₹{(printOrder.totalPaise / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setPrintOrder(null)} className="min-h-[56px]">
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => window.print()}
                className="min-h-[56px]"
              >
                <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
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
            <label htmlFor="vendor-reject-reason" className="text-xs font-bold">
              Reason for rejection
            </label>
            <select
              id="vendor-reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[56px] w-full rounded-xl border border-stone-300 bg-white px-3 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-850 dark:text-stone-100"
            >
              <option value="Out of stock ingredient">Out of stock ingredient</option>
              <option value="Kitchen rush / closing for break">Kitchen rush / closing for break</option>
              <option value="Cannot deliver before gate curfew">Cannot deliver before gate curfew</option>
              <option value="Canteen power / equipment issue">Canteen power / equipment issue</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="vendor-reject-note" className="text-xs font-bold">
              Additional note (optional)
            </label>
            <input
              id="vendor-reject-note"
              type="text"
              value={customRejectNote}
              onChange={(e) => setCustomRejectNote(e.target.value)}
              placeholder="e.g. Paneer finished for tonight"
              className="min-h-[56px] w-full rounded-xl border border-stone-300 bg-white px-3 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-850 dark:text-stone-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRejectOrder(null)} className="min-h-[56px]">
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={isRejecting}
              onClick={handleConfirmReject}
              className="min-h-[56px]"
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
