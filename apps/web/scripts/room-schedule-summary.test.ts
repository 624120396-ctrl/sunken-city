import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRoomOperationsScheduleCopy,
  canEditSchedulePoll,
  formatSchedulePollBadge,
} from '../src/pages/rooms/components/room-schedule-summary.ts';

test('schedule poll badge reports candidate and pending counts', () => {
  assert.equal(formatSchedulePollBadge({ candidateCount: 4, pendingMemberCount: 2, isVotingClosed: false }), '排期 4 · 待回 2');
  assert.equal(formatSchedulePollBadge({ candidateCount: 3, pendingMemberCount: 0, isVotingClosed: true }), '排期已截止 · 3');
});

test('expired schedule polls cannot use ordinary edit', () => {
  assert.equal(canEditSchedulePoll(true, false), true);
  assert.equal(canEditSchedulePoll(true, true), false);
});

test('operations summary keeps formal session and attendance as primary information', () => {
  const view = buildRoomOperationsScheduleCopy({
    nextSessionLabel: '07/20 20:00',
    attendance: { AVAILABLE: 3, LEAVE: 1, PENDING: 2 },
    schedulePoll: { candidateCount: 4, pendingMemberCount: 2, isVotingClosed: false },
  });
  assert.equal(view.primaryValue, '07/20 20:00');
  assert.equal(view.attendanceMeta, '可参加 3 / 请假 1 / 待确认 2');
  assert.equal(view.pollSupplement, '排期 4 · 待回 2');
});
