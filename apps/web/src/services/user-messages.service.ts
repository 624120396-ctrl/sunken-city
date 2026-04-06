import { apiFetch, handleApiResponse } from '@lib/api';

export interface UserMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    nickname: string;
    avatarUrl?: string;
  };
  receiver?: {
    id: string;
    nickname: string;
    avatarUrl?: string;
  };
}

export interface Conversation {
  partnerId: string;
  partnerNickname: string;
  partnerAvatarUrl?: string;
  lastContent: string;
  lastCreatedAt: string;
  unreadCount: number;
}

export async function getConversations(): Promise<{ conversations: Conversation[] }> {
  const res = await apiFetch('/user-messages/conversations');
  return handleApiResponse(res);
}

export async function getMessagesWithUser(partnerId: string, limit = 50): Promise<{ messages: UserMessage[] }> {
  const res = await apiFetch(`/user-messages/users/${encodeURIComponent(partnerId)}?limit=${limit}`);
  return handleApiResponse(res);
}

export async function sendMessageToUser(partnerId: string, content: string): Promise<{ message: UserMessage }> {
  const res = await apiFetch(`/user-messages/users/${encodeURIComponent(partnerId)}`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return handleApiResponse(res);
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  await apiFetch(`/user-messages/${encodeURIComponent(messageId)}/read`, {
    method: 'PATCH',
  });
}

export async function getUnreadMessageCount(): Promise<{ unreadCount: number }> {
  const res = await apiFetch('/user-messages/unread-count');
  return handleApiResponse(res);
}
