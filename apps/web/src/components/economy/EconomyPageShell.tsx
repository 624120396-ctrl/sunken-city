import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Backpack, ShoppingBag, Store } from 'lucide-react';
import { cn } from '@lib/utils';
import { ActionCard, PageShell } from '@components/system';
import { getEconomyDistrictNav, type EconomySection } from './economyDistrictMeta';

interface EconomyPageShellProps {
  active: EconomySection;
  eyebrow: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

const economyIcons: Record<EconomySection, typeof ShoppingBag> = {
  shop: ShoppingBag,
  inventory: Backpack,
  market: Store,
};

export function EconomyPageShell({
  active,
  eyebrow,
  title,
  description,
  meta,
  action,
  children,
}: EconomyPageShellProps) {
  const economyNav = getEconomyDistrictNav(active);

  return (
    <PageShell
      className={cn('economy-page-shell', `economy-page-shell--${active}`)}
      data-testid={`economy-${active}-page`}
      title={title}
      eyebrow={eyebrow}
      description={description}
      actions={
        (meta || action) && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {meta}
            {action}
          </div>
        )
      }
      layout="with-aside"
      aside={
        <div className="economy-district-sidebar xl:sticky xl:top-20 xl:self-start">
          <div className="economy-district-sidebar__header">
            <span>NAMELESS MARKET</span>
            <strong>无名集市</strong>
          </div>
          <nav className="economy-district-nav" aria-label="经济区导航">
            {economyNav.map((item) => {
              const Icon = economyIcons[item.key];
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className="economy-district-link group"
                  data-active={item.active}
                  data-tone={item.tone}
                  aria-current={item.active ? 'page' : undefined}
                >
                  <div className="economy-district-link__seal">{item.district}</div>
                  <div className="economy-district-link__body">
                    <div className="economy-district-link__title">
                      <Icon size={17} />
                      <span>{item.label}</span>
                    </div>
                    <p>{item.description}</p>
                  </div>
                  <ArrowRight
                    size={14}
                    className={cn(
                      'economy-district-link__arrow',
                      item.active ? 'translate-x-0 opacity-100' : 'opacity-45 group-hover:translate-x-0.5 group-hover:opacity-100'
                    )}
                  />
                </Link>
              );
            })}
          </nav>
          <ActionCard
            className="economy-district-sidebar__notice"
            eyebrow="交易契约"
            title="流转守则"
            description="所有藏品均以档案编号流转，来源不可追问。"
            tone="gold"
          />
        </div>
      }
    >
      <main className="economy-page-shell__content min-w-0">{children}</main>
    </PageShell>
  );
}
