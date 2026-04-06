import { useAuthStore } from '@stores/auth.store';
import { cn } from '@lib/utils';
import { BookOpen, User, Home, LogOut, Shield, ShoppingBag, MessageSquare, Backpack, Store } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { NotificationBell } from '../notifications/NotificationBell';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/characters', label: '调查员', icon: User },
    { path: '/rooms', label: '故事书', icon: BookOpen },
    { path: '/shop', label: '拉莱耶遗珍', icon: ShoppingBag },
    { path: '/inventory', label: '背包', icon: Backpack },
    { path: '/market', label: '市场', icon: Store },
    { path: '/forums', label: '旧日低语', icon: MessageSquare },
  ];

  const handleLogout = () => {
    clearAuth();
  };

  return (
    <div className="flex h-screen bg-coc-bg-primary">
      {/* 侧边栏 */}
      <aside className="w-64 bg-coc-bg-secondary border-r border-coc-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-coc-border flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xl font-ritual font-bold text-coc-accent-gold tracking-wide">
              沉没之城
            </span>
            <span className="text-xs text-coc-text-muted font-body tracking-wider mt-0.5">
              一座城市，万种疯狂。
            </span>
          </div>
          <NotificationBell />
        </div>

        {/* 导航 */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive 
                    ? 'bg-coc-accent-red/20 text-coc-accent-red' 
                    : 'text-coc-text-secondary hover:bg-coc-bg-tertiary hover:text-coc-text-primary'
                )}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 用户信息 */}
        <div className="p-4 border-t border-coc-border">
          <Link to="/profile" className="flex items-center gap-3 mb-3 hover:opacity-80 transition-opacity">
            <div className="relative w-10 h-10 shrink-0">
              <div className="w-10 h-10 rounded-full bg-coc-accent-red/20 flex items-center justify-center text-coc-accent-red font-bold overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.nickname?.[0]?.toUpperCase() || '?'
                )}
              </div>
              {user?.frameUrl && (
                <img
                  src={user.frameUrl}
                  alt="frame"
                  className="absolute inset-0 w-full h-full pointer-events-none rounded-full"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.nickname}</p>
              <p className="text-sm text-coc-text-muted truncate">
                {user?.displayedTitleName || user?.rankName || '海岸漫步者'}
              </p>
            </div>
            {user?.isAdmin && (
              <Link
                to="/admin"
                className="p-2 text-coc-accent-gold hover:bg-coc-accent-gold/10 rounded transition-colors"
                title="管理后台"
                onClick={(e) => e.stopPropagation()}
              >
                <Shield size={18} />
              </Link>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-coc-text-secondary hover:text-coc-accent-red transition-colors"
          >
            <LogOut size={16} />
            退出
          </button>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}