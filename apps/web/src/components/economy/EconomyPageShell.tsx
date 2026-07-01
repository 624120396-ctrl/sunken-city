import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Backpack, ShoppingBag, Store } from 'lucide-react';
import { cn } from '@lib/utils';
import { ActionCard, PageShell } from '@components/system';

type EconomySection = 'shop' | 'inventory' | 'market';

interface EconomyPageShellProps {
  active: EconomySection;
  eyebrow: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

const economyNav: Array<{
  key: EconomySection;
  label: string;
  description: string;
  to: string;
  icon: typeof ShoppingBag;
}> = [
  {
    key: 'shop',
    label: '拉莱耶遗珍',
    description: '购买藏品、外观与旧日补给',
    to: '/shop',
    icon: ShoppingBag,
  },
  {
    key: 'inventory',
    label: '背包',
    description: '管理道具、印记与遗物绑定',
    to: '/inventory',
    icon: Backpack,
  },
  {
    key: 'market',
    label: '市场',
    description: '交易遗物并查看自己的挂单',
    to: '/market',
    icon: Store,
  },
];

export function EconomyPageShell({
  active,
  eyebrow,
  title,
  description,
  meta,
  action,
  children,
}: EconomyPageShellProps) {
  return (
    <PageShell
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
        <div className="xl:sticky xl:top-20 xl:self-start">
          <nav className="grid grid-cols-3 gap-2 xl:grid-cols-1" aria-label="经济区导航">
            {economyNav.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className="group block h-full outline-none"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <ActionCard
                    title={item.label}
                    description={item.description}
                    icon={<Icon size={18} />}
                    tone={isActive ? 'gold' : item.key === 'market' ? 'blood' : 'neutral'}
                    actions={
                      <ArrowRight
                        size={14}
                        className={cn(
                          'hidden transition-transform sm:block',
                          isActive ? 'translate-x-0 opacity-100' : 'opacity-50 group-hover:translate-x-0.5 group-hover:opacity-100'
                        )}
                      />
                    }
                    className={cn('h-full min-h-[72px] md:min-h-[84px]', isActive && 'ring-1 ring-[var(--coc-accent-gold)]')}
                  />
                </Link>
              );
            })}
          </nav>
        </div>
      }
    >
      <main className="min-w-0">{children}</main>
    </PageShell>
  );
}
