import type { NotificationItem } from './notification.service';

export type NotificationLayer = 'all' | 'coordination' | 'social' | 'system';

const coordinationNotificationTypes = new Set<string>([
  'room_invite',
  'room_next_session',
  'room_announcement',
  'room_application_review',
  'room_application_submitted',
  'global_recruitment_response',
]);

const socialNotificationTypes = new Set<string>([
  'mention',
  'reply',
  'like',
  'best_reply',
  'friend_request',
  'friend_accept',
  'forum_reply',
  'forum_mention',
  'forum_like',
  'forum_best_reply',
]);

export function getNotificationTypeLabel(type: NotificationItem['type'] | string) {
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
    case 'room_next_session':
      return '跑团排期';
    case 'room_announcement':
      return '房间公告';
    case 'room_application_review':
      return '申请结果';
    case 'room_application_submitted':
      return '入团申请';
    case 'global_recruitment_response':
      return '招募报名';
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
    default:
      return '系统';
  }
}

export function getNotificationLayer(type: NotificationItem['type'] | string): Exclude<NotificationLayer, 'all'> {
  if (coordinationNotificationTypes.has(type)) return 'coordination';
  if (socialNotificationTypes.has(type)) return 'social';
  return 'system';
}

export function getNotificationLayerLabel(layer: NotificationLayer) {
  switch (layer) {
    case 'coordination':
      return '调度';
    case 'social':
      return '社交';
    case 'system':
      return '系统';
    default:
      return '全部';
  }
}

export function getNotificationLayerDescription(layer: NotificationLayer) {
  switch (layer) {
    case 'coordination':
      return '排期、申请、邀请、招募';
    case 'social':
      return '好友、论坛、提及';
    case 'system':
      return '公告、位阶、印记';
    default:
      return '所有待读与归档';
  }
}

export function getNotificationTargetPath(input: Pick<NotificationItem, 'type' | 'link' | 'postId'> | {
  type: string;
  link?: string;
  postId?: string;
}) {
  if (input.link) return input.link;
  if (input.type === 'friend_request' || input.type === 'friend_accept') return '/friends';
  if (input.type === 'room_invite') return '/rooms';
  if (input.postId) return `/forums/${input.postId}`;
  return null;
}
