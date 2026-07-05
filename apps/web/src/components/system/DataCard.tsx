import type { ReactNode } from 'react';
import { cn } from '@lib/utils';
import { Surface, type SurfaceMaterial, type SurfaceTone } from './Surface';

interface DataCardProps {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: SurfaceTone;
  material?: SurfaceMaterial;
  className?: string;
}

export function DataCard({
  label,
  value,
  detail,
  icon,
  tone = 'neutral',
  material = 'none',
  className,
}: DataCardProps) {
  return (
    <Surface
      variant="panel"
      tone={tone}
      material={material}
      density="compact"
      padding="sm"
      className={cn('coc-data-card', className)}
    >
      <div className="coc-data-card__topline">
        <div className="coc-data-card__label">{label}</div>
        {icon && <div className="coc-data-card__icon">{icon}</div>}
      </div>
      <div className="coc-data-card__value">{value}</div>
      {detail && <div className="coc-data-card__detail">{detail}</div>}
    </Surface>
  );
}
