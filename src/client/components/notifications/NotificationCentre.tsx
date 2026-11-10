import { useEffect, useState, useCallback } from 'react';
import { Bell, BellRing, CheckCircle2, Smartphone, ArrowRight, X, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import type { OrderNotificationItem } from '@shared/types';
import {
  isIosDevice,
  isStandalonePwa,
  isWebPushSupported,
  urlBase64ToUint8Array,
} from '../../utils/platform';

function formatRelativeTime(unixSec: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSec);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(unixSec * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export interface OrderPushStatusCardProps {
  compact?: boolean;
}

/**
 * Concise Web Push opt-in / status card + iOS-only home screen install guide.
 */
export function OrderPushStatusCard({ compact = false }: OrderPushStatusCardProps) {
  const { showToast } = useToast();
  const [pushState, setPushState] = useState<'idle' | 'enabled' | 'blocked' | 'fallback'>('idle');
  const [loading, setLoading] = useState(false);

  const ios = isIosDevice();
  const standalone = isStandalonePwa();
  const pushSupported = isWebPushSupported();

  useEffect(() => {
    if (!pushSupported) {
      setPushState('fallback');
      return;
    }
    if (Notification.permission === 'granted') {
      setPushState('enabled');
    } else if (Notification.permission === 'denied') {
      setPushState('blocked');
    }
  }, [pushSupported]);

  const handleEnablePush = async () => {
    setLoading(true);
    try {
      const cfgRes = await fetch('/api/push/vapid-public-key');
      const cfg = (await cfgRes.json().catch(() => ({}))) as {
        supported?: boolean;
        publicKey?: string | null;
      };

      if (!pushSupported) {
        setPushState('fallback');
        showToast('In-app status cards are active for live gate updates.', 'info');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setPushState('blocked');
        showToast('Browser notifications blocked. Live status cards stay visible in-app.', 'info');
        return;
      }

      if (permission !== 'granted') {
        setPushState('fallback');
        return;
      }

      // Subscribe via PushManager if VAPID public key is provisioned in the Worker
      if (cfg.publicKey && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        let sub = await registration.pushManager.getSubscription();
        if (!sub) {
          sub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(cfg.publicKey) as unknown as BufferSource,
          });
        }
        const json = sub.toJSON();
        if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: json.endpoint,
              keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            }),
          });
        }
      }

      setPushState('enabled');
      showToast('Gate arrival alerts enabled!', 'success');
    } catch {
      setPushState('fallback');
      showToast('Using in-app status cards for order updates.', 'info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#830020]/10 text-[#830020] dark:bg-[#FFB400]/15 dark:text-[#FFB400]">
            {pushState === 'enabled' ? (
              <BellRing className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Bell className="h-5 w-5" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--color-text)]">
              {pushState === 'enabled'
                ? 'Gate arrival alerts active'
                : 'Get gate arrival alerts'}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] truncate">
              {pushState === 'enabled'
                ? 'Browser notifications + in-app status cards ready'
                : pushState === 'blocked'
                ? 'Notifications blocked in browser — in-app status cards active'
                : 'Simple status card alert when your packet reaches the gate'}
            </p>
          </div>
        </div>

        {pushState === 'enabled' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Active</span>
          </span>
        ) : (
          <Button
            type="button"
            variant={compact ? 'secondary' : 'primary'}
            size="sm"
            loading={loading}
            onClick={handleEnablePush}
            className="min-h-[44px] shrink-0"
          >
            {pushState === 'fallback' || pushState === 'blocked' ? 'Alerts in app' : 'Enable alerts'}
          </Button>
        )}
      </div>

      {/* iOS install guide shown strictly on iOS devices not yet launched from Home Screen */}
      {ios && !standalone && (
        <div
          role="note"
          aria-label="iOS Home Screen install guide for push notifications"
          className="flex items-start gap-2.5 rounded-2xl border border-[#FFB400]/40 bg-[#FFB400]/10 p-3 text-xs text-[var(--color-text)]"
        >
          <Smartphone className="h-4 w-4 shrink-0 text-[#830020] dark:text-[#FFB400] mt-0.5" aria-hidden="true" />
          <span>
            <strong>iOS Push Guide:</strong> Tap Safari Share and choose{' '}
            <strong>Add to Home Screen</strong> to receive Web Push alerts on iPhone or iPad.
          </span>
        </div>
      )}
    </div>
  );
}

export interface NotificationCentreDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * In-app notification centre displaying crisp order status cards as a reliable fallback.
 */
export function NotificationCentreDrawer({ open, onClose }: NotificationCentreDrawerProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<OrderNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=10');
      if (res.ok) {
        const data = (await res.json()) as { ok?: boolean; notifications?: OrderNotificationItem[] };
        setItems(data.notifications || []);
      }
    } catch {
      // Keep previous list cleanly
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open && user) {
      loadNotifications();
    }
  }, [open, user, loadNotifications]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Order notifications centre"
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
            <h2 className="text-base font-extrabold text-[var(--color-text)]">
              Order Updates
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {user && (
              <button
                type="button"
                onClick={loadNotifications}
                aria-label="Refresh notifications"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <OrderPushStatusCard compact />

          {!user ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-5 text-center space-y-3">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Sign in to view live order alerts
              </p>
              <Link
                to="/signin?returnTo=/orders"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#830020] px-4 text-xs font-bold text-white hover:bg-[#6a001a]"
              >
                Sign in
              </Link>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-6 text-center text-xs text-[var(--color-text-muted)]">
              {loading ? 'Loading latest status cards...' : 'No recent order notifications yet.'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <Link
                  key={item.id}
                  to={`/orders/${item.orderId}`}
                  onClick={onClose}
                  className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3.5 transition-colors hover:border-[#830020] dark:hover:border-[#FFB400]"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#830020] dark:text-[#FFB400]">
                    <span className="font-mono">#{item.publicNo}</span>
                    <span className="font-normal text-[var(--color-text-muted)]">
                      {formatRelativeTime(item.at)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-[var(--color-text)]">
                    {item.title}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{item.summary}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#830020] dark:text-[#FFB400]">
                    <span>Track order</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
