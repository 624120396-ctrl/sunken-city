import type { ReactNode } from 'react';
import { cn } from '@lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-[var(--coc-border-subtle)] bg-black/24 px-6 py-10 text-center', className)}>
      {icon && <div className="mb-3 text-[var(--coc-text-muted)]">{icon}</div>}
      <div className="font-medium text-[var(--coc-text-primary)]">{title}</div>
      {description && <div className="mt-1 max-w-md text-sm text-[var(--coc-text-muted)]">{description}</div>}
      {actionLabel && onAction && (
        <Button type="button" variant="primary" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
