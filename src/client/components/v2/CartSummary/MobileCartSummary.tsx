import { ArrowRight } from 'lucide-react';

export interface MobileCartSummaryProps {
  itemCount: number;
  totalPaise: number;
  vendorName?: string;
  onOpenCart: () => void;
  className?: string;
}

export function MobileCartSummary({
  itemCount,
  totalPaise,
  vendorName,
  onOpenCart,
  className = '',
}: MobileCartSummaryProps) {
  if (itemCount <= 0) return null;

  const rupeeTotal = `₹${Math.round(totalPaise / 100)}`;

  return (
    <aside
      role="region"
      aria-label="Current order packet"
      className={`fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md ${className}`}
    >
      <button
        type="button"
        onClick={onOpenCart}
        className="flex min-h-[52px] w-full items-center justify-between rounded-[20px] bg-[#830020] px-4 py-2.5 text-white shadow-[var(--elevation-3)] active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-[13px] font-bold">
            {itemCount}
          </div>
          <div className="min-w-0 text-left">
            <div className="text-[14px] font-bold leading-tight truncate">
              {vendorName || 'View Order'}
            </div>
            <div className="text-[12px] opacity-80 leading-tight">Pay at gate · Zero fee</div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-bold text-[16px] text-[#FFB400]">
          <span>{rupeeTotal}</span>
          <ArrowRight className="h-4 w-4 text-white" />
        </div>
      </button>
    </aside>
  );
}
