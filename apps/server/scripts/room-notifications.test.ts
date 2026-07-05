import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApplicationSubmittedNotification,
  buildApplicationReviewNotification,
  buildNextSessionNotification,
  collectRoomManagerNotificationRecipients,
  collectRoomNotificationRecipients,
} from '../src/modules/rooms/room-notifications.service';

test('room notification recipients include creator and active members but skip actor and departed users', () => {
  const recipients = collectRoomNotificationRecipients(
    {
      creatorId: 'kp-owner',
      members: [
        { userId: 'kp-helper', leftAt: null },
        { userId: 'player-a', leftAt: null },
        { userId: 'departed', leftAt: new Date('2026-07-01T00:00:00.000Z') },
        { userId: 'player-a', leftAt: null },
      ],
    },
    'kp-helper'
  );

  assert.deepEqual(recipients.sort(), ['kp-owner', 'player-a']);
});

test('next session notifications describe scheduled and cancelled states', () => {
  const scheduled = buildNextSessionNotification({
    roomTitle: '雾港疑案',
    status: 'SCHEDULED',
    scheduledAt: new Date('2026-07-08T12:00:00.000Z'),
    title: '第二幕',
    roomId: 'room-public-id',
  });

  assert.equal(scheduled.type, 'room_next_session');
  assert.equal(scheduled.title, '雾港疑案：下一次跑团已安排');
  assert.match(scheduled.content, /第二幕/);
  assert.match(scheduled.content, /2026-07-08/);
  assert.equal(scheduled.link, '/rooms/room-public-id');

  const cancelled = buildNextSessionNotification({
    roomTitle: '雾港疑案',
    status: 'CANCELLED',
    scheduledAt: null,
    title: '',
    roomId: 'room-public-id',
  });

  assert.equal(cancelled.title, '雾港疑案：下一次跑团已取消');
});

test('application review notifications distinguish approved and declined results', () => {
  const approved = buildApplicationReviewNotification({
    roomTitle: '雾港疑案',
    roomId: 'room-public-id',
    status: 'APPROVED',
    reviewNote: '欢迎加入',
  });

  assert.equal(approved.type, 'room_application_review');
  assert.equal(approved.title, '雾港疑案：入团申请已通过');
  assert.match(approved.content, /欢迎加入/);

  const declined = buildApplicationReviewNotification({
    roomTitle: '雾港疑案',
    roomId: 'room-public-id',
    status: 'DECLINED',
    reviewNote: '',
  });

  assert.equal(declined.title, '雾港疑案：入团申请未通过');
});

test('room manager notification recipients include owner and active assistant keepers only', () => {
  const recipients = collectRoomManagerNotificationRecipients(
    {
      creatorId: 'owner',
      roomId: 'room-public-id',
      members: [
        { userId: 'assistant', role: 'KP', leftAt: null },
        { userId: 'player', role: 'PLAYER', leftAt: null },
        { userId: 'departed-kp', role: 'KP', leftAt: new Date('2026-07-01T00:00:00.000Z') },
      ],
    },
    'player'
  );

  assert.deepEqual(recipients.sort(), ['assistant', 'owner']);
});

test('application submitted notifications point keepers back to recruitment review', () => {
  const notification = buildApplicationSubmittedNotification({
    roomTitle: '雾港疑案',
    roomId: 'room-public-id',
    applicantName: '林舟',
    message: '想参加严肃调查团',
  });

  assert.equal(notification.type, 'room_application_submitted');
  assert.equal(notification.title, '雾港疑案：收到新的入团申请');
  assert.match(notification.content, /林舟/);
  assert.equal(notification.link, '/rooms/room-public-id');
});
