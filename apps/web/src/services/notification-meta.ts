import type { NotificationItem } from './notification.service';

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
