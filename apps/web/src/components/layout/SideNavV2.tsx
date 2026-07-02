import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Fish,
  Home,
  MessageSquare,
  Moon,
  Store,
  User,
  Users,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@lib/utils';
import { Tooltip } from '@components/ui/Tooltip';

interface SideNavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  activePaths?: string[];
}

const navItems: SideNavItem[] = [
  { path: '/', label: '首页', icon: Home },
  { path: '/characters', label: '调查员', icon: User },
  { path: '/rooms', label: '故事书', icon: BookOpen },
  { path: '/friends', label: '好友', icon: Users },
  { path: '/fishing', label: '黑水港', icon: Fish },
  { path: '/dream', label: '溺者之牌', icon: Moon },
  { path: '/shop', label: '无名集市', icon: Store, activePaths: ['/shop', '/inventory', '/market'] },
  { path: '/forums', label: '旧日低语', icon: MessageSquare },
];

interface SideNavV2Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function SideNavV2({ collapsed, onToggle }: SideNavV2Props) {
  const location = useLocation();
  const isActive = (item: SideNavItem) => {
    const paths = item.activePaths ?? [item.path];
    return paths.some((path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path)));
  };

  return (
    <aside
      className={cn(
        'fixed bottom-0 left-0 top-14 z-40 flex flex-col border-r border-[var(--coc-border-subtle)] bg-black/70 backdrop-blur-xl transition-all',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          const link = (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'coc-focus-ring nav-shell-item flex items-center transition',
                collapsed ? 'nav-shell-item--collapsed justify-center' : 'gap-3',
                active
                  ? cn('nav-plaque', collapsed && 'nav-plaque-lil')
                  : 'nav-item-v2'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span className="nav-shell-item__icon" aria-hidden="true">
                <Icon size={19} className="shrink-0" />
              </span>
              <span className={cn('nav-shell-item__label whitespace-nowrap transition', collapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100')}>
                {item.label}
              </span>
              {active && !collapsed && <span className="nav-shell-item__marker" aria-hidden="true" />}
            </Link>
          );

          return collapsed ? (
            <Tooltip key={item.path} content={item.label} position="right">
              {link}
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>
      <div className="border-t border-[var(--coc-border-subtle)] p-2">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'coc-focus-ring nav-collapse-trigger flex w-full items-center',
            collapsed ? 'justify-center' : 'gap-3'
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span className="text-sm">收起导航</span></>}
        </button>
      </div>
    </aside>
  );
}
