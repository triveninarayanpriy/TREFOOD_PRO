import { useViewport } from '../../../hooks/useViewport';
import { MobileCartSummary } from './MobileCartSummary';
import { DesktopCartSummary, type DesktopCartSummaryProps } from './DesktopCartSummary';

export interface CartSummaryV2Props extends DesktopCartSummaryProps {
  forceVariant?: 'mobile' | 'desktop' | 'auto';
  onOpenMobileCart?: () => void;
}

export function CartSummaryV2({
  forceVariant = 'auto',
  onOpenMobileCart,
  ...props
}: CartSummaryV2Props) {
  const { isDesktop } = useViewport();
  const shouldRenderDesktop = forceVariant === 'desktop' || (forceVariant === 'auto' && isDesktop);

  if (shouldRenderDesktop) {
    return <DesktopCartSummary {...props} />;
  }

  return (
    <MobileCartSummary
      itemCount={props.items.reduce((s, i) => s + i.quantity, 0)}
      totalPaise={props.totalPaise}
      vendorName={props.vendorName}
      onOpenCart={onOpenMobileCart || props.onClose}
    />
  );
}
