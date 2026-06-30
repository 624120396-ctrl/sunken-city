import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@lib/utils';

interface ListRowProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function ListRow({ label, meta, description, leading, trailing, className, ...props }: ListRowProps) {
  return (
    <div
      className={cn('flex min-h-14 items-center gap-3 border-b border-[var(--coc-border-subtle)] px-3 py-2 last:border-b-0', className)}
      {...props}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium text-[var(--coc-text-primary)]">{label}</div>
          {meta && <div className="shrink-0 text-xs text-[var(--coc-text-muted)]">{meta}</div>}
        </div>
        {description && <div className="mt-0.5 line-clamp-2 text-xs text-[var(--coc-text-secondary)]">{description}</div>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
