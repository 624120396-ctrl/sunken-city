import { useEffect } from 'react';
import { useAuthStore } from '@stores/auth.store';
import { useLayoutStore } from '@stores/layout.store';
import { cn } from '@lib/utils';
import {
  BookOpen, User, Home, LogOut, Shield, ShoppingBag,
  MessageSquare, Backpack, Store, Users, Fish, Moon,
  ChevronLeft, ChevronRight, Menu, X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { NotificationBell } from '../notifications/NotificationBell';
import { Tooltip } from '../ui/Tooltip';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const {
    sidebarCollapsed,
    sidebarMobileOpen,
    isMobile,
    toggleSidebar,
    setSidebarCollapsed,
    toggleMobileSidebar,
    setMobile,
  } = useLayoutStore();

  // 检测移动端
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [setMobile]);

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/characters', label: '调查员', icon: User },
    { path: '/rooms', label: '故事书', icon: BookOpen },
    { path: '/friends', label: '好友', icon: Users },
    { path: '/fishing', label: '黑水港', icon: Fish },
    { path: '/dream', label: '溺者之牌', icon: Moon },
    { path: '/shop', label: '拉莱耶遗珍', icon: ShoppingBag },
    { path: '/inventory', label: '背包', icon: Backpack },
    { path: '/market', label: '市场', icon: Store },
    { path: '/forums', label: '旧日低语', icon: MessageSquare },
  ];

  const handleLogout = () => {
    clearAuth();
  };

  // 移动端：侧边栏作为 Drawer
  if (isMobile) {
    return (
      <div className="flex min-h-[100dvh] relative">
        {/* 移动端顶部栏 */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-coc-bg-secondary/85 border-b border-coc-border z-40 flex items-center px-4 gap-3">
          <button
            onClick={toggleMobileSidebar}
            className="p-2 -ml-2 text-coc-text-secondary hover:text-coc-text-primary transition-colors"
          >
            {sidebarMobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="text-lg font-ritual font-bold text-coc-accent-gold tracking-wide">
            沉没之城
          </span>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>

        {/* 移动端 Drawer 侧边栏 */}
        <aside
          className={cn(
            'fixed top-14 left-0 bottom-0 w-64 bg-coc-bg-secondary/85 border-r border-coc-border z-30 flex flex-col',
            'transition-transform duration-300 ease-in-out',
            sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarCollapsed(false)}
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
                  <img src={user.frameUrl} alt="frame" className="absolute inset-0 w-full h-full pointer-events-none rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.nickname}</p>
                <p className="text-sm text-coc-text-muted truncate">
                  {user?.displayedTitleName || user?.rankName || '海岸漫步者'}
                </p>
              </div>
              {user?.isAdmin && (
                <Link to="/admin" className="p-2 text-coc-accent-gold hover:bg-coc-accent-gold/10 rounded transition-colors" onClick={(e) => e.stopPropagation()}>
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

        {/* 遮罩 */}
        {sidebarMobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20"
            onClick={() => setSidebarCollapsed(false)}
          />
        )}

        {/* 主内容 */}
        <main className="flex-1 overflow-auto pt-14 p-4 relative bg-coc-bg-primary/60">
          {children}
        </main>
      </div>
    );
  }

  // PC 端
  return (
    <div className="flex min-h-[100dvh] relative">
      {/* 侧边栏 */}
      <aside
        className={cn(
          'bg-coc-bg-secondary/85 border-r border-coc-border flex flex-col shrink-0',
          'transition-all duration-300 ease-in-out overflow-hidden',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="h-[72px] border-b border-coc-border flex items-center px-3">
          {/* 切换按钮 */}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded text-coc-text-muted hover:text-coc-text-primary hover:bg-coc-bg-tertiary transition-colors shrink-0"
            title={sidebarCollapsed ? '展开' : '收起'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Logo 文字 */}
          <div
            className={cn(
              'ml-2 flex flex-col transition-all duration-300 overflow-hidden whitespace-nowrap',
              sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
            )}
          >
            <span className="text-xl font-ritual font-bold text-coc-accent-gold tracking-wide">
              沉没之城
            </span>
            <span className="text-[10px] text-coc-text-muted font-body tracking-wider">
              一座城市，万种疯狂。
            </span>
          </div>

          {/* 收起时通知铃铛 */}
          {sidebarCollapsed && (
            <div className="ml-auto">
              <NotificationBell />
            </div>
          )}

          {/* 展开时通知铃铛 */}
          {!sidebarCollapsed && (
            <div className="ml-auto">
              <NotificationBell />
            </div>
          )}
        </div>

        {/* 导航 */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            const linkContent = (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center rounded-lg transition-colors',
                  sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3',
                  isActive
                    ? 'bg-coc-accent-red/20 text-coc-accent-red'
                    : 'text-coc-text-secondary hover:bg-coc-bg-tertiary hover:text-coc-text-primary'
                )}
              >
                <Icon size={20} className="shrink-0" />
                <span
                  className={cn(
                    'transition-all duration-300 whitespace-nowrap',
                    sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );

            return sidebarCollapsed ? (
              <Tooltip key={item.path} content={item.label} position="right">
                {linkContent}
              </Tooltip>
            ) : (
              linkContent
            );
          })}
        </nav>

        {/* 用户信息 */}
        <div className={cn('border-t border-coc-border', sidebarCollapsed ? 'p-2' : 'p-4')}>
          <Link
            to="/profile"
            className={cn(
              'flex items-center hover:opacity-80 transition-opacity',
              sidebarCollapsed ? 'justify-center mb-2' : 'gap-3 mb-3'
            )}
          >
            <div className="relative w-10 h-10 shrink-0">
              <div className="w-10 h-10 rounded-full bg-coc-accent-red/20 flex items-center justify-center text-coc-accent-red font-bold overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.nickname?.[0]?.toUpperCase() || '?'
                )}
              </div>
              {user?.frameUrl && (
                <img src={user.frameUrl} alt="frame" className="absolute inset-0 w-full h-full pointer-events-none rounded-full" />
              )}
            </div>

            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.nickname}</p>
                <p className="text-sm text-coc-text-muted truncate">
                  {user?.displayedTitleName || user?.rankName || '海岸漫步者'}
                </p>
              </div>
            )}

            {!sidebarCollapsed && user?.isAdmin && (
              <Link to="/admin" className="p-2 text-coc-accent-gold hover:bg-coc-accent-gold/10 rounded transition-colors" onClick={(e) => e.stopPropagation()}>
                <Shield size={18} />
              </Link>
            )}
          </Link>

          {sidebarCollapsed ? (
            <Tooltip content="退出登录" position="right">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center py-2 text-coc-text-secondary hover:text-coc-accent-red transition-colors"
              >
                <LogOut size={18} />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-coc-text-secondary hover:text-coc-accent-red transition-colors"
            >
              <LogOut size={16} />
              <span>退出</span>
            </button>
          )}
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 overflow-auto p-6 relative bg-coc-bg-primary/60">
        {children}
      </main>
    </div>
  );
}
