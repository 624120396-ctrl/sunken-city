import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSchedulePollCancelledNotification,
  buildSchedulePollFinalizedNotification,
  buildSchedulePollReminderNotification,
} from '../src/modules/rooms/room-notifications.service.ts';
import { buildCalendarFile } from '../src/modules/rooms/room-schedule-poll.logic.ts';

test('schedule poll notifications distinguish finalized, cancelled, and reminder events', () => {
  const finalized = buildSchedulePollFinalizedNotification({
    roomTitle: '雾港疑案',
    roomId: 'room-public-id',
    pollTitle: '第二幕排期',
    startsAt: new Date('2026-07-18T12:00:00.000Z'),
    timezone: 'Asia/Shanghai',
  });
  assert.equal(finalized.type, 'room_schedule_poll_finalized');
  assert.match(finalized.title, /跑团时间已确定/);
  assert.match(finalized.content, /正式确认/);
  assert.match(finalized.content, /20:00/);

  const rescheduled = buildSchedulePollFinalizedNotification({
    roomTitle: '雾港疑案',
    roomId: 'room-public-id',
    pollTitle: '第二幕改期',
    startsAt: new Date('2026-07-19T12:00:00.000Z'),
    timezone: 'Asia/Shanghai',
    isReschedule: true,
  });
  assert.match(rescheduled.title, /已改期/);

  const cancelled = buildSchedulePollCancelledNotification({
    roomTitle: '雾港疑案',
    roomId: 'room-public-id',
    pollTitle: '第二幕排期',
  });
  assert.equal(cancelled.type, 'room_schedule_poll_cancelled');
  assert.match(cancelled.content, /第二幕排期/);

  const reminder = buildSchedulePollReminderNotification({
    roomTitle: '雾港疑案',
    roomId: 'room-public-id',
    pollTitle: '第二幕排期',
    closesAt: new Date('2026-07-15T12:00:00.000Z'),
    timezone: 'Asia/Shanghai',
  });
  assert.equal(reminder.type, 'room_schedule_poll_reminder');
  assert.match(reminder.content, /尚未提交/);
  assert.match(reminder.content, /20:00/);
});

test('calendar file keeps session instants in UTC and escapes text', () => {
  const calendar = buildCalendarFile({
    uid: 'room-public-id@sunken-city',
    title: '第二幕, 雾港',
    description: '正式场次;请再次确认',
    startsAt: new Date('2026-07-18T12:00:00.000Z'),
    endsAt: new Date('2026-07-18T16:00:00.000Z'),
    now: new Date('2026-07-10T00:00:00.000Z'),
  });

  assert.match(calendar, /DTSTART:20260718T120000Z/);
  assert.match(calendar, /DTEND:20260718T160000Z/);
  assert.match(calendar, /SUMMARY:第二幕\\, 雾港/);
  assert.match(calendar, /DESCRIPTION:正式场次\\;请再次确认/);
});
