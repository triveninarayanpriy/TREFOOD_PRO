import { CheckCircle2, Clock, MapPin } from 'lucide-react';
import type { OrderStatusType } from '@shared/schemas';

export interface MobileOrderStatusProps {
  orderNo: string;
  status: OrderStatusType;
  handoverCode: string;
  vendorName: string;
  gateName: string;
  etaMinutes?: number;
  remainingWindowSeconds?: number;
  onConfirmDelivery?: () => void;
  className?: string;
}

export function MobileOrderStatus({
  orderNo,
  status,
  handoverCode,
  vendorName,
  gateName,
  remainingWindowSeconds,
  onConfirmDelivery,
  className = '',
}: MobileOrderStatusProps) {
  const isAtGate = status === 'at_gate';

  return (
    <div className={`space-y-4 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--elevation-2)] ${className}`}>
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
        <div>
          <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Order Packet
          </div>
          <div className="font-display text-[18px] font-bold text-[var(--color-text)]">
            {orderNo}
          </div>
        </div>
        <span className="rounded-full bg-[#830020]/10 px-3 py-1 text-[13px] font-bold text-[#830020] dark:bg-[#FFB400]/15 dark:text-[#FFB400] capitalize">
          {status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Handover Code Card */}
      <div className="rounded-[16px] bg-[#1C1210] p-4 text-center text-white space-y-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
          Handover 4-Digit Code
        </div>
        <div className="font-handwriting text-5xl font-black tracking-widest text-[#FFB400]">
          {handoverCode}
        </div>
        <p className="text-[12px] text-stone-300">
          Match this marker number on the bag at the gate.
        </p>
      </div>

      {/* 15-Minute Gate Window Countdown if At Gate */}
      {isAtGate && remainingWindowSeconds !== undefined && (
        <div className="flex items-center justify-between rounded-[12px] bg-amber-50 dark:bg-amber-950/60 p-3 text-[13px] text-amber-900 dark:text-amber-200">
          <span className="inline-flex items-center gap-1.5 font-bold">
            <Clock className="h-4 w-4 text-amber-700" />
            <span>Gate Collection Window:</span>
          </span>
          <span className="font-mono font-bold">
            {Math.floor(remainingWindowSeconds / 60)}:
            {(remainingWindowSeconds % 60).toString().padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Location details */}
      <div className="text-[13px] space-y-1.5 text-[var(--color-text-muted)]">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#830020] dark:text-[#FFB400] shrink-0" />
          <span>Collection Point: <strong className="text-[var(--color-text)]">{gateName}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
          <span>Counter: <strong className="text-[var(--color-text)]">{vendorName}</strong></span>
        </div>
      </div>

      {isAtGate && onConfirmDelivery && (
        <button
          type="button"
          onClick={onConfirmDelivery}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#15803D] text-white text-[15px] font-bold shadow-xs active:scale-98 transition-transform"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Confirm Received Packet</span>
        </button>
      )}
    </div>
  );
}
