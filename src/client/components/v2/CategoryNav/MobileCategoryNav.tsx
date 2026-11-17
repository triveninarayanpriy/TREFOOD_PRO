import { ResponsiveImage } from '../../ui/ResponsiveImage';

export interface CategoryItem {
  id: string;
  name: string;
  imageUrl?: string;
  itemCount?: number;
}

export interface MobileCategoryNavProps {
  categories: CategoryItem[];
  activeCategoryId?: string;
  onSelectCategory: (id: string) => void;
  className?: string;
}

export function MobileCategoryNav({
  categories,
  activeCategoryId,
  onSelectCategory,
  className = '',
}: MobileCategoryNavProps) {
  return (
    <nav
      aria-label="Campus categories"
      className={`flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 no-scrollbar ${className}`}
    >
      {categories.map((cat) => {
        const isActive = activeCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`snap-start flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-[14px] font-bold transition-colors shrink-0 ${
              isActive
                ? 'border-[#830020] bg-[#830020] text-white shadow-xs dark:bg-[#FFB400] dark:text-[#1C1210] dark:border-[#FFB400]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] active:bg-[var(--color-surface-sunken)]'
            }`}
          >
            {cat.imageUrl && (
              <div className="h-6 w-6 overflow-hidden rounded-full shrink-0">
                <ResponsiveImage
                  src={cat.imageUrl}
                  alt=""
                  crop="1x1"
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <span>{cat.name}</span>
            {cat.itemCount !== undefined && (
              <span
                className={`text-[12px] opacity-75 font-normal ${
                  isActive ? 'text-white dark:text-stone-900' : 'text-[var(--color-text-muted)]'
                }`}
              >
                ({cat.itemCount})
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
