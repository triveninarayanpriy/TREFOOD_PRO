import React from 'react';
import { Receipt } from 'lucide-react';

export interface PaperBillLine {
  id: string;
  label: string;
  qty?: number;
  amountPaise: number;
  muted?: boolean;
}

export interface PaperBillProps {
  vendorName: string;
  gateName?: string;
  items: PaperBillLine[];
  subtotalPaise: number;
  packingTotalPaise?: number;
  discountPaise?: number;
  couponCode?: string | null;
  totalPaise: number;
  minOrderPaise?: number;
  suggestedAddonsSlot?: React.ReactNode;
  footerAction?: React.ReactNode;
  className?: string;
}

function formatPaise(paise: number): string {
  const abs = Math.abs(Math.round(paise / 100));
  return paise < 0 ? `-₹${abs}` : `₹${abs}`;
}

/**
 * Signature Component #4: PaperBill
 * Printed campus counter receipt with serrated paper edges, dotted leaders, packing breakdown,
 * minimum-order progress strip, zero delivery fee, and right-aligned monospace rupees.
 */
export function PaperBill({
  vendorName,
  gateName,
  items,
  subtotalPaise,
  packingTotalPaise = 0,
  discountPaise = 0,
  couponCode,
  totalPaise,
  minOrderPaise = 0,
  suggestedAddonsSlot,
  footerAction,
  className = '',
}: PaperBillProps) {
  const shortfall = Math.max(0, minOrderPaise - subtotalPaise);
  const minPct = minOrderPaise > 0 ? Math.min(100, Math.round((subtotalPaise / minOrderPaise) * 100)) : 100;

  return (
    <div className={`drop-shadow-[var(--shadow-card)] ${className}`}>
      <div className="tf-paper-torn-top" aria-hidden="true" />
      <div className="tf-paper-bill px-4 py-4 space-y-3">
        {/* Receipt header */}
        <div className="border-b border-dashed border-[var(--color-border)] pb-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#830020] dark:text-[#FFB400]">
              <Receipt className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              Packet Bill
            </span>
            {gateName && (
              <span className="font-mono text-[11px] text-[var(--color-text-muted)] truncate max-w-[160px]">
                {gateName}
              </span>
            )}
          </div>
          <h3 className="mt-1 font-display text-base font-bold text-[var(--color-text)] truncate">
            {vendorName}
          </h3>
        </div>

        {/* Itemised dotted lines */}
        <div className="space-y-2 text-xs">
          {items.map((line) => (
            <div key={line.id} className="flex items-baseline gap-2">
              <span className={line.muted ? 'text-[var(--color-text-muted)]' : 'font-medium text-[var(--color-text)]'}>
                {line.label}
                {typeof line.qty === 'number' ? ` × ${line.qty}` : ''}
              </span>
              <span aria-hidden="true" className="flex-1 border-b border-dotted border-[var(--color-border)]" />
              <span className="font-mono font-semibold text-[var(--color-text)]">
                {formatPaise(line.amountPaise)}
              </span>
            </div>
          ))}
        </div>

        {/* Minimum Order Progress */}
        {minOrderPaise > 0 && (
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className={shortfall > 0 ? 'text-[#824410] dark:text-[#E5A365]' : 'text-[#15803D] dark:text-[#4ADE80]'}>
                {shortfall > 0
                  ? `Add ${formatPaise(shortfall)} more to reach min ₹${Math.round(minOrderPaise / 100)}`
                  : `Minimum order ₹${Math.round(minOrderPaise / 100)} met`}
              </span>
              <span className="font-mono text-[var(--color-text-muted)]">{minPct}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Minimum order progress"
              aria-valuemin={0}
              aria-valuemax={minOrderPaise}
              aria-valuenow={Math.min(subtotalPaise, minOrderPaise)}
              className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]"
            >
              <div
                className={`h-full transition-all duration-300 ${shortfall > 0 ? 'bg-[#B5651D]' : 'bg-[#15803D]'}`}
                style={{ width: `${minPct}%` }}
              />
            </div>
            {shortfall > 0 && suggestedAddonsSlot}
          </div>
        )}

        {/* Charges breakdown */}
        <div className="border-t border-dashed border-[var(--color-border)] pt-2.5 space-y-1.5 text-xs">
          <div className="flex items-baseline justify-between text-[var(--color-text-muted)]">
            <span>Items subtotal</span>
            <span className="font-mono">{formatPaise(subtotalPaise)}</span>
          </div>
          <div className="flex items-baseline justify-between text-[var(--color-text-muted)]">
            <span>Packing charges</span>
            <span className="font-mono">{formatPaise(packingTotalPaise)}</span>
          </div>
          <div className="flex items-baseline justify-between text-[#15803D] dark:text-[#4ADE80]">
            <span>Campus gate delivery</span>
            <span className="font-mono font-bold">₹0 (FREE)</span>
          </div>
          {discountPaise > 0 && (
            <div className="flex items-baseline justify-between text-[#15803D] dark:text-[#4ADE80]">
              <span>Coupon {couponCode ? `(${couponCode})` : ''}</span>
              <span className="font-mono font-bold">-{formatPaise(discountPaise)}</span>
            </div>
          )}
        </div>

        {/* Grand Total */}
        <div className="flex items-baseline justify-between border-t-2 border-[var(--color-text)] pt-2.5">
          <span className="font-display text-sm font-bold text-[var(--color-text)]">
            Total to pay at gate
          </span>
          <span className="font-mono text-lg font-extrabold text-[var(--color-text)]">
            {formatPaise(totalPaise)}
          </span>
        </div>

        {footerAction && <div className="pt-1">{footerAction}</div>}
      </div>
      <div className="tf-paper-torn-bottom" aria-hidden="true" />
    </div>
  );
}
