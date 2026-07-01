import type { HTMLAttributes } from 'react';
import { cn } from '@lib/utils';
import { Surface, type SurfaceTone } from './Surface';

type CardVariant = 'default' | 'featured' | 'room' | 'character' | 'item' | 'log';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
}

export function Card({
  variant = 'default',
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  const toneByVariant: Record<CardVariant, SurfaceTone> = {
    default: 'neutral',
    featured: 'gold',
    room: 'ocean',
    character: 'gold',
    item: 'madness',
    log: 'ocean',
  };

  return (
    <Surface
      variant="panel"
      tone={toneByVariant[variant]}
      interactive={interactive}
      data-card-variant={variant}
      className={cn(className)}
      {...props}
    >
      {children}
    </Surface>
  );
}
