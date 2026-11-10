import { Check, Clock, ShieldCheck } from 'lucide-react';
import type { TicketStatus } from './HandoverTicket';

export interface StatusTimelineProps {
  status: TicketStatus;
  showNightSafeNotice?: boolean;
  etaText?: string;
}

const TIMELINE_STEPS: Array<{ key: TicketStatus; title: string; subtitle: string }> = [
  { key: 'placed', title: 'Placed', subtitle: 'Sent to vendor counter tablet' },
  { key: 'accepted', title: 'Preparing', subtitle: 'Freshly packed for gate pickup' },
  { key: 'out_for_delivery', title: 'On the way', subtitle: 'Heading to your chosen gate' },
  { key: 'at_gate', title: 'At your gate', subtitle: 'Your food has reached the gate — match code' },
  { key: 'delivered', title: 'Delivered', subtitle: '4-digit code confirmed at handover' },
];

export function StatusTimeline({ status, showNightSafeNotice = false, etaText }: StatusTimelineProps) {
  if (status === 'cancelled' || status === 'expired') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm font-semibold text-[#991B1B] dark:border-[#991B1B] dark:bg-[#3B0D12] dark:text-[#FCA5A5]"
      >
        Order {status === 'cancelled' ? 'cancelled' : 'expired (not accepted in time)'}
      </div>
    );
  }

  const activeIdx = TIMELINE_STEPS.findIndex((s) => s.key === status);

  return (
    <div
      role="region"
      aria-label="Order status timeline"
      aria-live="polite"
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Live Order Progress
        </span>
        {etaText && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#830020] dark:text-[#FFB400]">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {etaText}
          </span>
        )}
      </div>

      <ol className="space-y-2.5">
        {TIMELINE_STEPS.map((step, idx) => {
          const isCompleted = activeIdx > idx || status === 'delivered';
          const isCurrent = activeIdx === idx && status !== 'delivered';

          return (
            <li
              key={step.key}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex items-start gap-3"
            >
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCompleted
                    ? 'bg-[#15803D] text-white'
                    : isCurrent
                    ? 'bg-[#830020] text-white ring-4 ring-[#830020]/20 dark:bg-[#FFB400] dark:text-[#1C1917]'
                    : 'border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]'
                }`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" /> : idx + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-bold leading-tight ${
                    isCurrent
                      ? 'text-[#830020] dark:text-[#FFB400]'
                      : isCompleted
                      ? 'text-[var(--color-text)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {step.title}
                </div>
                {(isCurrent || isCompleted) && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{step.subtitle}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {showNightSafeNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-[#FCD34D] bg-[#FFF8E1] px-3 py-2 text-xs font-semibold text-[#78350F] dark:border-[#92400E] dark:bg-[#331F04] dark:text-[#FDE68A]">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Campus Night Safety: Handled personally by vendor owner or senior staff.</span>
        </div>
      )}
    </div>
  );
}
