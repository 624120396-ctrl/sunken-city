import { BookOpen, Home, MessageSquare, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@lib/utils';

const items = [
  { path: '/rooms', label: '房间', icon: BookOpen },
  { path: '/', label: '首页', icon: Home },
  { path: '/characters', label: '调查员', icon: User },
  { path: '/forums', label: '低语', icon: MessageSquare },
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
              'coc-focus-ring flex min-h-11 min-w-12 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px]',
              active ? 'text-[var(--coc-text-gold)]' : 'text-[var(--coc-text-muted)]'
            )}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
