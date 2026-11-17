import { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, ShieldCheck } from 'lucide-react';
import type { Gate } from '@shared/schemas';

export interface DesktopGateStatusProps {
  selectedGateId?: string;
  gates?: Gate[];
  onSelectGate?: (gateId: string) => void;
  gateName?: string;
  is24x7?: boolean;
  curfewTime?: string;
  countdownMinutes?: number;
  className?: string;
}

export function DesktopGateStatus({
  selectedGateId,
  gates = [],
  onSelectGate,
  gateName,
  is24x7,
  curfewTime,
  countdownMinutes,
  className = '',
}: DesktopGateStatusProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const matchedGate = gates.find((g) => g.id === selectedGateId) || gates[0];
  const currentGate = {
    id: matchedGate?.id || 'gate_main',
    name: gateName || matchedGate?.name || 'Main Gate / Academic Blocks',
    curfewTime: curfewTime || matchedGate?.curfewTime || '23:59',
    is24x7: is24x7 !== undefined ? is24x7 : (matchedGate?.is24x7 ?? true),
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Compact Top Nav Selector */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-[44px] items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5 text-left hover:border-[#830020] transition-colors cursor-pointer"
      >
        <MapPin className="h-4 w-4 text-[#830020] dark:text-[#FFB400] shrink-0" />
        <div className="min-w-0">
          <div className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Delivery Gate
          </div>
          <div className="font-bold text-[14px] text-[var(--color-text)] truncate max-w-[180px]">
            {currentGate.name}
          </div>
        </div>
        {currentGate.is24x7 ? (
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[13px] font-bold text-emerald-800 dark:text-emerald-300">
            Open 24x7
          </span>
        ) : countdownMinutes !== undefined && countdownMinutes <= 30 ? (
          <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 text-[13px] font-bold text-amber-900 dark:text-amber-200">
            Curfew in {countdownMinutes}m
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 text-[13px] font-bold text-amber-900 dark:text-amber-200">
            Curfew {currentGate.curfewTime}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
      </button>

      {/* Popover showing curfew schedule, gate reach & live countdown */}
      {open && gates.length > 0 && (
        <div className="absolute left-0 mt-2 w-80 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--elevation-3)] z-50 space-y-2">
          <div className="px-2 pt-1 pb-2 border-b border-[var(--color-border-subtle)]">
            <div className="font-display text-[15px] font-bold text-[var(--color-text)]">
              Choose Collection Gate
            </div>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Deliveries are handed over personally at hostel gate pickup points.
            </p>
          </div>

          <div className="space-y-1.5">
            {gates.map((g) => {
              const isSelected = g.id === selectedGateId;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    onSelectGate?.(g.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start justify-between gap-2 rounded-[12px] p-2.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#830020]/10 text-[#830020] dark:bg-[#FFB400]/15 dark:text-[#FFB400]'
                      : 'hover:bg-[var(--color-surface-sunken)] text-[var(--color-text)]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[14px] truncate">{g.name}</div>
                    <div className="text-[13px] text-[var(--color-text-muted)]">
                      {g.is24x7 ? '24 Hours accessible' : `Closes at ${g.curfewTime} IST`}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-[#830020] dark:bg-[#FFB400] mt-1.5 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[var(--color-border-subtle)] px-2 text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Curfew-aware routing: orders blocked before closing window.</span>
          </div>
        </div>
      )}
    </div>
  );
}
