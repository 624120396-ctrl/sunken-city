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
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@stores/auth.store';
import { RuneBorder } from '@components/ui/RuneBorder';
import { formatTimeAgo, cn } from '@lib/utils';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  NotificationItem,
} from '@services/notification.service';
import {
  getConversations,
  getMessagesWithUser,
  sendMessageToUser,
  markMessageAsRead,
} from '@services/user-messages.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton, SkeletonCard } from '@components/ui/Skeleton';

type Tab = 'notifications' | 'messages';

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

export function MessageCenterPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('notifications');
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
    if (n.link) navigate(n.link);
    else if (n.postId) navigate(`/forums/${n.postId}`);
    if (!n.isRead) readMutation.mutate(n.id);
  };

  const handleSendMessage = () => {
    if (!selectedPartnerId || !messageInput.trim()) return;
    sendMutation.mutate({ partnerId: selectedPartnerId, content: messageInput.trim() });
  };

  const selectedPartner = conversations.find((c) => c.partnerId === selectedPartnerId);

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-ritual font-bold text-coc-parchment">消息中心</h1>
        <p className="text-sm text-coc-text-muted mt-1">通知与私信的汇集之所。</p>
      </div>

      <RuneBorder variant="default" intensity="subtle" className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* 左侧导航 */}
          <div className="w-56 border-r border-coc-border bg-coc-bg-secondary/50 flex flex-col">
            <button
              onClick={() => {
                setActiveTab('notifications');
                setSelectedPartnerId(null);
              }}
              className={cn(
                'flex items-center gap-3 px-4 py-3 border-b border-coc-border transition-colors',
                activeTab === 'notifications'
                  ? 'bg-coc-bg-tertiary text-coc-parchment'
                  : 'text-coc-text-secondary hover:bg-coc-bg-tertiary/50 hover:text-coc-parchment'
              )}
            >
              <Bell size={18} />
              <span>系统通知</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('messages');
              }}
              className={cn(
                'flex items-center gap-3 px-4 py-3 transition-colors',
                activeTab === 'messages'
                  ? 'bg-coc-bg-tertiary text-coc-parchment'
                  : 'text-coc-text-secondary hover:bg-coc-bg-tertiary/50 hover:text-coc-parchment'
              )}
            >
              <MessageSquare size={18} />
              <span>私信</span>
            </button>
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeTab === 'notifications' && (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-coc-border bg-coc-bg-secondary/30">
                  <span className="font-bold text-coc-parchment">全部通知</span>
                  {notifications.some((n) => !n.isRead) && (
                    <button
                      onClick={() => readAllMutation.mutate()}
                      disabled={readAllMutation.isPending}
                      className="text-xs text-coc-text-muted hover:text-coc-parchment flex items-center gap-1 disabled:opacity-50"
                    >
                      <Check size={12} />
                      全部已读
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {notifLoading && notifications.length === 0 ? (
                    <div className="p-8">
                      <SkeletonCard className="h-16" />
                      <SkeletonCard className="h-16 mt-3" />
                      <SkeletonCard className="h-16 mt-3" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-coc-text-muted text-sm">
                      暂无通知
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'px-4 py-3 border-b border-coc-border last:border-0 hover:bg-coc-bg-secondary/40 transition-colors',
                          !n.isRead && 'bg-coc-bg-secondary/30'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleNotifNavigate(n)}>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="px-1.5 py-0.5 rounded border border-coc-border text-coc-text-muted">
                                {typeLabel(n.type)}
                              </span>
                              {!n.isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-coc-accent-red" />
                              )}
                              <span className="text-coc-text-muted">
                                {formatTimeAgo(n.createdAt)}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-coc-parchment leading-snug">
                              {n.title}
                            </div>
                            {n.content && (
                              <div className="text-xs text-coc-text-muted truncate mt-0.5">
                                {n.content}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {!n.isRead && (
                              <button
                                onClick={() => readMutation.mutate(n.id)}
                                disabled={readMutation.isPending}
                                className="text-xs text-coc-text-muted hover:text-coc-parchment disabled:opacity-50"
                                title="标记已读"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteMutation.mutate(n.id)}
                              disabled={deleteMutation.isPending}
                              className="text-coc-text-muted hover:text-red-400 p-1 disabled:opacity-50"
                              title="删除"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === 'messages' && !selectedPartnerId && (
              <>
                <div className="px-4 py-3 border-b border-coc-border bg-coc-bg-secondary/30">
                  <span className="font-bold text-coc-parchment">私信会话</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {msgLoading && conversations.length === 0 ? (
                    <div className="p-8">
                      <SkeletonCard className="h-16" />
                      <SkeletonCard className="h-16 mt-3" />
                      <SkeletonCard className="h-16 mt-3" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-8 text-center text-coc-text-muted text-sm">
                      暂无私信会话
                    </div>
                  ) : (
                    conversations.map((c) => (
                      <button
                        key={c.partnerId}
                        onClick={() => setSelectedPartnerId(c.partnerId)}
                        className="w-full text-left px-4 py-3 border-b border-coc-border last:border-0 hover:bg-coc-bg-secondary/40 transition-colors flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-coc-bg-tertiary flex items-center justify-center text-coc-text-secondary shrink-0 overflow-hidden">
                          {c.partnerAvatarUrl ? (
                            <img src={c.partnerAvatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-coc-parchment font-medium truncate">
                              {c.partnerNickname}
                            </span>
                            <span className="text-[10px] text-coc-text-muted">
                              {formatTimeAgo(c.lastCreatedAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-xs text-coc-text-muted truncate pr-2">
                              {c.lastContent}
                            </span>
                            {c.unreadCount > 0 && (
                              <span className="min-w-[1rem] h-4 px-1 rounded-full bg-coc-accent-red text-[10px] text-white font-bold flex items-center justify-center">
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
                {/* 私信详情头部 */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-coc-border bg-coc-bg-secondary/30">
                  <button
                    onClick={() => setSelectedPartnerId(null)}
                    className="text-coc-text-muted hover:text-coc-parchment p-1"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-coc-bg-tertiary flex items-center justify-center text-coc-text-secondary overflow-hidden">
                    {selectedPartner.partnerAvatarUrl ? (
                      <img src={selectedPartner.partnerAvatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <span className="font-bold text-coc-parchment">{selectedPartner.partnerNickname}</span>
                </div>

                {/* 消息记录 */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Skeleton className="h-12 w-3/4 mx-auto" />
                      <Skeleton className="h-12 w-1/2 mx-auto mt-3" />
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.senderId === user?.id;
                      return (
                        <div
                          key={m.id}
                          className={cn('flex', isMe ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[70%] px-3 py-2 rounded-lg text-sm',
                              isMe
                                ? 'bg-coc-accent-red/20 text-coc-parchment'
                                : 'bg-coc-bg-tertiary text-coc-parchment'
                            )}
                          >
                            <div>{m.content}</div>
                            <div
                              className={cn(
                                'text-[10px] mt-1',
                                isMe ? 'text-coc-text-muted/70 text-right' : 'text-coc-text-muted/70'
                              )}
                            >
                              {formatTimeAgo(m.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 输入框 */}
                <div className="px-4 py-3 border-t border-coc-border bg-coc-bg-secondary/30 flex items-center gap-2">
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
                    placeholder="输入消息..."
                    className="flex-1 bg-coc-bg-tertiary border border-coc-border rounded-md px-3 py-2 text-sm text-coc-parchment placeholder:text-coc-text-muted focus:outline-none focus:border-coc-accent-red"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendMutation.isPending}
                    className="p-2 rounded-md bg-coc-accent-red text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-coc-accent-red/80 transition-colors"
                  >
                    {sendMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </RuneBorder>
    </div>
  );
}
