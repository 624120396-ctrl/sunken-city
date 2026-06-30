import type { HTMLAttributes } from 'react';
import { cn } from '@lib/utils';

type SurfaceVariant = 'base' | 'panel' | 'elevated' | 'glass' | 'solid' | 'danger';
type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  padding?: SurfacePadding;
  interactive?: boolean;
}

const paddingClass: Record<SurfacePadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 md:p-5',
  lg: 'p-5 md:p-6',
};

export function Surface({
  variant = 'panel',
  padding = 'md',
  interactive = false,
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      data-variant={variant}
      data-interactive={interactive ? 'true' : 'false'}
      className={cn('coc-surface-v2', paddingClass[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}
