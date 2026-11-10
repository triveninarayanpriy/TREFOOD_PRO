import { useState, useEffect } from 'react';
import { MapPin, Clock, Check, ShieldCheck } from 'lucide-react';
import { Sheet } from './Sheet';
import { Badge } from './Badge';
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
}

export function GatePicker({
  isOpen,
  open,
  onClose,
  gates: propGates,
  selectedGateId,
  currentGateId,
  onSelectGate,
}: GatePickerProps) {
  const show = open ?? isOpen ?? false;
  const activeGateId = currentGateId ?? selectedGateId ?? null;
  const nightSafeNow = isNightSafetyActive();

  const [fetchedGates, setFetchedGates] = useState<Gate[]>([]);

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

  const gateList = propGates || fetchedGates;

  return (
    <Sheet open={show} onClose={onClose} title="Choose Delivery Gate">
      <div className="space-y-3">
        <p className="text-xs text-[var(--color-text-muted)]">
          Packets are handed over at campus gates with zero delivery fee. Main Gate & Academic Blocks stay open 24x7; Boys and Girls Hostels close at 19:30 IST.
        </p>

        {nightSafeNow && (
          <div className="flex items-center gap-2 rounded-xl border border-[#FCD34D] bg-[#FFF8E1] px-3 py-2 text-xs font-semibold text-[#78350F] dark:border-[#92400E] dark:bg-[#331F04] dark:text-[#FDE68A]">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>After 7 PM Campus Night Safety is active — owner or senior staff deliver directly.</span>
          </div>
        )}

        <div className="space-y-2.5 pt-1">
          {gateList.map((gate) => {
            const isSelected = gate.id === activeGateId;
            const status = getGateCurfewStatus(gate);

            return (
              <button
                key={gate.id}
                type="button"
                onClick={() => {
                  onSelectGate(gate.id);
                  onClose();
                }}
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
                    <div className="flex flex-wrap items-center gap-2">
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
                        {status.label}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {status.is24x7 ? 'No curfew limit' : `Curfew: ${gate.curfewTime} IST`}
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
    </Sheet>
  );
}
