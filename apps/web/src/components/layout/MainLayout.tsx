import { useEffect } from 'react';
import { useLayoutStore } from '@stores/layout.store';
import { cn } from '@lib/utils';
import {
  BookOpen, User, Home, ShoppingBag,
  MessageSquare, Backpack, Store, Users, Fish, Moon,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip } from '../ui/Tooltip';
import { TopNav } from './TopNav';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const {
    sidebarCollapsed,
    sidebarMobileOpen,
    isMobile,
    toggleSidebar,
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

  // 移动端底部Tab（只显示5个主要入口）
  const mobileTabItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/characters', label: '调查员', icon: User },
    { path: '/rooms', label: '故事书', icon: BookOpen },
    { path: '/inventory', label: '背包', icon: Backpack },
    { path: '/profile', label: '我的', icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/profile') {
      return location.pathname === '/profile';
    }
    return (
      location.pathname === path ||
      (path !== '/' && location.pathname.startsWith(path))
    );
  };

  // ===== 移动端布局 =====
  if (isMobile) {
    return (
      <div className="relative min-h-[100dvh]">
        {/* TopNav */}
        <TopNav />

        {/* 移动端 Drawer 侧边栏 */}
        <aside
          className={cn(
            'fixed top-14 left-0 bottom-0 w-64 sidenav-v2 z-40 flex flex-col',
            'transition-transform duration-300 ease-in-out',
            sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={toggleMobileSidebar}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    active
                      ? 'nav-plaque nav-plaque-texture'
                      : 'nav-item-v2'
                  )}
                >
                  <Icon size={20} className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* 遮罩 */}
        {sidebarMobileOpen && (
          <div
            className="fixed inset-0 drawer-overlay-v2 z-30"
            onClick={toggleMobileSidebar}
          />
        )}

        {/* 主内容区 - 浅色背景 */}
        <main className="content-area pt-14 px-4 pb-20 min-h-[100dvh] overflow-auto relative z-0">
          {children}
        </main>

        {/* 移动端底部Tab栏 */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 mobile-tab-v2 z-50 flex items-center justify-around px-2">
          {mobileTabItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors',
                  active ? 'mobile-tab-item-active' : 'mobile-tab-item'
                )}
              >
                <Icon size={20} />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  // ===== PC / 平板布局 =====
  return (
    <div className="relative min-h-[100dvh]">
      {/* TopNav */}
      <TopNav />

      {/* 侧边栏 */}
      <aside
        className={cn(
          'fixed top-14 left-0 bottom-0 sidenav-v2 z-40 flex flex-col shrink-0',
          'transition-all duration-300 ease-in-out overflow-hidden',
          sidebarCollapsed ? 'w-14' : 'w-56'
        )}
      >
        {/* 导航 */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            const linkContent = (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center rounded-lg transition-all duration-200',
                  sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-2.5',
                  active
                    ? 'nav-plaque nav-plaque-texture'
                    : 'nav-item-v2'
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

        {/* 底部：收起按钮 */}
        <div className="p-2 border-t border-[rgba(201,162,39,0.08)]">
          <button
            onClick={toggleSidebar}
            className={cn(
              'w-full flex items-center rounded-lg transition-colors hover:bg-[rgba(201,162,39,0.06)]',
              sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-2.5'
            )}
            style={{ color: '#6b6558' }}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span className="text-sm">收起导航</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* 主内容区 - 浅色渐变背景 */}
      <main
        className={cn(
          'content-area fixed top-14 right-0 bottom-0 overflow-auto z-0',
          'transition-all duration-300',
          sidebarCollapsed ? 'left-14' : 'left-56'
        )}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
