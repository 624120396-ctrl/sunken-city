import type { CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  circle?: boolean;
}

export function Skeleton({ className = '', style, circle }: SkeletonProps) {
  return (
    <div
      className={[
        'skeleton-shimmer-v2',
        circle ? 'rounded-full' : 'rounded',
        className,
      ].join(' ')}
      style={style}
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

/**
 * 卡片级骨架屏
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card-layer-2 p-5 space-y-4 ${className}`}>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

/**
 * 页面级骨架屏（全页加载状态）
 */
export function PageSkeleton() {
  return (
    <div className="min-h-[100dvh] p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="w-48 h-8" />
        <Skeleton className="w-24 h-8" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-32" />
      </div>
      <SkeletonCard className="h-48" />
      <div className="space-y-4">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
      </div>
    </div>
  );
}
