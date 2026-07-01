import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@lib/utils';
import { Surface, type SurfaceTone } from './Surface';

interface ReadablePanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: SurfaceTone;
}

export function ReadablePanel({
  eyebrow,
  title,
  description,
  actions,
  tone = 'neutral',
  className,
  children,
  ...props
}: ReadablePanelProps) {
  return (
    <Surface
      variant="solid"
      tone={tone}
      padding="lg"
      className={cn('coc-readable-panel', className)}
      {...props}
    >
      {(eyebrow || title || description || actions) && (
        <div className="coc-readable-panel__header">
          <div className="min-w-0">
            {eyebrow && <div className="coc-readable-panel__eyebrow">{eyebrow}</div>}
            {title && <h2 className="coc-readable-panel__title">{title}</h2>}
            {description && <div className="coc-readable-panel__description">{description}</div>}
          </div>
          {actions && <div className="coc-readable-panel__actions">{actions}</div>}
        </div>
      )}
      <div className="coc-readable-panel__content">{children}</div>
    </Surface>
  );
}
