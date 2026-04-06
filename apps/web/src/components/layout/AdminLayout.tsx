import { useAuthStore } from '@stores/auth.store';
import { cn } from '@lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  BookOpen, 
  Settings, 
  ArrowLeft,
  Shield,
  Crown,
  Megaphone,
  ShoppingBag,
  Landmark,
  Gem,
} from 'lucide-react';
import { Link, useLocation, Navigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAuthStore();
  const location = useLocation();

  // 非管理员重定向到首页
  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { path: '/admin', label: '仪表盘', icon: LayoutDashboard },
    { path: '/admin/users', label: '用户管理', icon: Users },
    { path: '/admin/characters', label: '角色卡管理', icon: UserCircle },
    { path: '/admin/rooms', label: '房间管理', icon: BookOpen },
    { path: '/admin/rank-title', label: '位阶与印记', icon: Crown },
    { path: '/admin/board-moderators', label: '版主管理', icon: Landmark },
    { path: '/admin/announcements', label: '公告管理', icon: Megaphone },
    { path: '/admin/shop', label: '商店管理', icon: ShoppingBag },
    { path: '/admin/relic-market', label: '遗物与市场', icon: Gem },
    { path: '/admin/settings', label: '系统设置', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-coc-bg-primary">
      {/* 侧边栏 */}
      <aside className="w-64 bg-coc-bg-secondary border-r border-coc-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-coc-border">
          <div className="flex items-center gap-2">
            <Shield className="text-coc-accent-red" size={24} />
            <div>
              <h1 className="text-xl font-serif font-bold text-coc-accent-gold">
                沉没之城
              </h1>
              <p className="text-xs text-coc-text-muted">管理后台 v1.3</p>
            </div>
          </div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            
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

        {/* 返回前台 */}
        <div className="p-4 border-t border-coc-border">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-coc-text-secondary hover:text-coc-accent-red transition-colors"
          >
            <ArrowLeft size={16} />
            返回前台
          </Link>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
