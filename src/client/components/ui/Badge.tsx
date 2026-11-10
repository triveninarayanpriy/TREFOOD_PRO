import React from 'react';
import { ShieldCheck, Clock } from 'lucide-react';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'brand'
  | 'veg'
  | 'nonveg'
  | 'night_safe'
  | 'closed';

export function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children?: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  const styles: Record<BadgeVariant, string> = {
    default:
      'bg-[var(--color-surface-sunken)] text-[var(--color-text)] border border-[var(--color-border)]',
    success:
      'bg-[#ECFDF5] text-[#14532D] border border-[#BBF7D0] dark:bg-[#072917] dark:text-[#86EFAC] dark:border-[#166534]',
    warning:
      'bg-[#FFFBEB] text-[#78350F] border border-[#FDE68A] dark:bg-[#3B2406] dark:text-[#FDE68A] dark:border-[#92400E]',
    danger:
      'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] dark:bg-[#3B0D12] dark:text-[#FCA5A5] dark:border-[#991B1B]',
    brand:
      'bg-[#830020]/10 text-[#830020] border border-[#830020]/25 dark:bg-[#FFB400]/15 dark:text-[#FFB400] dark:border-[#FFB400]/30',
    veg: 'bg-[#ECFDF5] text-[#14532D] border border-[#86EFAC] dark:bg-[#072917] dark:text-[#86EFAC] dark:border-[#166534]',
    nonveg:
      'bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5] dark:bg-[#3B0D12] dark:text-[#FCA5A5] dark:border-[#991B1B]',
    night_safe:
      'bg-[#FFF8E1] text-[#78350F] border border-[#FCD34D] dark:bg-[#331F04] dark:text-[#FDE68A] dark:border-[#92400E]',
    closed:
      'bg-stone-200 text-stone-800 border border-stone-300 dark:bg-[#2D161D] dark:text-[#F5E6EA] dark:border-[#5B2E3C]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${styles[variant]} ${className}`}
    >
      {variant === 'veg' && (
        <span
          aria-hidden="true"
          className="inline-flex h-3 w-3 items-center justify-center rounded-[3px] border border-[#15803D] bg-white dark:bg-[#072917]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
        </span>
      )}
      {variant === 'nonveg' && (
        <span
          aria-hidden="true"
          className="inline-flex h-3 w-3 items-center justify-center rounded-[3px] border border-[#B91C1C] bg-white dark:bg-[#3B0D12]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#B91C1C]" />
        </span>
      )}
      {variant === 'night_safe' && <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {variant === 'closed' && <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {children ??
        (variant === 'veg'
          ? 'Veg'
          : variant === 'nonveg'
          ? 'Non-veg'
          : variant === 'night_safe'
          ? 'Night Safe'
          : variant === 'closed'
          ? 'Closed'
          : null)}
    </span>
  );
}

export function Chip({
  label,
  count,
  selected = false,
  disabled = false,
  onClick,
  icon,
}: {
  label: string;
  count?: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB400] active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed ${
        selected
          ? 'bg-[#830020] text-white shadow-xs dark:bg-[#FFB400] dark:text-[#1C1917]'
          : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-sunken)]'
      }`}
    >
      {icon}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`ml-0.5 rounded-full px-1.5 py-0.2 font-mono text-[11px] font-bold ${
            selected
              ? 'bg-white/20 text-white dark:bg-[#1C1917]/15 dark:text-[#1C1917]'
              : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-raised)] ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
