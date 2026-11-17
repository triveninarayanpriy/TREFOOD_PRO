import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { MobileGateStatus } from '../../components/v2/GateStatus/MobileGateStatus';

export interface MobileTopBarProps {
  gateName: string;
  is24x7?: boolean;
  curfewTime?: string;
  onOpenGatePicker?: () => void;
  onOpenSearch?: () => void;
}

export function MobileTopBar({
  gateName,
  is24x7,
  curfewTime,
  onOpenGatePicker,
  onOpenSearch,
}: MobileTopBarProps) {
  const navigate = useNavigate();

  const handleSearchClick = () => {
    if (onOpenSearch) {
      onOpenSearch();
    } else {
      navigate('/app/search');
    }
  };

  return (
    <header role="banner" className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md px-3 pt-[env(safe-area-inset-top)]">
      {/* Left: Compact Gate Selector with Live Curfew Countdown */}
      <div className="flex-1 min-w-0">
        <MobileGateStatus
          gateName={gateName}
          is24x7={is24x7}
          curfewTime={curfewTime}
          onClick={onOpenGatePicker}
        />
      </div>

      {/* Right: Search Button (Only Gate Selector & Search Button in Top Bar) */}
      <button
        type="button"
        onClick={handleSearchClick}
        aria-label="Search dishes or canteens"
        className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-sunken)] text-[var(--color-text)] hover:border-[#830020] active:scale-95 transition-all cursor-pointer shrink-0"
      >
        <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
      </button>
    </header>
  );
}
