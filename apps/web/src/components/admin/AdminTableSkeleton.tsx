import { Skeleton } from '@components/ui/Skeleton';

interface AdminTableSkeletonProps {
  rows?: number;
  cols?: number;
  showSearch?: boolean;
  showActions?: boolean;
}

export function AdminTableSkeleton({
  rows = 5,
  cols = 4,
  showSearch = true,
  showActions = true,
}: AdminTableSkeletonProps) {
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } as React.CSSProperties;
  return (
    <div className="coc-card space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-2">
          {showSearch && <Skeleton className="h-9 w-48" />}
          {showActions && <Skeleton className="h-9 w-24" />}
        </div>
      </div>

      {/* 表格头部 */}
      <div className="grid gap-4 border-b border-coc-void pb-2" style={gridStyle}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`th-${i}`} className="h-4 w-20" />
        ))}
      </div>

      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`tr-${r}`} className="grid gap-4 items-center py-3 border-b border-coc-void/50" style={gridStyle}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton
              key={`td-${r}-${c}`}
              className="h-3"
              style={{ width: c === cols - 1 ? '4rem' : `${60 + (r + c) * 5}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AdminCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="coc-card space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}
