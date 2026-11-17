import { MapPin, ChevronDown } from 'lucide-react';

export interface MobileGateStatusProps {
  gateName: string;
  is24x7?: boolean;
  curfewTime?: string;
  countdownMinutes?: number | null;
  onClick?: () => void;
  className?: string;
}

export function MobileGateStatus({
  gateName,
  is24x7 = false,
  curfewTime,
  countdownMinutes,
  onClick,
  className = '',
}: MobileGateStatusProps) {
  const isClosingSoon = countdownMinutes !== null && countdownMinutes !== undefined && countdownMinutes <= 30 && countdownMinutes > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1 text-left active:bg-[var(--color-surface-sunken)] transition-colors ${className}`}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#830020]/10 text-[#830020] dark:bg-[#FFB400]/20 dark:text-[#FFB400]">
        <MapPin className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Deliver to
        </div>
        <div className="font-bold text-[13px] text-[var(--color-text)] truncate">
          {gateName}
        </div>
      </div>

      {is24x7 ? (
        <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
          24x7
        </span>
      ) : isClosingSoon ? (
        <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
          {countdownMinutes}m left
        </span>
      ) : curfewTime ? (
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
          Curfew {curfewTime}
        </span>
      ) : null}

      <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />
    </button>
  );
}
