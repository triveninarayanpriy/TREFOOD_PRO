import { Check, Clock, ChefHat, Truck, MapPin, ShieldCheck, XCircle } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type { TicketStatus } from './HandoverTicket';

export interface StatusTimelineProps {
  status: TicketStatus;
  showNightSafeNotice?: boolean;
  etaText?: string;
  timestamps?: {
    placedAt?: number | null;
    acceptedAt?: number | null;
    outForDeliveryAt?: number | null;
    atGateAt?: number | null;
    deliveredAt?: number | null;
  };
}

interface TimelineStepDef {
  key: 'placed' | 'accepted' | 'preparing' | 'out_for_delivery' | 'at_gate' | 'delivered';
  titleKey: string;
  title: string;
  subKey: string;
  subtitle: string;
  icon: typeof Check;
}

const TIMELINE_STEPS: TimelineStepDef[] = [
  { key: 'placed', titleKey: 'status.placed', title: 'Placed', subKey: 'statusSub.placed', subtitle: 'Sent to vendor counter tablet', icon: Clock },
  { key: 'accepted', titleKey: 'status.accepted', title: 'Accepted', subKey: 'statusSub.accepted', subtitle: 'Kitchen confirmed your order', icon: Check },
  { key: 'preparing', titleKey: 'status.preparing', title: 'Preparing', subKey: 'statusSub.preparing', subtitle: 'Freshly packed & sealed with code', icon: ChefHat },
  { key: 'out_for_delivery', titleKey: 'status.out_for_delivery', title: 'Out for delivery', subKey: 'statusSub.out_for_delivery', subtitle: 'On the way to your campus gate', icon: Truck },
  { key: 'at_gate', titleKey: 'status.at_your_gate', title: 'At your gate', subKey: 'statusSub.at_gate', subtitle: 'Match the 4-digit code on the packet', icon: MapPin },
  { key: 'delivered', titleKey: 'status.delivered', title: 'Delivered', subKey: 'statusSub.delivered', subtitle: 'Handover confirmed at the gate', icon: ShieldCheck },
];

function getStepRank(status: TicketStatus): number {
  switch (status) {
    case 'placed':
      return 0;
    case 'accepted':
      // Both Accepted (done) and Preparing (active) are reached once vendor accepts
      return 2;
    case 'out_for_delivery':
      return 3;
    case 'at_gate':
      return 4;
    case 'delivered':
      return 5;
    default:
      return -1;
  }
}

function formatStepTime(ts?: number | null): string | null {
  if (!ts) return null;
  return new Date(ts * 1000).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

export function StatusTimeline({
  status,
  showNightSafeNotice = false,
  etaText,
  timestamps,
}: StatusTimelineProps) {
  const { t } = useTranslation();
  const isTerminalError = status === 'cancelled' || status === 'expired';
  const activeRank = getStepRank(status);

  const stepTimestamps: Record<TimelineStepDef['key'], number | null | undefined> = {
    placed: timestamps?.placedAt,
    accepted: timestamps?.acceptedAt,
    preparing: timestamps?.acceptedAt,
    out_for_delivery: timestamps?.outForDeliveryAt,
    at_gate: timestamps?.atGateAt,
    delivered: timestamps?.deliveredAt,
  };

  if (isTerminalError) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-red-300 bg-red-50/70 p-4 dark:border-red-900/60 dark:bg-red-950/30"
      >
        <div className="flex items-center gap-2.5 text-red-800 dark:text-red-300">
          <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <div className="text-sm font-bold">
              {status === 'cancelled' ? t('status.cancelled', 'Order Cancelled') : t('status.expired', 'Order Expired')}
            </div>
            <p className="text-xs text-red-700/80 dark:text-red-300/80">
              {status === 'cancelled'
                ? 'This order was stopped before preparation or cancelled at your request.'
                : 'Vendor counter did not accept this order within the campus time window.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Live Order Progress
        </span>
        {etaText && status !== 'delivered' && (
          <span className="rounded-full bg-[#FFB400]/20 px-2.5 py-0.5 font-mono text-xs font-bold text-[#830020] dark:text-[#FFB400]">
            {etaText}
          </span>
        )}
      </div>

      <ol className="relative space-y-3 pl-2" aria-label="Order progress steps">
        {TIMELINE_STEPS.map((step, index) => {
          const isCompleted = index < activeRank || (status === 'delivered' && index === 5);
          const isActive = index === activeRank && status !== 'delivered';
          const Icon = step.icon;
          const timeStr = formatStepTime(stepTimestamps[step.key]);

          return (
            <li
              key={step.key}
              aria-current={isActive ? 'step' : undefined}
              className="relative flex items-start gap-3 pb-1"
            >
              {index < TIMELINE_STEPS.length - 1 && (
                <div
                  className={`absolute left-[13px] top-7 h-[calc(100%-10px)] w-0.5 transition-colors ${
                    index < activeRank
                      ? 'bg-[#830020] dark:bg-[#FFB400]'
                      : 'bg-[var(--color-border)]'
                  }`}
                />
              )}

              <div
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                  isCompleted
                    ? 'border-[#830020] bg-[#830020] text-white dark:border-[#FFB400] dark:bg-[#FFB400] dark:text-[#1C1917]'
                    : isActive
                    ? 'border-[#FFB400] bg-[var(--color-surface)] text-[#830020] shadow-sm ring-4 ring-[#FFB400]/20 dark:text-[#FFB400]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
                ) : (
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-bold leading-tight ${
                      isCompleted || isActive
                        ? 'text-[var(--color-text)]'
                        : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {t(step.titleKey, step.title)}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {timeStr && (isCompleted || isActive) && (
                      <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                        {timeStr}
                      </span>
                    )}
                    {isActive && (
                      <span
                        key={status}
                        className="tf-animate-status rounded-md bg-[#830020]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#830020] dark:bg-[#FFB400]/15 dark:text-[#FFB400]"
                      >
                        Current
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {t(step.subKey, step.subtitle)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {showNightSafeNotice && status !== 'delivered' && (
        <div className="flex items-center gap-2 rounded-xl border border-[#830020]/20 bg-[#830020]/5 px-3 py-2 text-xs font-semibold text-[#830020] dark:border-[#FFB400]/30 dark:bg-[#FFB400]/10 dark:text-[#FFB400]">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Campus Night Safety: owner or senior staff handling delivery personally.</span>
        </div>
      )}
    </div>
  );
}
