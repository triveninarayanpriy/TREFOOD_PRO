import { ShieldCheck, MapPin } from 'lucide-react';
import { useTranslation } from '../../i18n';

export type PacketChitStatus =
  | 'placed'
  | 'accepted'
  | 'out_for_delivery'
  | 'at_gate'
  | 'delivered'
  | 'cancelled'
  | 'expired';

export interface PacketChitProps {
  orderNo: string;
  handoverCode: string;
  vendorName: string;
  gateName: string;
  status: PacketChitStatus;
  etaMinutes?: number;
  totalPaise: number;
  itemSummary?: string;
  chitNote?: string;
  className?: string;
}

/**
 * Signature Component #5: PacketChit
 * The real-world packet slip stapled onto every NIT Patna order packet, displaying the
 * 4-digit handover code in Caveat handwriting flipping digit-by-digit like a departure board.
 */
export function PacketChit({
  orderNo,
  handoverCode,
  vendorName,
  gateName,
  status,
  etaMinutes,
  totalPaise,
  itemSummary,
  chitNote = 'Match digits on marker label before paying',
  className = '',
}: PacketChitProps) {
  const { t } = useTranslation();
  const digits = handoverCode.slice(0, 4).padEnd(4, '0').split('');

  const statusTextMap: Record<PacketChitStatus, string> = {
    placed: t('status.placed', 'Order Placed'),
    accepted: t('status.preparing', 'Preparing'),
    out_for_delivery: t('status.out_for_delivery', 'Out for Delivery'),
    at_gate: t('status.at_gate', 'At Gate · Show Code'),
    delivered: t('status.delivered', 'Delivered'),
    cancelled: t('status.cancelled', 'Cancelled'),
    expired: t('status.expired', 'Expired'),
  };

  return (
    <div
      data-testid="packet-chit"
      className={`relative rounded-xl border-2 border-[#B5651D]/45 bg-[#FFF9EE] p-4 text-[#1C1210] shadow-[var(--shadow-card)] dark:border-[#D48942]/45 dark:bg-[#231914] dark:text-[#FBF6EE] ${className}`}
    >
      {/* Top Staple / Chit Strip */}
      <div className="flex items-center justify-between gap-2 border-b border-dashed border-[#B5651D]/40 pb-2.5">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#824410] dark:text-[#E5A365]">
            Packet Chit · #{orderNo}
          </div>
          <div className="font-display text-sm font-bold text-[var(--color-text)] truncate max-w-[210px]">
            {vendorName}
          </div>
        </div>

        <span
          className={`inline-flex items-center rounded-md px-2.5 py-1 font-mono text-[11px] font-bold ${
            status === 'at_gate'
              ? 'bg-[#830020] text-white'
              : status === 'delivered'
              ? 'bg-[#15803D] text-white'
              : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
          }`}
        >
          {statusTextMap[status]}
        </span>
      </div>

      {/* Flipping Caveat Handwritten Code Board */}
      <div className="py-4 text-center space-y-2">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {t('ticket.handover_code', 'Match 4-Digit Code at Gate')}
        </div>

        <div
          key={`${handoverCode}-${status}`}
          className="flex items-center justify-center gap-2.5"
          aria-label={`4-digit handover code ${digits.join(' ')}`}
        >
          {digits.map((digit, idx) => (
            <span
              key={`${idx}-${digit}`}
              style={{ animationDelay: `${idx * 70}ms` }}
              className="tf-digit-flip h-16 w-12 items-center justify-center rounded-lg border-2 border-[#1C1210]/20 bg-white font-handwriting text-5xl font-bold leading-none text-[#830020] shadow-xs dark:border-[#FBF6EE]/25 dark:bg-[#140D0B] dark:text-[#FFB400]"
            >
              {digit}
            </span>
          ))}
        </div>

        <p className="font-handwriting text-xl font-bold text-[#824410] dark:text-[#E5A365]">
          {chitNote}
        </p>
      </div>

      {/* Footer Gate & Total Details */}
      <div className="space-y-1.5 border-t border-dashed border-[#B5651D]/40 pt-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 font-medium text-[var(--color-text-muted)]">
            <MapPin className="h-3.5 w-3.5 text-[#830020] dark:text-[#FFB400]" strokeWidth={1.75} aria-hidden="true" />
            {gateName}
          </span>
          {typeof etaMinutes === 'number' && status !== 'delivered' && (
            <span className="font-mono font-bold text-[#830020] dark:text-[#FFB400]">
              ETA {etaMinutes} min
            </span>
          )}
        </div>

        {itemSummary && (
          <div className="text-[var(--color-text-muted)] truncate">{itemSummary}</div>
        )}

        <div className="flex items-center justify-between pt-0.5 font-mono text-xs font-bold">
          <span className="inline-flex items-center gap-1 text-[#15803D] dark:text-[#4ADE80]">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            Pay at gate · ₹0 delivery
          </span>
          <span>₹{Math.round(totalPaise / 100)}</span>
        </div>
      </div>
    </div>
  );
}
