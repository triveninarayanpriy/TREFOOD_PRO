import { Plus, Minus } from 'lucide-react';

export interface QuantityStepperProps {
  quantity?: number;
  value?: number;
  onIncrement?: () => void;
  onIncrease?: () => void;
  onDecrement?: () => void;
  onDecrease?: () => void;
  disabled?: boolean;
  itemName?: string;
}

export function QuantityStepper({
  quantity,
  value,
  onIncrement,
  onIncrease,
  onDecrement,
  onDecrease,
  disabled = false,
  itemName,
}: QuantityStepperProps) {
  const currentVal = value ?? quantity ?? 0;
  const handleInc = onIncrease || onIncrement || (() => {});
  const handleDec = onDecrease || onDecrement || (() => {});

  if (currentVal === 0) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handleInc}
        title={itemName ? `Add ${itemName} to packet` : 'Add item to packet'}
        className="inline-flex min-h-[44px] min-w-[78px] items-center justify-center rounded-xl border border-[#830020]/30 bg-[#830020]/10 px-3.5 text-xs font-bold text-[#830020] transition-colors hover:bg-[#830020] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#FFB400] active:scale-95 disabled:opacity-40 dark:border-[#FFB400]/40 dark:bg-[#FFB400]/15 dark:text-[#FFB400] dark:hover:bg-[#FFB400] dark:hover:text-[#1C1917]"
      >
        + Add
      </button>
    );
  }

  return (
    <div className="inline-flex min-h-[44px] items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 shadow-xs">
      <button
        type="button"
        aria-label={itemName ? `Decrease quantity of ${itemName}` : 'Decrease quantity'}
        disabled={disabled}
        onClick={handleDec}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[#FFB400] active:scale-90 disabled:opacity-40"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>

      <span
        className="w-8 text-center font-mono text-sm font-bold text-[var(--color-text)]"
        aria-live="polite"
      >
        {currentVal}
      </span>

      <button
        type="button"
        aria-label={itemName ? `Increase quantity of ${itemName}` : 'Increase quantity'}
        disabled={disabled}
        onClick={handleInc}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-[#830020] transition-colors hover:bg-[#830020]/10 focus:outline-none focus:ring-2 focus:ring-[#FFB400] active:scale-90 disabled:opacity-40 dark:text-[#FFB400] dark:hover:bg-[#FFB400]/15"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
