import test from 'node:test';
import assert from 'node:assert/strict';
import { getNotificationTargetPath, getNotificationTypeLabel } from '../src/services/notification-meta';

test('room notification labels are explicit in notification surfaces', () => {
  assert.equal(getNotificationTypeLabel('room_next_session'), '跑团排期');
  assert.equal(getNotificationTypeLabel('room_announcement'), '房间公告');
  assert.equal(getNotificationTypeLabel('room_application_review'), '申请结果');
  assert.equal(getNotificationTypeLabel('room_application_submitted'), '入团申请');
});

test('notification target prefers explicit link and falls back to known targets', () => {
  assert.equal(getNotificationTargetPath({ type: 'room_next_session', link: '/rooms/mist' }), '/rooms/mist');
  assert.equal(getNotificationTargetPath({ type: 'room_invite' }), '/rooms');
  assert.equal(getNotificationTargetPath({ type: 'friend_request' }), '/friends');
  assert.equal(getNotificationTargetPath({ type: 'forum_reply', postId: 'post-1' }), '/forums/post-1');
  assert.equal(getNotificationTargetPath({ type: 'system' }), null);
});
