export function Skeleton({
  className = '',
  width,
  height,
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-stone-200 dark:bg-stone-800 ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function VendorCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
    </div>
  );
}

export function MenuItemSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-stone-100 dark:border-stone-850">
      <div className="flex flex-col gap-1 flex-1">
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
        <Skeleton className="h-3 w-4/5 rounded" />
      </div>
      <Skeleton className="h-9 w-20 rounded-lg shrink-0" />
    </div>
  );
}
