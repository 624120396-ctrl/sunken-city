import type { ReactNode } from 'react';
import { cn } from '@lib/utils';
import { Surface } from './Surface';

type PageShellLayout = 'single' | 'with-aside';

interface PageShellProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  layout?: PageShellLayout;
  className?: string;
  contentClassName?: string;
}

export function PageShell({
  eyebrow,
  title,
  description,
  actions,
  aside,
  children,
  layout = aside ? 'with-aside' : 'single',
  className,
  contentClassName,
}: PageShellProps) {
  return (
    <section className={cn('coc-page-shell', className)} data-layout={layout}>
      <Surface variant="page" padding="lg" className="coc-page-shell__header">
        <div className="min-w-0">
          {eyebrow && <div className="coc-page-shell__eyebrow">{eyebrow}</div>}
          <h1 className="coc-page-shell__title">{title}</h1>
          {description && <div className="coc-page-shell__description">{description}</div>}
        </div>
        {actions && <div className="coc-page-shell__actions">{actions}</div>}
      </Surface>

      <div className={cn('coc-page-shell__body', contentClassName)}>
        <div className="coc-page-shell__main">{children}</div>
        {aside && <aside className="coc-page-shell__aside">{aside}</aside>}
      </div>
    </section>
  );
}
