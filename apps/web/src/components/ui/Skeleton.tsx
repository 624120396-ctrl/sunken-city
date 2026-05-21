import { cn } from '@lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle' | 'rect';
  lines?: number;
  shimmer?: boolean;
}

export function Skeleton({
  className,
  variant = 'text',
  lines = 1,
  shimmer = true,
}: SkeletonProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 rounded bg-coc-void/50',
              shimmer && 'animate-pulse',
              i === lines - 1 && lines > 1 && 'w-3/4'
            )}
          />
        ))}
      </div>
    );
  }

  const variantStyles = {
    text: 'h-4 rounded w-full',
    card: 'rounded-xl',
    circle: 'rounded-full',
    rect: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'bg-coc-void/50',
        variantStyles[variant],
        shimmer && 'animate-pulse',
        className
      )}
    />
  );
}

/**
 * 卡片骨架屏
 */
interface CardSkeletonProps {
  className?: string;
  header?: boolean;
  footer?: boolean;
  lines?: number;
}

export function CardSkeleton({
  className,
  header = true,
  footer = true,
  lines = 3,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-coc-void bg-coc-surface/50 p-6',
        className
      )}
    >
      {header && (
        <div className="flex items-center gap-3 mb-4">
          <Skeleton variant="circle" className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-1/3" />
            <Skeleton className="w-1/4 h-3" />
          </div>
        </div>
      )}

      <Skeleton lines={lines} />

      {footer && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-coc-void">
          <Skeleton className="w-20 h-8" />
          <Skeleton className="w-24 h-8" />
        </div>
      )}
    </div>
  );
}

/**
 * 列表骨架屏
 */
interface ListSkeletonProps {
  count?: number;
  className?: string;
}

export function ListSkeleton({ count = 5, className }: ListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} header lines={2} footer={false} />
      ))}
    </div>
  );
}

/**
 * 页面骨架屏（全页加载状态）
 */
export function PageSkeleton() {
  return (
    <div className="min-h-[100dvh] p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-48 h-8" />
        <Skeleton className="w-24 h-8" />
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* 主内容 */}
      <CardSkeleton lines={5} />
      <ListSkeleton count={3} />
    </div>
  );
}
