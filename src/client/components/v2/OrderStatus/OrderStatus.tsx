import { useViewport } from '../../../hooks/useViewport';
import { MobileOrderStatus, type MobileOrderStatusProps } from './MobileOrderStatus';
import { DesktopOrderStatus, type DesktopOrderStatusProps } from './DesktopOrderStatus';

export interface OrderStatusV2Props extends DesktopOrderStatusProps {
  forceVariant?: 'mobile' | 'desktop' | 'auto';
}

export function OrderStatusV2({ forceVariant = 'auto', ...props }: OrderStatusV2Props) {
  const { isDesktop } = useViewport();
  const shouldRenderDesktop = forceVariant === 'desktop' || (forceVariant === 'auto' && isDesktop);

  if (shouldRenderDesktop) {
    return <DesktopOrderStatus {...props} />;
  }
  return <MobileOrderStatus {...(props as MobileOrderStatusProps)} />;
}
