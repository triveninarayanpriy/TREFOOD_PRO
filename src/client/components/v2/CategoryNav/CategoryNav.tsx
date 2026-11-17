import { useViewport } from '../../../hooks/useViewport';
import { MobileCategoryNav, type MobileCategoryNavProps, type CategoryItem } from './MobileCategoryNav';
import { DesktopCategoryNav, type DesktopCategoryNavProps } from './DesktopCategoryNav';

export type { CategoryItem };

export interface CategoryNavV2Props extends DesktopCategoryNavProps {
  forceVariant?: 'mobile' | 'desktop' | 'auto';
}

export function CategoryNavV2({ forceVariant = 'auto', ...props }: CategoryNavV2Props) {
  const { isDesktop } = useViewport();
  const shouldRenderDesktop = forceVariant === 'desktop' || (forceVariant === 'auto' && isDesktop);

  if (shouldRenderDesktop) {
    return <DesktopCategoryNav {...props} />;
  }
  return <MobileCategoryNav {...(props as MobileCategoryNavProps)} />;
}
