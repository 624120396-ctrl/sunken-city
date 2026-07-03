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
    <header className="fixed top-0 left-0 right-0 h-14 topnav-v2 z-50 flex items-center px-3 md:px-4 gap-2 md:gap-4">
      {/* Logo */}
      <Link to="/" className="topnav-brand shrink-0" aria-label="返回沉没之城首页">
        <img
          src="/images/logo-gold.png"
          alt="沉没之城"
          className="topnav-brand__logo hidden sm:block"
        />
        <span className="topnav-brand__mobile sm:hidden">
          沉没之城
        </span>
        <span className="topnav-brand__motto hidden md:block">
          一座城市，万种疯狂
        </span>
      </Link>

      {/* 搜索栏 */}
      <div className="hidden md:block flex-1 max-w-md mx-auto">
        <div
          className="coc-search-v2 cursor-text"
          role="button"
          tabIndex={0}
          aria-label="打开全局搜索"
          onClick={() => {
            // 聚焦到隐藏的input或触发CommandPalette
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
            document.dispatchEvent(event);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              const keyboardEvent = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
              document.dispatchEvent(keyboardEvent);
            }
          }}
        >
          <span className="coc-search-v2__sigil" aria-hidden="true">
            <Search size={15} />
          </span>
          <span className="coc-search-v2__placeholder">搜索房间、调查员、遗物...</span>
        </div>
      </div>

      {/* 右侧操作区 */}
      <div className="ml-auto flex items-center gap-3 shrink-0">
        {/* 通知铃铛 */}
        <NotificationBell />

        {/* 用户头像下拉 */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="topnav-user-trigger"
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
          >
            <div className={cn('topnav-avatar-shell', user?.isAdmin && 'topnav-avatar-shell--admin')}>
              <div
                className="topnav-avatar"
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
              className={cn('topnav-user-trigger__chevron', dropdownOpen && 'rotate-180')}
            />
          </button>

          {/* 下拉菜单 */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-[80] mt-2 w-56 user-dropdown-v2 py-2" role="menu">
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
                  className="user-dropdown-v2__item"
                >
                  <User size={16} className="user-dropdown-v2__icon" />
                  个人资料
                </button>

                {user?.isAdmin && (
                  <button
                    onClick={() => {
                      navigate('/admin');
                      setDropdownOpen(false);
                    }}
                    className="user-dropdown-v2__item user-dropdown-v2__item--admin"
                  >
                    <Shield size={16} className="user-dropdown-v2__icon" />
                    管理后台
                  </button>
                )}

                <div className="my-1 border-t border-[rgba(201,162,39,0.1)]" />

                <button
                  onClick={handleLogout}
                  className="user-dropdown-v2__item user-dropdown-v2__item--danger"
                >
                  <LogOut size={16} className="user-dropdown-v2__icon" />
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
