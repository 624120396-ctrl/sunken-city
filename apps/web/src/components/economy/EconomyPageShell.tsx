import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Backpack, ShoppingBag, Store } from 'lucide-react';
import { cn } from '@lib/utils';

type EconomySection = 'shop' | 'inventory' | 'market';

interface EconomyPageShellProps {
  active: EconomySection;
  eyebrow: string;
  title: string;
  description: string;
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
    <div data-testid={`economy-${active}-page`} className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-3 md:gap-5 md:p-5">
      <section className="relative overflow-hidden rounded-xl border border-[#3a3a3a]/45 bg-black/35 p-4 shadow-xl shadow-black/35 backdrop-blur-md md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(201,162,39,0.14),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(139,38,53,0.18),transparent_32%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 text-xs uppercase tracking-[0.24em] text-[#8b8375]">
              {eyebrow}
            </div>
            <h1 className="font-ritual text-2xl font-bold tracking-wide text-[#f3d77a] md:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#a69b85]">
              {description}
            </p>
          </div>
          {(meta || action) && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {meta}
              {action}
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-20 xl:self-start">
          <nav className="grid grid-cols-3 gap-2 xl:grid-cols-1" aria-label="经济区导航">
            {economyNav.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={cn(
                    'group relative min-h-[72px] overflow-hidden rounded-xl border p-3 transition-colors md:min-h-[84px]',
                    isActive
                      ? 'border-[#c9a227]/55 bg-[#c9a227]/15 text-[#f3d77a]'
                      : 'border-[#3a3a3a]/45 bg-black/30 text-[#b0a898] hover:border-[#c9a227]/45 hover:text-[#e8d4a0]'
                  )}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(201,162,39,0.10),transparent_45%,rgba(139,38,53,0.08))] opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative flex items-center justify-between gap-2">
                    <Icon size={18} />
                    <ArrowRight
                      size={14}
                      className={cn(
                        'hidden transition-transform sm:block',
                        isActive ? 'translate-x-0 opacity-100' : 'opacity-40 group-hover:translate-x-0.5 group-hover:opacity-100'
                      )}
                    />
                  </div>
                  <div className="relative mt-2 text-sm font-semibold leading-tight">{item.label}</div>
                  <div className="relative mt-1 hidden text-xs leading-relaxed text-[#8b8375] xl:block">
                    {item.description}
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
