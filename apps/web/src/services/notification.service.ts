import { apiFetch, handleApiResponse } from '@lib/api';

export type NotificationType =
  | 'mention'
  | 'reply'
  | 'like'
  | 'best_reply'
  | 'system'
  | 'system_announcement'
  | 'rank_up'
  | 'title_unlock'
  | 'shop_purchase'
  | 'forum_reply'
  | 'forum_mention'
  | 'forum_like'
  | 'forum_best_reply'
  | 'moderator_action';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  link?: string;
  postId?: string;
  replyId?: string;
  isRead: boolean;
  isSystem?: boolean;
  createdAt: string;
}

export async function getNotifications(limit = 20): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  const res = await apiFetch(`/notifications?limit=${limit}`);
  return handleApiResponse(res);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch('/notifications/read-all', {
    method: 'PATCH',
  });
}

export async function deleteNotification(id: string): Promise<void> {
  await apiFetch(`/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
