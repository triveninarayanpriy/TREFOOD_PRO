import { ResponsiveImage } from '../../ui/ResponsiveImage';
import type { CategoryItem } from './MobileCategoryNav';

export interface DesktopCategoryNavProps {
  categories: CategoryItem[];
  activeCategoryId?: string;
  onSelectCategory: (id: string) => void;
  className?: string;
}

export function DesktopCategoryNav({
  categories,
  activeCategoryId,
  onSelectCategory,
  className = '',
}: DesktopCategoryNavProps) {
  return (
    <nav
      aria-label="Campus categories"
      className={`flex flex-wrap items-center gap-3 border-b border-[var(--color-border-subtle)] pb-4 ${className}`}
    >
      {categories.map((cat) => {
        const isActive = activeCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`flex min-h-[44px] items-center gap-2.5 rounded-full border px-4 py-2 text-[15px] font-bold transition-all duration-150 cursor-pointer ${
              isActive
                ? 'border-[#830020] bg-[#830020] text-white shadow-xs dark:bg-[#FFB400] dark:text-[#1C1210] dark:border-[#FFB400]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#830020] hover:bg-[var(--color-surface-sunken)]'
            }`}
          >
            {cat.imageUrl && (
              <div className="h-7 w-7 overflow-hidden rounded-full shrink-0">
                <ResponsiveImage
                  src={cat.imageUrl}
                  alt=""
                  crop="1x1"
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <span>{cat.name}</span>
            {cat.itemCount !== undefined && (
              <span
                className={`text-[13px] font-medium opacity-80 ${
                  isActive ? 'text-white dark:text-stone-900' : 'text-[var(--color-text-muted)]'
                }`}
              >
                {cat.itemCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
