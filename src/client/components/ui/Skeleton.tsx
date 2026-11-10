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
      className={`animate-pulse rounded-md bg-[var(--color-border)] ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function VendorCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
    </div>
  );
}

export function MenuItemSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton className="h-4 w-2/3 rounded" />
          <Skeleton className="h-3 w-1/3 rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />
        </div>
      </div>
      <Skeleton className="h-11 w-22 rounded-xl shrink-0" />
    </div>
  );
}
