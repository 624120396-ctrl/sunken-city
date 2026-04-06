import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X, Mail } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuthStore } from '@stores/auth.store';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  NotificationItem,
} from '../../services/notification.service';
import { getUnreadMessageCount } from '../../services/user-messages.service';
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
    case 'forum_reply':
      return '论坛回复';
    case 'forum_mention':
      return '论坛提及';
    case 'forum_like':
      return '论坛点赞';
    case 'forum_best_reply':
      return '最佳回复';
    case 'rank_up':
      return '位阶晋升';
    case 'title_unlock':
      return '获得印记';
    case 'shop_purchase':
      return '商城';
    case 'system_announcement':
      return '公告';
    case 'moderator_action':
      return '管理';
    case 'system':
    default:
      return '系统';
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications(20);
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // ignore
    }
  };

  const fetchUnreadMessages = async () => {
    try {
      const res = await getUnreadMessageCount();
      setUnreadMessageCount(res.unreadCount);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadMessages();
    const id = setInterval(() => {
      fetchNotifications();
      fetchUnreadMessages();
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Socket 监听全局通知
  useEffect(() => {
    if (!token) return;

    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io',
    });

    socket.on('connect', () => {
      console.log('Global socket connected');
    });

    socket.on('notification:new', () => {
      fetchNotifications();
    });

    socket.on('user_message:new', () => {
      fetchUnreadMessages();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', onClick);
      fetchNotifications();
      fetchUnreadMessages();
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

  const handleNavigate = (n: NotificationItem) => {
    if (n.link) {
      navigate(n.link);
    } else if (n.postId) {
      navigate(`/forums/${n.postId}`);
    } else {
      navigate('/messages');
    }
    if (!n.isRead) handleRead(n.id);
    setOpen(false);
  };

  const totalUnread = unreadCount + unreadMessageCount;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-coc-text-secondary hover:text-coc-parchment hover:bg-coc-bg-tertiary transition-colors"
        aria-label="通知"
      >
        <Bell size={20} />
        {totalUnread > 0 && (
          <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-1 rounded-full bg-coc-accent-red text-[10px] text-white font-bold flex items-center justify-center">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-coc-bg-tertiary border border-coc-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-coc-border">
            <span className="font-bold text-coc-parchment text-sm">通知</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleReadAll}
                  className="text-xs text-coc-text-muted hover:text-coc-parchment flex items-center gap-1"
                >
                  <Check size={12} />
                  全部已读
                </button>
              )}
              <Link
                to="/messages"
                onClick={() => setOpen(false)}
                className="text-xs text-coc-text-muted hover:text-coc-parchment flex items-center gap-1"
              >
                <Mail size={12} />
                {unreadMessageCount > 0 && (
                  <span className="ml-0.5 text-coc-accent-red">({unreadMessageCount})</span>
                )}
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="text-coc-text-muted hover:text-coc-parchment"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-coc-text-muted">
                暂无通知
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNavigate(n)}
                  className={`px-3 py-3 border-b border-coc-border last:border-0 cursor-pointer hover:bg-coc-bg-secondary transition-colors ${
                    n.isRead ? 'opacity-80' : 'bg-coc-bg-secondary/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-1.5 py-0.5 rounded border border-coc-border text-coc-text-muted">
                          {typeLabel(n.type)}
                        </span>
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-coc-accent-red" />
                        )}
                      </div>
                      <div className="mt-1 text-sm text-coc-parchment leading-snug">
                        {n.title}
                      </div>
                      {n.content && (
                        <div className="text-xs text-coc-text-muted truncate">
                          {n.content}
                        </div>
                      )}
                      <div className="mt-1 text-[10px] text-coc-text-muted">
                        {formatTimeAgo(n.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(n.id);
                      }}
                      className="text-coc-text-muted hover:text-red-400 p-1"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-3 py-2 border-t border-coc-border bg-coc-bg-secondary/30">
            <Link
              to="/messages"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-coc-text-muted hover:text-coc-parchment"
            >
              查看全部通知与私信 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
