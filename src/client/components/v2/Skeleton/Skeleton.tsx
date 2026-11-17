import { useViewport } from '../../../hooks/useViewport';

export function MobileCardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs animate-pulse">
      <div className="aspect-[4/3] w-28 shrink-0 rounded-[12px] bg-stone-200 dark:bg-stone-800" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 w-3/4 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-3 w-1/2 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-3 w-1/3 rounded bg-stone-200 dark:bg-stone-800" />
      </div>
    </div>
  );
}

export function DesktopCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elevation-1)] animate-pulse space-y-4">
      <div className="aspect-[4/3] w-full bg-stone-200 dark:bg-stone-800" />
      <div className="p-6 space-y-3">
        <div className="h-6 w-3/4 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-4 w-1/2 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="pt-2 border-t border-[var(--color-border-subtle)] space-y-2">
          <div className="h-3 w-1/3 rounded bg-stone-200 dark:bg-stone-800" />
          <div className="h-4 w-full rounded bg-stone-200 dark:bg-stone-800" />
          <div className="h-4 w-5/6 rounded bg-stone-200 dark:bg-stone-800" />
        </div>
      </div>
    </div>
  );
}

export interface SkeletonV2Props {
  variant?: 'card' | 'grid' | 'line' | 'auto';
  count?: number;
}

export function SkeletonV2({ variant = 'auto', count = 1 }: SkeletonV2Props) {
  const { isDesktop } = useViewport();
  const renderDesktop = variant === 'grid' || (variant === 'auto' && isDesktop);

  if (renderDesktop) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: count || 3 }).map((_, i) => (
          <DesktopCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count || 3 }).map((_, i) => (
        <MobileCardSkeleton key={i} />
      ))}
    </div>
  );
}
