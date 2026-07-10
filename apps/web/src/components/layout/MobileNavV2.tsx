import { BookOpen, ClipboardList, HelpCircle, Home, MessageSquare, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@lib/utils';

const items = [
  { path: '/rooms', label: '房间', icon: BookOpen },
  { path: '/recruitments', label: '招募', icon: ClipboardList },
  { path: '/', label: '首页', icon: Home },
  { path: '/characters', label: '调查员', icon: User },
  { path: '/forums', label: '低语', icon: MessageSquare },
  { path: '/help', label: '帮助', icon: HelpCircle },
  { path: '/profile', label: '我的', icon: User },
];

export function MobileNavV2() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(3.75rem+env(safe-area-inset-bottom))] items-center justify-around border-t border-[var(--coc-border-subtle)] bg-black/78 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'coc-focus-ring mobile-tab-entry flex min-h-11 min-w-12 flex-col items-center justify-center gap-1 px-2 text-[11px]',
              active ? 'mobile-tab-item-active' : 'mobile-tab-item'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mobile-tab-entry__icon" aria-hidden="true">
              <Icon size={20} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
