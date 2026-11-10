import { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Check, ShieldCheck, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { Sheet } from './Sheet';
import { Badge } from './Badge';
import { IconButton } from './IconButton';
import type { Gate } from '@shared/schemas';
import { getGateCurfewStatus, isNightSafetyActive } from '@shared/curfew';

export interface GatePickerProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  gates?: Gate[];
  selectedGateId?: string | null;
  currentGateId?: string | null;
  onSelectGate: (gate: Gate | string) => void;
  /** 'popover' renders bottom sheet on mobile (<640px) and anchored popover on desktop (>=640px). 'sheet' renders bottom/modal Sheet everywhere. */
  variant?: 'sheet' | 'popover';
}

export function GatePicker({
  isOpen,
  open,
  onClose,
  gates: propGates,
  selectedGateId,
  currentGateId,
  onSelectGate,
  variant = 'sheet',
}: GatePickerProps) {
  const show = open ?? isOpen ?? false;
  const activeGateId = currentGateId ?? selectedGateId ?? null;
  const nightSafeNow = isNightSafetyActive();

  const [fetchedGates, setFetchedGates] = useState<Gate[]>([]);
  const [closedPromptGate, setClosedPromptGate] = useState<Gate | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!propGates && show) {
      fetch('/api/gates')
        .then((res) => res.json() as Promise<{ gates?: Gate[] }>)
        .then((data) => {
          if (data.gates) setFetchedGates(data.gates);
        })
        .catch(() => {});
    }
  }, [propGates, show]);

  useEffect(() => {
    if (!show) {
      setClosedPromptGate(null);
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [show, onClose]);

  const gateList = propGates && propGates.length > 0 ? propGates : fetchedGates;

  const nearestOpenGate =
    gateList
      .filter((g) => getGateCurfewStatus(g).isOpen)
      .sort((a, b) => a.travelMinutes - b.travelMinutes)[0] || null;

  const handleGateClick = (gate: Gate) => {
    const status = getGateCurfewStatus(gate);
    // Persist chosen gate immediately across refreshes
    onSelectGate(gate.id);

    if (!status.isOpen) {
      // Explain why closed and offer nearest open gate with 1 tap before closing
      setClosedPromptGate(gate);
      return;
    }

    setClosedPromptGate(null);
    onClose();
  };

  const innerContent = (
    <div className="space-y-3">
      <p className="text-xs text-[var(--color-text-muted)]">
        Main Gate & Academic Blocks run 24x7; Boys and Girls Hostel Gates close at 19:30 IST. Choosing a gate filters menus automatically.
      </p>

      {nightSafeNow && (
        <div className="flex items-center gap-2 rounded-xl border border-[#FCD34D] bg-[#FFF8E1] px-3 py-2 text-xs font-semibold text-[#78350F] dark:border-[#92400E] dark:bg-[#331F04] dark:text-[#FDE68A]">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>After 7 PM Campus Night Safety is active — owner or senior staff deliver directly.</span>
        </div>
      )}

      {closedPromptGate && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-950 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100 space-y-2.5"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-700 dark:text-red-400 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-bold">
                {closedPromptGate.name} is closed right now
              </div>
              <p className="mt-0.5 opacity-90">
                Curfew ended at {closedPromptGate.curfewTime} IST (with a {closedPromptGate.bufferMinutes}m arrival window). Vendors cannot drop packets at this gate until morning.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {nearestOpenGate && (
              <button
                type="button"
                onClick={() => {
                  onSelectGate(nearestOpenGate.id);
                  setClosedPromptGate(null);
                  onClose();
                }}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#830020] px-3 text-xs font-bold text-white shadow-xs hover:bg-[#6a001a] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
              >
                <span>Switch to {nearestOpenGate.name.split('/')[0].trim()} (Open)</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-red-300 bg-white/80 px-3 text-xs font-semibold text-red-950 hover:bg-white dark:border-red-700 dark:bg-black/30 dark:text-red-100"
            >
              Keep Closed Gate
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 pt-1">
        {gateList.map((gate) => {
          const isSelected = gate.id === activeGateId;
          const status = getGateCurfewStatus(gate);

          return (
            <button
              key={gate.id}
              type="button"
              onClick={() => handleGateClick(gate)}
              className={`flex w-full min-h-[56px] items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB400] active:scale-[0.99] ${
                isSelected
                  ? 'border-[#830020] bg-[#830020]/5 ring-1 ring-[#830020] dark:border-[#FFB400] dark:bg-[#FFB400]/10 dark:ring-[#FFB400]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[#830020]/40'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    isSelected
                      ? 'bg-[#830020] text-white dark:bg-[#FFB400] dark:text-[#1C1917]'
                      : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]'
                  }`}
                >
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-sm text-[var(--color-text)]">{gate.name}</span>
                    <Badge
                      variant={
                        status.is24x7
                          ? 'success'
                          : !status.isOpen
                          ? 'closed'
                          : status.isNearingCurfew
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {status.statusText}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1 font-mono font-semibold">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {status.is24x7
                        ? 'Open 24 hours'
                        : status.countdownText
                        ? status.countdownText
                        : `Curfew ${gate.curfewTime} IST`}
                    </span>
                    <span>•</span>
                    <span>{gate.bufferMinutes}m window</span>
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#830020] text-white dark:bg-[#FFB400] dark:text-[#1C1917]">
                  <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (variant === 'popover') {
    if (!show) return null;

    return (
      <>
        {/* Backdrop: dims on mobile bottom sheet; transparent click-away on desktop popover */}
        <div
          className="fixed inset-0 z-40 bg-stone-950/55 sm:bg-transparent backdrop-blur-[1px] sm:backdrop-blur-none"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Responsive Panel: Bottom Sheet on mobile (<640px), Anchored Popover on desktop (>=640px) */}
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-label="Choose Delivery Gate"
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[400px] sm:rounded-2xl"
        >
          <div className="mb-3 flex justify-center sm:hidden">
            <div className="h-1.5 w-12 rounded-full bg-[var(--color-border)]" />
          </div>
          <div className="mb-3 flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2.5">
            <h2 className="text-base font-bold text-[var(--color-text)]">Choose Delivery Gate</h2>
            <IconButton label="Close gate picker" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>
          {innerContent}
        </div>
      </>
    );
  }

  return (
    <Sheet open={show} onClose={onClose} title="Choose Delivery Gate">
      {innerContent}
    </Sheet>
  );
}
