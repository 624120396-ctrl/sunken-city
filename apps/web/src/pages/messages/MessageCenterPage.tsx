import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  MessageSquare,
  Trash2,
  Check,
  Send,
  ChevronLeft,
  Loader2,
  User,
  Archive,
  CalendarClock,
  UserPlus,
  Megaphone,
  ExternalLink,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@stores/auth.store';
import { PageShell, Surface } from '@components/system';
import { formatTimeAgo, cn } from '@lib/utils';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  NotificationItem,
} from '@services/notification.service';
import {
  getNotificationLayer,
  getNotificationLayerDescription,
  getNotificationLayerLabel,
  getNotificationTargetPath,
  getNotificationTypeLabel,
  NotificationLayer,
} from '@services/notification-meta';
import {
  getConversations,
  getMessagesWithUser,
  sendMessageToUser,
  markMessageAsRead,
} from '@services/user-messages.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton, SkeletonCard } from '@components/ui/Skeleton';

type Tab = 'notifications' | 'messages';

export function MessageCenterPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('notifications');
  const [notificationLayer, setNotificationLayer] = useState<NotificationLayer>('all');
  const navigate = useNavigate();
  const { token, user } = useAuthStore();

  // ===== 通知 =====
  const {
    data: notificationsData,
    isLoading: notifLoading,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(50),
    staleTime: 30 * 1000,
  });
  const notifications = notificationsData?.notifications || [];

  // ===== 私信会话 =====
  const {
    data: convData,
    isLoading: msgLoading,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    staleTime: 30 * 1000,
  });
  const conversations = convData?.conversations || [];

  // ===== 选中会话消息 =====
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: messagesData,
    isLoading: messagesLoading,
  } = useQuery({
    queryKey: ['messages', selectedPartnerId],
    queryFn: () =>
      selectedPartnerId ? getMessagesWithUser(selectedPartnerId, 100) : Promise.resolve({ messages: [] }),
    enabled: !!selectedPartnerId,
    staleTime: 15 * 1000,
  });
  const messages = messagesData?.messages || [];

  // ===== Socket =====
  useEffect(() => {
    if (!token) return;
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io',
    });

    socket.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('user_message:new', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (selectedPartnerId) {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedPartnerId] });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, selectedPartnerId, queryClient]);

  // ===== 标记已读（自动） =====
  useEffect(() => {
    if (!selectedPartnerId || !messages.length) return;
    const unread = messages.filter((m) => m.receiverId === user?.id && !m.isRead);
    if (unread.length > 0) {
      Promise.all(unread.map((m) => markMessageAsRead(m.id))).then(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      });
    }
  }, [messages, selectedPartnerId, user?.id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ===== Mutations =====
  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const sendMutation = useMutation({
    mutationFn: ({ partnerId, content }: { partnerId: string; content: string }) =>
      sendMessageToUser(partnerId, content),
    onSuccess: (_, vars) => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['messages', vars.partnerId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // ===== 操作 =====
  const handleNotifNavigate = (n: NotificationItem) => {
    const target = getNotificationTargetPath(n);
    if (target) navigate(target);
    if (!n.isRead) readMutation.mutate(n.id);
  };

  const handleSendMessage = () => {
    if (!selectedPartnerId || !messageInput.trim()) return;
    sendMutation.mutate({ partnerId: selectedPartnerId, content: messageInput.trim() });
  };

  const selectedPartner = conversations.find((c) => c.partnerId === selectedPartnerId);
  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;
  const unreadMessageCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
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
  const layerOptions: Array<{
    value: NotificationLayer;
    label: string;
    description: string;
    icon: typeof Archive;
  }> = [
    {
      value: 'all',
      label: getNotificationLayerLabel('all'),
      description: getNotificationLayerDescription('all'),
      icon: Archive,
    },
    {
      value: 'coordination',
      label: getNotificationLayerLabel('coordination'),
      description: getNotificationLayerDescription('coordination'),
      icon: CalendarClock,
    },
    {
      value: 'social',
      label: getNotificationLayerLabel('social'),
      description: getNotificationLayerDescription('social'),
      icon: UserPlus,
    },
    {
      value: 'system',
      label: getNotificationLayerLabel('system'),
      description: getNotificationLayerDescription('system'),
      icon: Megaphone,
    },
  ];

  return (
    <PageShell
      className="message-center-page"
      eyebrow="调查员通信台"
      title="消息中心"
      description="把排期、申请、邀请、公告和私信拆成可读层级，重要信息不再沉进一条长列表。"
      actions={
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--coc-text-secondary)]">
          <span className="rounded-full border border-[var(--coc-border-subtle)] bg-black/20 px-3 py-1">
            未读通知 {unreadNotificationCount}
          </span>
          <span className="rounded-full border border-[var(--coc-border-subtle)] bg-black/20 px-3 py-1">
            未读私信 {unreadMessageCount}
          </span>
        </div>
      }
    >
      <Surface
        variant="panel"
        material="archive"
        padding="none"
        className="overflow-hidden"
      >
        <div className="grid min-h-[min(72vh,44rem)] lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="border-b border-[var(--coc-border-subtle)] bg-black/20 p-4 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3 border-b border-[var(--coc-border-subtle)] pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--coc-border-subtle)] bg-black/25 text-[var(--coc-accent-gold)]">
                <Archive size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--coc-text-primary)]">通信档案</div>
                <div className="text-xs text-[var(--coc-text-muted)]">按行动价值分拣</div>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('notifications');
                  setSelectedPartnerId(null);
                }}
                className={cn(
                  'coc-focus-ring flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition',
                  activeTab === 'notifications'
                    ? 'bg-[var(--coc-accent-gold)] text-[var(--coc-text-inverse)]'
                    : 'text-[var(--coc-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--coc-text-primary)]'
                )}
              >
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <Bell size={16} />
                  通知
                </span>
                {unreadNotificationCount > 0 && <span className="text-xs">{unreadNotificationCount}</span>}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('messages')}
                className={cn(
                  'coc-focus-ring flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition',
                  activeTab === 'messages'
                    ? 'bg-[var(--coc-accent-gold)] text-[var(--coc-text-inverse)]'
                    : 'text-[var(--coc-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--coc-text-primary)]'
                )}
              >
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <MessageSquare size={16} />
                  私信
                </span>
                {unreadMessageCount > 0 && <span className="text-xs">{unreadMessageCount}</span>}
              </button>
            </div>

            {activeTab === 'notifications' && (
              <div className="mt-5 grid gap-2">
                <div className="px-1 text-xs font-semibold text-[var(--coc-accent-gold-strong)]">通知分层</div>
                {layerOptions.map((item) => {
                  const Icon = item.icon;
                  const selected = notificationLayer === item.value;

                  return (
                    <button
                      type="button"
                      key={item.value}
                      onClick={() => setNotificationLayer(item.value)}
                      className={cn(
                        'coc-focus-ring flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition',
                        selected
                          ? 'border-[var(--coc-accent-gold)] bg-[var(--coc-accent-gold)]/15'
                          : 'border-transparent hover:border-[var(--coc-border-subtle)] hover:bg-white/[0.05]'
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn(
                          'mt-0.5 shrink-0',
                          selected ? 'text-[var(--coc-accent-gold)]' : 'text-[var(--coc-text-muted)]'
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2 text-sm font-medium text-[var(--coc-text-primary)]">
                          {item.label}
                          <span className="text-xs text-[var(--coc-text-muted)]">{layerCounts[item.value]}</span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--coc-text-muted)]">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="flex min-h-0 flex-col">
            {activeTab === 'notifications' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--coc-border-subtle)] bg-black/15 px-4 py-4">
                  <div>
                    <div className="text-base font-semibold text-[var(--coc-text-primary)]">
                      {layerOptions.find((item) => item.value === notificationLayer)?.label}通知
                    </div>
                    <div className="mt-1 text-xs text-[var(--coc-text-muted)]">
                      {layerOptions.find((item) => item.value === notificationLayer)?.description}
                    </div>
                  </div>
                  {unreadNotificationCount > 0 && (
                    <button
                      type="button"
                      onClick={() => readAllMutation.mutate()}
                      disabled={readAllMutation.isPending}
                      className="coc-focus-ring inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs text-[var(--coc-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--coc-text-primary)] disabled:opacity-50"
                    >
                      <Check size={13} />
                      全部已读
                    </button>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {notifLoading && notifications.length === 0 ? (
                    <div className="grid gap-3 p-5">
                      <SkeletonCard className="h-20" />
                      <SkeletonCard className="h-20" />
                      <SkeletonCard className="h-20" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-6 py-16 text-center text-sm text-[var(--coc-text-muted)]">
                      暂无通知。新的排期、申请、邀请和公告会在这里归档。
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="px-6 py-16 text-center text-sm text-[var(--coc-text-muted)]">
                      当前分层暂无通知。
                    </div>
                  ) : (
                    filteredNotifications.map((n) => {
                      const target = getNotificationTargetPath(n);

                      return (
                        <article
                          key={n.id}
                          className={cn(
                            'group border-b border-[var(--coc-border-subtle)] px-4 py-4 transition last:border-0 hover:bg-white/[0.04]',
                            !n.isRead && 'bg-[var(--coc-accent-gold)]/[0.07]'
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => handleNotifNavigate(n)}
                            >
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded border border-[var(--coc-border-subtle)] bg-black/20 px-2 py-0.5 text-[var(--coc-text-muted)]">
                                  {getNotificationTypeLabel(n.type)}
                                </span>
                                <span className="text-[var(--coc-text-muted)]">{formatTimeAgo(n.createdAt)}</span>
                                {!n.isRead && (
                                  <span className="rounded-full bg-[var(--coc-accent-blood)] px-2 py-0.5 text-[10px] font-semibold text-white">
                                    未读
                                  </span>
                                )}
                                {target && <ExternalLink size={12} className="text-[var(--coc-text-muted)]" />}
                              </div>
                              <div className="mt-2 text-sm font-semibold leading-6 text-[var(--coc-text-primary)]">
                                {n.title}
                              </div>
                              {n.content && (
                                <div className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--coc-text-secondary)]">
                                  {n.content}
                                </div>
                              )}
                            </button>

                            <div className="flex shrink-0 items-center gap-1">
                              {!n.isRead && (
                                <button
                                  type="button"
                                  onClick={() => readMutation.mutate(n.id)}
                                  disabled={readMutation.isPending}
                                  className="coc-focus-ring rounded-md p-2 text-[var(--coc-text-muted)] hover:bg-white/[0.06] hover:text-[var(--coc-text-primary)] disabled:opacity-50"
                                  title="标记已读"
                                  aria-label="标记已读"
                                >
                                  <Check size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteMutation.mutate(n.id)}
                                disabled={deleteMutation.isPending}
                                className="coc-focus-ring rounded-md p-2 text-[var(--coc-text-muted)] hover:bg-[var(--coc-accent-blood-surface)] hover:text-[var(--coc-accent-blood-strong)] disabled:opacity-50"
                                title="删除"
                                aria-label="删除通知"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {activeTab === 'messages' && !selectedPartnerId && (
              <>
                <div className="border-b border-[var(--coc-border-subtle)] bg-black/15 px-4 py-4">
                  <div className="text-base font-semibold text-[var(--coc-text-primary)]">私信会话</div>
                  <div className="mt-1 text-xs text-[var(--coc-text-muted)]">调查员之间的直接联络。</div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {msgLoading && conversations.length === 0 ? (
                    <div className="grid gap-3 p-5">
                      <SkeletonCard className="h-20" />
                      <SkeletonCard className="h-20" />
                      <SkeletonCard className="h-20" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="px-6 py-16 text-center text-sm text-[var(--coc-text-muted)]">
                      暂无私信会话。
                    </div>
                  ) : (
                    conversations.map((c) => (
                      <button
                        type="button"
                        key={c.partnerId}
                        onClick={() => setSelectedPartnerId(c.partnerId)}
                        className="coc-focus-ring flex w-full items-center gap-3 border-b border-[var(--coc-border-subtle)] px-4 py-4 text-left transition last:border-0 hover:bg-white/[0.04]"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--coc-border-subtle)] bg-black/25 text-[var(--coc-text-secondary)]">
                          {c.partnerAvatarUrl ? (
                            <img src={c.partnerAvatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <User size={18} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm font-semibold text-[var(--coc-text-primary)]">
                              {c.partnerNickname}
                            </span>
                            <span className="shrink-0 text-[10px] text-[var(--coc-text-muted)]">
                              {formatTimeAgo(c.lastCreatedAt)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <span className="truncate text-xs text-[var(--coc-text-muted)]">
                              {c.lastContent}
                            </span>
                            {c.unreadCount > 0 && (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--coc-accent-blood)] px-1.5 text-[10px] font-bold text-white">
                                {c.unreadCount > 99 ? '99+' : c.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === 'messages' && selectedPartnerId && selectedPartner && (
              <>
                <div className="flex items-center gap-3 border-b border-[var(--coc-border-subtle)] bg-black/15 px-4 py-4">
                  <button
                    type="button"
                    onClick={() => setSelectedPartnerId(null)}
                    className="coc-focus-ring rounded-md p-2 text-[var(--coc-text-muted)] hover:bg-white/[0.06] hover:text-[var(--coc-text-primary)]"
                    aria-label="返回会话列表"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--coc-border-subtle)] bg-black/25 text-[var(--coc-text-secondary)]">
                    {selectedPartner.partnerAvatarUrl ? (
                      <img src={selectedPartner.partnerAvatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--coc-text-primary)]">
                      {selectedPartner.partnerNickname}
                    </div>
                    <div className="text-xs text-[var(--coc-text-muted)]">私信档案</div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="py-8">
                      <Skeleton className="mx-auto h-12 w-3/4" />
                      <Skeleton className="mx-auto mt-3 h-12 w-1/2" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="px-6 py-16 text-center text-sm text-[var(--coc-text-muted)]">
                      暂无消息记录。
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.senderId === user?.id;
                      return (
                        <div key={m.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                          <div
                            className={cn(
                              'max-w-[min(72%,34rem)] rounded-lg border px-3 py-2 text-sm leading-6 shadow-sm',
                              isMe
                                ? 'border-[var(--coc-accent-gold)]/45 bg-[var(--coc-accent-gold)]/14 text-[var(--coc-text-primary)]'
                                : 'border-[var(--coc-border-subtle)] bg-black/25 text-[var(--coc-text-primary)]'
                            )}
                          >
                            <div className="whitespace-pre-wrap break-words">{m.content}</div>
                            <div className={cn('mt-1 text-[10px] text-[var(--coc-text-muted)]', isMe && 'text-right')}>
                              {formatTimeAgo(m.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="flex items-center gap-2 border-t border-[var(--coc-border-subtle)] bg-black/15 px-4 py-3">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="写给这位调查员..."
                    className="coc-focus-ring min-w-0 flex-1 rounded-md border border-[var(--coc-border-subtle)] bg-black/25 px-3 py-2 text-sm text-[var(--coc-text-primary)] placeholder:text-[var(--coc-text-muted)]"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendMutation.isPending}
                    className="coc-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--coc-accent-gold)] text-[var(--coc-text-inverse)] transition hover:bg-[var(--coc-accent-gold-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="发送私信"
                  >
                    {sendMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </Surface>
    </PageShell>
  );
}
