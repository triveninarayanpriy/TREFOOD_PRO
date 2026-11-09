import { Check } from 'lucide-react';
import type { TicketStatus } from './HandoverTicket';

export interface StepperProps {
  status?: TicketStatus;
  currentStatus?: TicketStatus;
}

const STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'accepted', label: 'Preparing' },
  { key: 'out_for_delivery', label: 'On Way' },
  { key: 'at_gate', label: 'At Gate' },
];

export function Stepper({ status, currentStatus }: StepperProps) {
  const activeStatus = currentStatus ?? status ?? 'placed';

  if (activeStatus === 'cancelled' || activeStatus === 'expired') {
    return (
      <div className="rounded-xl bg-red-50 p-3 text-center text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
        Order {activeStatus}
      </div>
    );
  }

  const getStepIndex = (s: TicketStatus) => {
    switch (s) {
      case 'placed':
        return 0;
      case 'accepted':
        return 1;
      case 'out_for_delivery':
        return 2;
      case 'at_gate':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(activeStatus);

  return (
    <div className="w-full py-4" aria-label="Order progress status tracker">
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isCompleted = currentIndex > idx;
          const isCurrent = currentIndex === idx;

          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-[#830020] text-white ring-4 ring-[#830020]/20 dark:bg-amber-400 dark:text-stone-950'
                      : 'border-2 border-stone-300 bg-white text-stone-400 dark:border-stone-700 dark:bg-stone-800'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : idx + 1}
                </div>
                <span
                  className={`mt-1.5 text-[11px] font-semibold ${
                    isCurrent
                      ? 'text-[#830020] dark:text-amber-400'
                      : isCompleted
                      ? 'text-stone-900 dark:text-stone-100'
                      : 'text-stone-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-all ${
                    currentIndex > idx ? 'bg-emerald-600' : 'bg-stone-200 dark:bg-stone-800'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
