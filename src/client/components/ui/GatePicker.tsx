import { useState, useEffect } from 'react';
import { MapPin, Clock, Check } from 'lucide-react';
import { Sheet } from './Sheet';
import type { Gate } from '@shared/schemas';

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

  const [fetchedGates, setFetchedGates] = useState<Gate[]>([]);

  useEffect(() => {
    if (!propGates && show) {
      fetch('/api/gates')
        .then((res) => res.json())
        .then((data: any) => {
          if (data.gates) setFetchedGates(data.gates);
        })
        .catch(() => {});
    }
  }, [propGates, show]);

  const gateList = propGates || fetchedGates;

  return (
    <Sheet open={show} onClose={onClose} title="Choose Delivery Hostel Gate">
      <div className="space-y-3">
        <p className="text-xs text-stone-500">
          Delivery partners drop packets at campus hostel gates. Orders are curfew-aware with zero delivery fee.
        </p>

        <div className="space-y-2 pt-2">
          {gateList.map((gate) => {
            const isSelected = gate.id === activeGateId;

            return (
              <button
                key={gate.id}
                type="button"
                onClick={() => {
                  onSelectGate(gate.id);
                  onClose();
                }}
                className={`flex w-full min-h-[56px] items-center justify-between rounded-2xl border p-3.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#F2A900] active:scale-[0.99] ${
                  isSelected
                    ? 'border-[#830020] bg-[#830020]/5 ring-1 ring-[#830020] dark:border-amber-400 dark:bg-amber-400/10 dark:ring-amber-400'
                    : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-800 dark:hover:border-stone-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${
                      isSelected
                        ? 'bg-[#830020] text-white dark:bg-amber-400 dark:text-stone-950'
                        : 'bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-stone-100">
                      {gate.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        Curfew: {gate.curfewTime}
                      </span>
                      <span>•</span>
                      <span>{gate.bufferMinutes}m buffer</span>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#830020] text-white dark:bg-amber-400 dark:text-stone-950">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
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
