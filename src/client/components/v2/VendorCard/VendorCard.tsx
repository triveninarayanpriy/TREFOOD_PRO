import { useViewport } from '../../../hooks/useViewport';
import { MobileVendorCard, type MobileVendorCardProps } from './MobileVendorCard';
import { DesktopVendorCard, type DesktopVendorCardProps } from './DesktopVendorCard';

export interface VendorCardV2Props extends DesktopVendorCardProps {
  forceVariant?: 'mobile' | 'desktop' | 'auto';
}

export function VendorCardV2({ forceVariant = 'auto', ...props }: VendorCardV2Props) {
  const { isDesktop } = useViewport();
  const shouldRenderDesktop = forceVariant === 'desktop' || (forceVariant === 'auto' && isDesktop);

  if (shouldRenderDesktop) {
    return <DesktopVendorCard {...props} />;
  }
  return <MobileVendorCard {...(props as MobileVendorCardProps)} />;
}
