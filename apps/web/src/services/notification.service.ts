import { apiFetch, handleApiResponse } from '@lib/api';

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'mention' | 'reply' | 'like' | 'best_reply' | 'system' | 'friend_request' | 'friend_accept' | 'room_invite'
    | 'forum_reply' | 'forum_mention' | 'forum_like' | 'forum_best_reply'
    | 'rank_up' | 'title_unlock' | 'shop_purchase' | 'system_announcement' | 'moderator_action';
  title: string;
  content?: string;
  postId?: string;
  replyId?: string;
  link?: string;
  isRead: boolean;
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
