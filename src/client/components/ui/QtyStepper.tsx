import { Plus, Minus } from 'lucide-react';

export interface QtyStepperProps {
  quantity?: number;
  value?: number;
  onIncrement?: () => void;
  onIncrease?: () => void;
  onDecrement?: () => void;
  onDecrease?: () => void;
  disabled?: boolean;
}

export function QtyStepper({
  quantity,
  value,
  onIncrement,
  onIncrease,
  onDecrement,
  onDecrease,
  disabled = false,
}: QtyStepperProps) {
  const currentVal = value ?? quantity ?? 0;
  const handleInc = onIncrease || onIncrement || (() => {});
  const handleDec = onDecrease || onDecrement || (() => {});

  if (currentVal === 0) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handleInc}
        className="inline-flex min-h-[44px] min-w-[76px] items-center justify-center rounded-xl border border-[#830020]/30 bg-[#830020]/10 px-3 text-xs font-bold text-[#830020] transition-colors hover:bg-[#830020] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#F2A900] active:scale-95 disabled:opacity-40 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400 dark:hover:bg-amber-400 dark:hover:text-stone-950"
      >
        ADD +
      </button>
    );
  }

  return (
    <div className="inline-flex min-h-[44px] items-center rounded-xl border border-stone-200 bg-white p-1 shadow-xs dark:border-stone-700 dark:bg-stone-800">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled}
        onClick={handleDec}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 active:scale-90 disabled:opacity-40 dark:text-stone-300 dark:hover:bg-stone-700"
      >
        <Minus className="h-4 w-4" />
      </button>

      <span className="w-8 text-center font-mono text-sm font-bold text-stone-900 dark:text-stone-100">
        {currentVal}
      </span>

      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled}
        onClick={handleInc}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#830020] transition-colors hover:bg-[#830020]/10 active:scale-90 disabled:opacity-40 dark:text-amber-400 dark:hover:bg-amber-400/10"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
