import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  NotificationItem,
} from '../../services/notification.service';
import { formatTimeAgo } from '../../lib/utils';

function typeLabel(type: NotificationItem['type']) {
  switch (type) {
    case 'mention':
      return '提到你';
    case 'reply':
      return '回复';
    case 'like':
      return '点赞';
    case 'best_reply':
      return '最佳回复';
    case 'friend_request':
      return '好友请求';
    case 'friend_accept':
      return '好友通过';
    case 'room_invite':
      return '房间邀请';
    default:
      return '系统';
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [detailNotification, setDetailNotification] = useState<NotificationItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications(20);
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', onClick);
      fetchNotifications();
    }
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    fetchNotifications();
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    fetchNotifications();
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    fetchNotifications();
  };

  const hasLink = (n: NotificationItem) => {
    return n.type === 'friend_request' || n.type === 'friend_accept' || n.type === 'room_invite' || !!n.postId;
  };

  const goLink = (n: NotificationItem) => {
    if (!n.isRead) handleRead(n.id);
    if (n.type === 'friend_request' || n.type === 'friend_accept') {
      navigate('/friends');
    } else if (n.type === 'room_invite') {
      navigate('/rooms');
    } else if (n.postId) {
      navigate(`/forums/${n.postId}`);
    }
    setOpen(false);
    setDetailNotification(null);
  };

  const openDetail = (n: NotificationItem) => {
    if (!n.isRead) handleRead(n.id);
    setDetailNotification(n);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-coc-text-secondary hover:text-coc-parchment hover:bg-coc-bg-tertiary transition-colors"
        aria-label="通知"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-1 rounded-full bg-coc-accent-red text-[10px] text-white font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown-v2 absolute right-0 z-[80] mt-2 w-[min(24rem,calc(100vw-1rem))] overflow-hidden">
          <div className="notification-dropdown-v2__header">
            <span className="font-bold text-[var(--coc-on-surface-primary)]">通知</span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleReadAll}
                  className="notification-dropdown-v2__utility"
                >
                  <Check size={12} />
                  全部已读
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="notification-dropdown-v2__close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--coc-on-surface-muted)]">
                暂无通知
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-dropdown-v2__item ${n.isRead ? 'notification-dropdown-v2__item--read' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDetail(n)}>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="notification-dropdown-v2__type">
                          {typeLabel(n.type)}
                        </span>
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-coc-accent-red" />
                        )}
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-snug text-[var(--coc-on-surface-primary)]">
                        {n.title}
                      </div>
                      {n.content && (
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--coc-on-surface-secondary)]">
                          {n.content}
                        </div>
                      )}
                      <div className="mt-1 text-[10px] text-[var(--coc-on-surface-muted)]">
                        {formatTimeAgo(n.createdAt)}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {hasLink(n) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            goLink(n);
                          }}
                          className="notification-dropdown-v2__icon-button"
                          title="前往"
                        >
                          <ExternalLink size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(n.id);
                        }}
                        className="notification-dropdown-v2__icon-button notification-dropdown-v2__icon-button--danger"
                        title="删除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailNotification && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setDetailNotification(null)}
        >
          <div
            className="w-full max-w-xl max-h-[80vh] bg-coc-bg-tertiary border border-coc-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-coc-border shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded border border-coc-border text-xs text-coc-text-muted">
                  {typeLabel(detailNotification.type)}
                </span>
                {hasLink(detailNotification) && (
                  <button
                    onClick={() => goLink(detailNotification)}
                    className="text-xs text-coc-accent-red hover:underline flex items-center gap-1"
                  >
                    前往 <ExternalLink size={10} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setDetailNotification(null)}
                className="text-coc-text-muted hover:text-coc-parchment"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 overflow-y-auto">
              <h3 className="text-lg font-bold text-coc-parchment leading-relaxed">
                {detailNotification.title}
              </h3>
              <div className="mt-1 text-xs text-coc-text-muted">
                {formatTimeAgo(detailNotification.createdAt)}
              </div>
              {detailNotification.content ? (
                <div className="mt-5 text-sm text-coc-text-secondary leading-7 whitespace-pre-wrap">
                  {detailNotification.content}
                </div>
              ) : (
                <div className="mt-5 text-sm text-coc-text-muted">无详细内容</div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-coc-border shrink-0 flex justify-end gap-3">
              <button
                onClick={() => handleDelete(detailNotification.id)}
                className="px-4 py-2 rounded text-sm text-coc-text-muted hover:text-red-400 hover:bg-coc-bg-secondary transition-colors"
              >
                删除
              </button>
              <button
                onClick={() => setDetailNotification(null)}
                className="px-4 py-2 rounded text-sm bg-coc-accent-red text-white hover:bg-coc-blood.glow transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
