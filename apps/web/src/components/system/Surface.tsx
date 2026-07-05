import type { HTMLAttributes } from 'react';
import { cn } from '@lib/utils';

export type SurfaceVariant = 'page' | 'panel' | 'solid' | 'glass' | 'elevated' | 'danger';
export type SurfaceTone = 'neutral' | 'gold' | 'blood' | 'ocean' | 'madness';
export type SurfaceDensity = 'compact' | 'normal' | 'spacious';
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';
export type SurfaceMaterial = 'none' | 'archive' | 'limestone' | 'basalt' | 'copper' | 'relic';

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  tone?: SurfaceTone;
  density?: SurfaceDensity;
  padding?: SurfacePadding;
  material?: SurfaceMaterial;
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
  tone = 'neutral',
  density = 'normal',
  padding = 'md',
  material = 'none',
  interactive = false,
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      data-variant={variant}
      data-tone={tone}
      data-density={density}
      data-material={material}
      data-interactive={interactive ? 'true' : 'false'}
      className={cn('coc-surface-v2', paddingClass[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}
