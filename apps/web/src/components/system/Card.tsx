import type { HTMLAttributes } from 'react';
import { cn } from '@lib/utils';

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
  return (
    <div
      data-variant={variant}
      data-interactive={interactive ? 'true' : 'false'}
      className={cn('coc-card-v2', className)}
      {...props}
    >
      {children}
    </div>
  );
}
