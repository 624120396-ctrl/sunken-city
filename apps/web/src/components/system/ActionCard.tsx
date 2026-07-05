import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@lib/utils';
import { Surface, type SurfaceMaterial, type SurfaceTone } from './Surface';

interface ActionCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  media?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  tone?: SurfaceTone;
  material?: SurfaceMaterial;
}

export function ActionCard({
  eyebrow,
  title,
  description,
  icon,
  media,
  meta,
  actions,
  tone = 'neutral',
  material = 'none',
  className,
  children,
  ...props
}: ActionCardProps) {
  return (
    <Surface
      variant="panel"
      tone={tone}
      material={material}
      padding="none"
      interactive
      className={cn('coc-action-card', className)}
      {...props}
    >
      {media && <div className="coc-action-card__media">{media}</div>}
      <div className="coc-action-card__body">
        <div className="coc-action-card__heading">
          {icon && <div className="coc-action-card__icon">{icon}</div>}
          <div className="min-w-0">
            {eyebrow && <div className="coc-action-card__eyebrow">{eyebrow}</div>}
            <h3 className="coc-action-card__title">{title}</h3>
          </div>
        </div>
        {description && <div className="coc-action-card__description">{description}</div>}
        {children && <div className="coc-action-card__content">{children}</div>}
        {(meta || actions) && (
          <div className="coc-action-card__footer">
            {meta && <div className="coc-action-card__meta">{meta}</div>}
            {actions && <div className="coc-action-card__actions">{actions}</div>}
          </div>
        )}
      </div>
    </Surface>
  );
}
