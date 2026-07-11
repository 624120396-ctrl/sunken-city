import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCalendarFile,
  buildOptionSummaries,
  canManageSchedulePoll,
  collectPendingScheduleMemberIds,
  sortScheduleOptions,
  validateSchedulePollInput,
} from '../src/modules/rooms/room-schedule-poll.logic.ts';

const now = new Date('2026-07-10T08:00:00.000Z');

test('schedule poll validation accepts 2 to 8 future options and an IANA timezone', () => {
  const result = validateSchedulePollInput({
    title: '七月开团投票',
    timezone: 'Asia/Shanghai',
    closesAt: '2026-07-11T08:00:00.000Z',
    options: [
      { startsAt: '2026-07-12T12:00:00.000Z', endsAt: '2026-07-12T15:00:00.000Z' },
      { startsAt: '2026-07-13T12:00:00.000Z', endsAt: '2026-07-13T15:00:00.000Z' },
    ],
  }, now);

  assert.equal(result.timezone, 'Asia/Shanghai');
  assert.equal(result.options.length, 2);
  assert.equal(result.options[0].position, 0);
});

test('schedule poll validation rejects invalid candidate count timezone past time and duplicate ranges', () => {
  assert.throws(() => validateSchedulePollInput({
    title: 'bad',
    timezone: 'Mars/Base',
    options: [{ startsAt: '2026-07-12T12:00:00.000Z', endsAt: '2026-07-12T15:00:00.000Z' }],
  }, now), /2-8/);

  assert.throws(() => validateSchedulePollInput({
    title: 'bad',
    timezone: 'Mars/Base',
    options: [
      { startsAt: '2026-07-12T12:00:00.000Z', endsAt: '2026-07-12T15:00:00.000Z' },
      { startsAt: '2026-07-13T12:00:00.000Z', endsAt: '2026-07-13T15:00:00.000Z' },
    ],
  }, now), /timezone/);

  assert.throws(() => validateSchedulePollInput({
    title: 'bad',
    timezone: 'Asia/Shanghai',
    options: [
      { startsAt: '2026-07-09T12:00:00.000Z', endsAt: '2026-07-09T15:00:00.000Z' },
      { startsAt: '2026-07-13T12:00:00.000Z', endsAt: '2026-07-13T15:00:00.000Z' },
    ],
  }, now), /过去/);

  assert.throws(() => validateSchedulePollInput({
    title: 'bad',
    timezone: 'Asia/Shanghai',
    options: [
      { startsAt: '2026-07-12T12:00:00.000Z', endsAt: '2026-07-12T15:00:00.000Z' },
      { startsAt: '2026-07-12T12:00:00.000Z', endsAt: '2026-07-12T15:00:00.000Z' },
    ],
  }, now), /重复/);
});

test('schedule poll validation rejects a close time outside the usable window', () => {
  assert.throws(() => validateSchedulePollInput({
    title: 'bad',
    timezone: 'Asia/Shanghai',
    closesAt: '2026-07-10T07:59:00.000Z',
    options: [
      { startsAt: '2026-07-12T12:00:00.000Z', endsAt: '2026-07-12T15:00:00.000Z' },
      { startsAt: '2026-07-13T12:00:00.000Z', endsAt: '2026-07-13T15:00:00.000Z' },
    ],
  }, now), /截止时间/);

  assert.throws(() => validateSchedulePollInput({
    title: 'bad',
    timezone: 'Asia/Shanghai',
    closesAt: '2026-07-14T16:00:00.000Z',
    options: [
      { startsAt: '2026-07-12T12:00:00.000Z', endsAt: '2026-07-12T15:00:00.000Z' },
      { startsAt: '2026-07-13T12:00:00.000Z', endsAt: '2026-07-13T15:00:00.000Z' },
    ],
  }, now), /候选结束/);

  assert.throws(() => validateSchedulePollInput({
    title: 'bad',
    timezone: 'Asia/Shanghai',
    closesAt: '2026-07-12T12:30:00.000Z',
    options: [
      { startsAt: '2026-07-12T12:00:00.000Z', endsAt: '2026-07-12T15:00:00.000Z' },
      { startsAt: '2026-07-13T12:00:00.000Z', endsAt: '2026-07-13T15:00:00.000Z' },
    ],
  }, now), /候选开始/);
});

test('schedule poll validation rejects a candidate that has already started', () => {
  assert.throws(() => validateSchedulePollInput({
    timezone: 'Asia/Shanghai',
    options: [
      { startsAt: '2026-07-10T07:00:00.000Z', endsAt: '2026-07-10T09:00:00.000Z' },
      { startsAt: '2026-07-13T12:00:00.000Z', endsAt: '2026-07-13T15:00:00.000Z' },
    ],
  }, now), /已经开始/);
});

test('option summaries count unavailable tentative available and pending members', () => {
  const summaries = buildOptionSummaries(
    [
      { id: 'a', startsAt: new Date('2026-07-12T12:00:00.000Z'), endsAt: new Date('2026-07-12T15:00:00.000Z'), position: 0 },
      { id: 'b', startsAt: new Date('2026-07-13T12:00:00.000Z'), endsAt: new Date('2026-07-13T15:00:00.000Z'), position: 1 },
    ],
    [
      { optionId: 'a', userId: 'u1', status: 'AVAILABLE' },
      { optionId: 'a', userId: 'u2', status: 'TENTATIVE' },
      { optionId: 'a', userId: 'u3', status: 'UNAVAILABLE' },
      { optionId: 'b', userId: 'u1', status: 'AVAILABLE' },
      { optionId: 'b', userId: 'u2', status: 'AVAILABLE' },
    ],
    ['u1', 'u2', 'u3', 'u4']
  );

  assert.deepEqual(summaries[0].summary, { AVAILABLE: 1, TENTATIVE: 1, UNAVAILABLE: 1, PENDING: 1 });
  assert.deepEqual(summaries[1].summary, { AVAILABLE: 2, TENTATIVE: 0, UNAVAILABLE: 0, PENDING: 2 });
});

test('schedule option sorting recommends the strongest attendance fit without deciding for KP', () => {
  const sorted = sortScheduleOptions([
    {
      id: 'a',
      startsAt: '2026-07-12T12:00:00.000Z',
      endsAt: '2026-07-12T15:00:00.000Z',
      position: 0,
      votes: [],
      summary: { AVAILABLE: 2, TENTATIVE: 1, UNAVAILABLE: 1, PENDING: 0 },
    },
    {
      id: 'b',
      startsAt: '2026-07-13T12:00:00.000Z',
      endsAt: '2026-07-13T15:00:00.000Z',
      position: 1,
      votes: [],
      summary: { AVAILABLE: 2, TENTATIVE: 0, UNAVAILABLE: 0, PENDING: 2 },
    },
    {
      id: 'c',
      startsAt: '2026-07-14T12:00:00.000Z',
      endsAt: '2026-07-14T15:00:00.000Z',
      position: 2,
      votes: [],
      summary: { AVAILABLE: 1, TENTATIVE: 3, UNAVAILABLE: 0, PENDING: 0 },
    },
  ]);

  assert.equal(sorted[0].id, 'b');
  assert.equal(sorted[0].recommendationRank, 1);
  assert.equal(sorted[0].isRecommended, true);
  assert.equal(sorted[1].id, 'a');
});

test('pending members include anyone who has not answered every candidate', () => {
  const pending = collectPendingScheduleMemberIds(
    ['u1', 'u2', 'u3'],
    ['a', 'b'],
    [
      { optionId: 'a', userId: 'u1', status: 'AVAILABLE' },
      { optionId: 'b', userId: 'u1', status: 'TENTATIVE' },
      { optionId: 'a', userId: 'u2', status: 'UNAVAILABLE' },
    ]
  );

  assert.deepEqual(pending, ['u2', 'u3']);
});

test('schedule management follows room capabilities instead of role names', () => {
  assert.equal(canManageSchedulePoll({ canUseKPTools: true, canManageMembers: false }), true);
  assert.equal(canManageSchedulePoll({ canUseKPTools: false, canManageMembers: true }), true);
  assert.equal(canManageSchedulePoll({ canUseKPTools: false, canManageMembers: false }), false);
});

test('calendar file exports a scheduled session as UTC ICS content', () => {
  const ics = buildCalendarFile({
    uid: 'room-1-session',
    title: '灯塔第二幕',
    description: '请回到房间确认正式出席。',
    startsAt: new Date('2026-07-12T12:00:00.000Z'),
    endsAt: new Date('2026-07-12T15:30:00.000Z'),
    url: 'https://coc.city/rooms/abc',
    now,
  });

  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART:20260712T120000Z/);
  assert.match(ics, /DTEND:20260712T153000Z/);
  assert.match(ics, /SUMMARY:灯塔第二幕/);
});
