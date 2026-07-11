import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSchedulePollBadge } from '../src/pages/rooms/components/room-schedule-summary.ts';

test('schedule poll badge reports candidate and pending counts', () => {
  assert.equal(formatSchedulePollBadge({ candidateCount: 4, pendingMemberCount: 2, isVotingClosed: false }), '排期 4 · 待回 2');
  assert.equal(formatSchedulePollBadge({ candidateCount: 3, pendingMemberCount: 0, isVotingClosed: true }), '排期已截止 · 3');
});
