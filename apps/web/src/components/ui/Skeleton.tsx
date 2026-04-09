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
        'skeleton-shimmer',
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
