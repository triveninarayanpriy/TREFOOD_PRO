import { useEffect } from 'react';
import { CheckCircle2, Clock, Truck, ShieldCheck } from 'lucide-react';

export type TicketStatus =
  | 'placed'
  | 'accepted'
  | 'out_for_delivery'
  | 'at_gate'
  | 'delivered'
  | 'cancelled'
  | 'expired';

export interface HandoverTicketProps {
  orderNo: string;
  handoverCode: string;
  vendorName: string;
  gateName: string;
  status: TicketStatus;
  etaMinutes?: number | string;
  eta?: string;
  totalPaise?: number;
  showVibrate?: boolean;
}

export function HandoverTicket({
  orderNo,
  handoverCode,
  vendorName,
  gateName,
  status,
  etaMinutes,
  eta,
  totalPaise,
  showVibrate = true,
}: HandoverTicketProps) {
  const displayEta = eta || (etaMinutes ? `${etaMinutes} mins` : undefined);

  // Gentle vibration on packet arrival at gate (only after user interaction per browser intervention policy)
  useEffect(() => {
    const canVibrate =
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator &&
      (!('userActivation' in navigator) || navigator.userActivation?.hasBeenActive);
    if (status === 'at_gate' && showVibrate && canVibrate) {
      try {
        navigator.vibrate([120, 80, 120]);
      } catch {
        // Silently ignore if not supported by browser permission
      }
    }
  }, [status, showVibrate]);

  const statusConfig = {
    placed: { label: 'Order Placed', color: 'bg-stone-100 text-stone-800', icon: Clock },
    accepted: { label: 'Preparing', color: 'bg-amber-100 text-amber-900', icon: Clock },
    out_for_delivery: { label: 'Out for Delivery', color: 'bg-sky-100 text-sky-900', icon: Truck },
    at_gate: {
      label: 'Packet at Gate!',
      color: 'bg-emerald-800 text-white animate-pulse',
      icon: ShieldCheck,
    },
    delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-900', icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-900', icon: Clock },
    expired: { label: 'Expired', color: 'bg-stone-200 text-stone-600', icon: Clock },
  }[status] || { label: status, color: 'bg-stone-100 text-stone-800', icon: Clock };

  const StatusIcon = statusConfig.icon;

  return (
    <div
      role="region"
      aria-label="Order Handover Ticket"
      className="relative overflow-hidden rounded-3xl border-2 border-[#1C1917] bg-[var(--color-surface)] shadow-xl dark:border-[#3A2229]"
    >
      {/* Top Section */}
      <div className="bg-[#830020] p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Handover Ticket
            </span>
            <div className="font-mono text-base font-extrabold">#{orderNo}</div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold backdrop-blur-xs">
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Middle Perforated Divider */}
      <div className="relative flex items-center justify-between bg-[var(--color-surface-sunken)] px-4 py-2">
        <div className="-ml-6 h-5 w-5 rounded-full border-r border-[var(--color-border)] bg-[var(--color-bg)]" />
        <div className="mx-2 w-full border-t-2 border-dashed border-[var(--color-border)]" />
        <div className="-mr-6 h-5 w-5 rounded-full border-l border-[var(--color-border)] bg-[var(--color-bg)]" />
      </div>

      {/* Code Display Area */}
      <div className="space-y-2 p-6 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
          Match 4-Digit Code at Gate
        </span>

        {/* Oversized Tabular Digits */}
        <div className="select-all py-1 font-mono text-5xl font-black tracking-widest text-[#830020] dark:text-[#FFB400] sm:text-6xl">
          {handoverCode}
        </div>

        <p className="text-[11px] text-[var(--color-text-muted)]">
          Confirm that this 4-digit code matches the label on your food packet.
        </p>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4 text-xs">
        <div>
          <div className="font-bold text-[var(--color-text)]">{vendorName}</div>
          <div className="text-[var(--color-text-muted)]">{gateName}</div>
        </div>
        <div className="text-right">
          {displayEta && (
            <div className="flex items-center justify-end gap-1 font-semibold text-[#92400E] dark:text-[#FCD34D]">
              <Clock className="h-3 w-3" />
              <span>~{displayEta}</span>
            </div>
          )}
          {totalPaise !== undefined && (
            <div className="font-mono font-bold text-[var(--color-text)]">
              ₹{(totalPaise / 100).toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
