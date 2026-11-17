import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { MobileGateStatus } from '../../components/v2/GateStatus/MobileGateStatus';

export interface MobileTopBarProps {
  gateName: string;
  is24x7?: boolean;
  curfewTime?: string;
  onOpenGatePicker?: () => void;
  onOpenNotifications?: () => void;
}

export function MobileTopBar({
  gateName,
  is24x7,
  curfewTime,
  onOpenGatePicker,
  onOpenNotifications,
}: MobileTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4">
      <Link to="/" className="flex items-center gap-2 min-h-[44px] focus:outline-none">
        <img
          src="/images/brand/trefood-brand-logo.jpg"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 rounded-[8px] object-cover border border-[var(--color-border)]"
        />
        <span className="font-display text-[18px] font-black text-[#830020] dark:text-[#FFB400]">
          TreFood
        </span>
      </Link>

      <div className="flex-1 max-w-[210px]">
        <MobileGateStatus
          gateName={gateName}
          is24x7={is24x7}
          curfewTime={curfewTime}
          onClick={onOpenGatePicker}
        />
      </div>

      {onOpenNotifications && (
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Open notifications"
          className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text)] transition-colors"
        >
          <Bell className="h-5 w-5" />
        </button>
      )}
    </header>
  );
}
