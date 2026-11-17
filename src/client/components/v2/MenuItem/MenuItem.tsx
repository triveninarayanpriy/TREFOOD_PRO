import { useViewport } from '../../../hooks/useViewport';
import { MobileMenuItem, type MobileMenuItemProps } from './MobileMenuItem';
import { DesktopMenuItem, type DesktopMenuItemProps } from './DesktopMenuItem';

export interface MenuItemV2Props extends DesktopMenuItemProps {
  forceVariant?: 'mobile' | 'desktop' | 'auto';
}

export function MenuItemV2({ forceVariant = 'auto', ...props }: MenuItemV2Props) {
  const { isDesktop } = useViewport();
  const shouldRenderDesktop = forceVariant === 'desktop' || (forceVariant === 'auto' && isDesktop);

  if (shouldRenderDesktop) {
    return <DesktopMenuItem {...props} />;
  }
  return <MobileMenuItem {...(props as MobileMenuItemProps)} />;
}
