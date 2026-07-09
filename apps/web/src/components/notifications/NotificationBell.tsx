import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  Trash2,
  X,
  ExternalLink,
  Archive,
  CalendarClock,
  UserPlus,
  Megaphone,
  Mail,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  NotificationItem,
} from '../../services/notification.service';
import {
  getNotificationLayer,
  getNotificationLayerDescription,
  getNotificationLayerLabel,
  getNotificationTargetPath,
  getNotificationTypeLabel,
  NotificationLayer,
} from '../../services/notification-meta';
import { cn, formatTimeAgo } from '../../lib/utils';

const layerOptions: Array<{
  value: NotificationLayer;
  icon: typeof Archive;
}> = [
  { value: 'all', icon: Archive },
  { value: 'coordination', icon: CalendarClock },
  { value: 'social', icon: UserPlus },
  { value: 'system', icon: Megaphone },
];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notificationLayer, setNotificationLayer] = useState<NotificationLayer>('all');
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
    return Boolean(getNotificationTargetPath(n));
  };

  const goLink = (n: NotificationItem) => {
    if (!n.isRead) handleRead(n.id);
    const target = getNotificationTargetPath(n);
    if (target) navigate(target);
    setOpen(false);
    setDetailNotification(null);
  };

  const openDetail = (n: NotificationItem) => {
    if (!n.isRead) handleRead(n.id);
    setDetailNotification(n);
  };

  const filteredNotifications =
    notificationLayer === 'all'
      ? notifications
      : notifications.filter((n) => getNotificationLayer(n.type) === notificationLayer);
  const layerCounts: Record<NotificationLayer, number> = {
    all: notifications.length,
    coordination: notifications.filter((n) => getNotificationLayer(n.type) === 'coordination').length,
    social: notifications.filter((n) => getNotificationLayer(n.type) === 'social').length,
    system: notifications.filter((n) => getNotificationLayer(n.type) === 'system').length,
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
        <div className="notification-dropdown-v2 absolute right-0 z-[80] mt-2 w-[min(28rem,calc(100vw-1rem))] overflow-hidden">
          <div className="notification-dropdown-v2__header">
            <div className="min-w-0">
              <span className="font-bold text-[var(--coc-on-surface-primary)]">通知台</span>
              <div className="mt-0.5 text-[10px] text-[var(--coc-on-surface-muted)]">
                调度 / 社交 / 系统
              </div>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleReadAll}
                  className="notification-dropdown-v2__utility"
                >
                  <Check size={12} />
                  全部已读
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  navigate('/messages');
                  setOpen(false);
                }}
                className="notification-dropdown-v2__utility"
              >
                <Mail size={12} />
                消息中心
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="notification-dropdown-v2__close"
                aria-label="关闭通知"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-[var(--coc-border-subtle)] bg-black/15 p-3 sm:grid-cols-4">
            {layerOptions.map((item) => {
              const Icon = item.icon;
              const selected = notificationLayer === item.value;

              return (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => setNotificationLayer(item.value)}
                  className={cn(
                    'coc-focus-ring rounded-md border px-2 py-2 text-left transition',
                    selected
                      ? 'border-[var(--coc-accent-gold)] bg-[var(--coc-accent-gold)]/15'
                      : 'border-transparent hover:border-[var(--coc-border-subtle)] hover:bg-white/[0.05]'
                  )}
                  title={getNotificationLayerDescription(item.value)}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--coc-on-surface-primary)]">
                      <Icon
                        size={13}
                        className={selected ? 'text-[var(--coc-accent-gold)]' : 'text-[var(--coc-on-surface-muted)]'}
                      />
                      {getNotificationLayerLabel(item.value)}
                    </span>
                    <span className="text-[10px] text-[var(--coc-on-surface-muted)]">{layerCounts[item.value]}</span>
                  </span>
                  <span className="mt-1 block truncate text-[10px] text-[var(--coc-on-surface-muted)]">
                    {getNotificationLayerDescription(item.value)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--coc-on-surface-muted)]">
                暂无通知。新的排期、申请、邀请和公告会在这里出现。
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--coc-on-surface-muted)]">
                当前分层暂无通知。
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-dropdown-v2__item ${n.isRead ? 'notification-dropdown-v2__item--read' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDetail(n)}>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="notification-dropdown-v2__type">
                          {getNotificationTypeLabel(n.type)}
                        </span>
                        <span className="rounded border border-[var(--coc-border-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--coc-on-surface-muted)]">
                          {getNotificationLayerLabel(getNotificationLayer(n.type))}
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
                          type="button"
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
                        type="button"
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
                  {getNotificationTypeLabel(detailNotification.type)}
                </span>
                {hasLink(detailNotification) && (
                  <button
                    type="button"
                    onClick={() => goLink(detailNotification)}
                    className="text-xs text-[var(--coc-accent-gold)] hover:underline flex items-center gap-1"
                  >
                    前往 <ExternalLink size={10} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailNotification(null)}
                className="text-coc-text-muted hover:text-coc-parchment"
                aria-label="关闭通知详情"
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
                type="button"
                onClick={() => handleDelete(detailNotification.id)}
                className="px-4 py-2 rounded text-sm text-coc-text-muted hover:text-red-400 hover:bg-coc-bg-secondary transition-colors"
              >
                删除
              </button>
              <button
                type="button"
                onClick={() => setDetailNotification(null)}
                className="px-4 py-2 rounded text-sm bg-[var(--coc-accent-gold)] text-[var(--coc-text-inverse)] hover:bg-[var(--coc-accent-gold-strong)] transition-colors"
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
