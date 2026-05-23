import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@stores/auth.store';
import { cn } from '@lib/utils';
import { Search, User, LogOut, Shield, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationBell } from '../notifications/NotificationBell';

export function TopNav() {
  const { user, clearAuth } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setDropdownOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 topnav-v2 z-50 flex items-center px-4 gap-4">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 shrink-0">
        <span className="text-xl font-ritual font-bold tracking-wide" style={{ color: '#c9a227' }}>
          沉没之城
        </span>
        <span className="hidden sm:block text-[10px]" style={{ color: '#6b6558' }}>
          一座城市，万种疯狂
        </span>
      </Link>

      {/* 搜索栏 */}
      <div className="flex-1 max-w-md mx-auto">
        <div
          className="coc-search-v2 cursor-text"
          onClick={() => {
            // 聚焦到隐藏的input或触发CommandPalette
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
            document.dispatchEvent(event);
          }}
        >
          <Search size={16} style={{ color: '#6b6558' }} />
          <span className="text-sm">搜索房间、调查员、遗物...</span>
        </div>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 通知铃铛 */}
        <NotificationBell />

        {/* 用户头像下拉 */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-full transition-colors hover:bg-[rgba(201,162,39,0.08)]"
          >
            <div className="relative w-8 h-8 shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold overflow-hidden"
                style={{ background: 'rgba(139,38,53,0.2)', color: '#a63848' }}
              >
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
            <ChevronDown
              size={14}
              className={cn(
                'transition-transform',
                dropdownOpen && 'rotate-180'
              )}
              style={{ color: '#8b8375' }}
            />
          </button>

          {/* 下拉菜单 */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 user-dropdown-v2 py-2 z-60">
              {/* 用户信息头部 */}
              <div className="px-4 py-3 border-b border-[rgba(201,162,39,0.1)]">
                <p className="font-medium truncate" style={{ color: '#d4c5a8' }}>
                  {user?.nickname}
                </p>
                <p className="text-xs truncate" style={{ color: '#6b6558' }}>
                  {user?.displayedTitleName || user?.rankName || '海岸漫步者'}
                </p>
              </div>

              {/* 菜单项 */}
              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-[rgba(201,162,39,0.08)]"
                  style={{ color: '#a69b85' }}
                >
                  <User size={16} />
                  个人资料
                </button>

                {user?.isAdmin && (
                  <button
                    onClick={() => {
                      navigate('/admin');
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-[rgba(201,162,39,0.08)]"
                    style={{ color: '#c9a227' }}
                  >
                    <Shield size={16} />
                    管理后台
                  </button>
                )}

                <div className="my-1 border-t border-[rgba(201,162,39,0.1)]" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-[rgba(139,38,53,0.1)]"
                  style={{ color: '#a63848' }}
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
