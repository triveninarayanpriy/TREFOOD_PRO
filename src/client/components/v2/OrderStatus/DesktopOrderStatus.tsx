import { CheckCircle2, Phone } from 'lucide-react';
import { PacketChit } from '../../ui/PacketChit';
import type { OrderStatusType } from '@shared/schemas';

export interface DesktopOrderStatusProps {
  orderNo: string;
  status: OrderStatusType;
  handoverCode: string;
  vendorName: string;
  gateName: string;
  etaMinutes?: number;
  totalPaise?: number;
  remainingWindowSeconds?: number;
  onConfirmDelivery?: () => void;
  vendorPhone?: string;
  className?: string;
}

export function DesktopOrderStatus({
  orderNo,
  status,
  handoverCode,
  vendorName,
  gateName,
  etaMinutes = 15,
  totalPaise = 14900,
  remainingWindowSeconds,
  onConfirmDelivery,
  vendorPhone = '+919999999999',
  className = '',
}: DesktopOrderStatusProps) {
  const isAtGate = status === 'at_gate';

  return (
    <div className={`grid grid-cols-12 gap-8 items-start ${className}`}>
      {/* Left Column: Handover Chit & Big 4-Digit Code */}
      <div className="col-span-5 space-y-5">
        <PacketChit
          orderNo={orderNo}
          handoverCode={handoverCode}
          vendorName={vendorName}
          gateName={gateName}
          status={status}
          etaMinutes={etaMinutes}
          totalPaise={totalPaise}
        />

        {/* High-Contrast Code Callout */}
        <div className="rounded-[20px] bg-[#1C1210] p-6 text-center text-white shadow-[var(--elevation-2)] space-y-2">
          <div className="text-[12px] font-bold uppercase tracking-wider text-stone-400">
            Handover 4-Digit Marker Code
          </div>
          <div className="font-handwriting text-6xl font-black tracking-widest text-[#FFB400] select-all">
            {handoverCode}
          </div>
          <p className="text-[14px] text-stone-300">
            Show this number to the courier at {gateName} to verify your packet.
          </p>
        </div>

        {isAtGate && onConfirmDelivery && (
          <button
            type="button"
            onClick={onConfirmDelivery}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#15803D] text-white text-[16px] font-extrabold shadow-[var(--elevation-2)] hover:bg-[#166534] transition-colors cursor-pointer"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>Confirm Delivery Received</span>
          </button>
        )}
      </div>

      {/* Right Column: Status Timeline & Counter Details */}
      <div className="col-span-7 space-y-6">
        <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--elevation-1)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Live Status
              </div>
              <h3 className="font-display text-[24px] font-bold text-[var(--color-text)] capitalize">
                {status.replace(/_/g, ' ')}
              </h3>
            </div>
            {isAtGate && remainingWindowSeconds !== undefined && (
              <div className="text-right">
                <div className="text-[12px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Gate Window
                </div>
                <div className="font-mono text-[20px] font-extrabold text-amber-900 dark:text-amber-200">
                  {Math.floor(remainingWindowSeconds / 60)}:
                  {(remainingWindowSeconds % 60).toString().padStart(2, '0')}
                </div>
              </div>
            )}
          </div>

          {/* Stepper Status Indicators */}
          <div className="space-y-4 pt-2">
            {[
              { key: 'placed', label: 'Order Placed', desc: 'Sent to campus kitchen counter' },
              { key: 'accepted', label: 'Accepted & Preparing', desc: 'Fresh prep in progress' },
              { key: 'out_for_delivery', label: 'Out for Delivery', desc: `Courier en route to ${gateName}` },
              { key: 'at_gate', label: 'At Your Gate', desc: 'Packet waiting at pickup point' },
              { key: 'delivered', label: 'Delivered', desc: '4-digit code verified' },
            ].map((step, idx) => {
              const orderStates = ['placed', 'accepted', 'out_for_delivery', 'at_gate', 'delivered'];
              const currentIdx = orderStates.indexOf(status);
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;

              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${
                        isPast
                          ? 'bg-[#15803D] text-white'
                          : isCurrent
                          ? 'bg-[#830020] text-white ring-4 ring-[#830020]/20'
                          : 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                      }`}
                    >
                      {isPast ? '✓' : idx + 1}
                    </div>
                    {idx < 4 && (
                      <div
                        className={`h-8 w-0.5 ${
                          isPast ? 'bg-[#15803D]' : 'bg-stone-200 dark:bg-stone-800'
                        }`}
                      />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <div
                      className={`text-[15px] font-bold ${
                        isCurrent
                          ? 'text-[#830020] dark:text-[#FFB400]'
                          : isPast
                          ? 'text-[var(--color-text)]'
                          : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      {step.label}
                    </div>
                    <div className="text-[13px] text-[var(--color-text-muted)]">{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vendor Contact Box */}
        <div className="flex items-center justify-between rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#830020]/10 text-[#830020] dark:bg-[#FFB400]/20 dark:text-[#FFB400]">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[14px] font-bold text-[var(--color-text)]">{vendorName}</div>
              <div className="text-[12px] text-[var(--color-text-muted)]">Campus Kitchen Counter</div>
            </div>
          </div>
          <a
            href={`tel:${vendorPhone}`}
            className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-[14px] font-bold text-[var(--color-text)] hover:border-[#830020] transition-colors"
          >
            <span>Call Counter</span>
          </a>
        </div>
      </div>
    </div>
  );
}
