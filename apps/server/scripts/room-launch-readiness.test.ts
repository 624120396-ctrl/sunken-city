import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomLaunchReadiness } from '../src/modules/rooms/room-launch-readiness.service';

test('launch readiness marks a prepared room as ready', () => {
  const readiness = buildRoomLaunchReadiness({
    currentObjective: '进入灯塔',
    nextSession: { scheduledAt: new Date('2026-07-08T12:00:00.000Z'), status: 'SCHEDULED' },
    attendanceSummary: { PENDING: 0, AVAILABLE: 3, LEAVE: 0, TENTATIVE: 0 },
    playerMembers: [
      { userId: 'a', characterId: 'ca' },
      { userId: 'b', characterId: 'cb' },
    ],
    sceneCount: 2,
    publicClueCount: 4,
    pendingApplicationCount: 0,
    checklist: [{ text: '确认线索', done: true }],
  });

  assert.equal(readiness.status, 'READY');
  assert.equal(readiness.todoCount, 0);
});

test('launch readiness reports missing schedule, attendance, characters and checklist', () => {
  const readiness = buildRoomLaunchReadiness({
    currentObjective: '',
    nextSession: null,
    attendanceSummary: { PENDING: 2, AVAILABLE: 1, LEAVE: 0, TENTATIVE: 0 },
    playerMembers: [
      { userId: 'a', characterId: null },
      { userId: 'b', characterId: 'cb' },
    ],
    sceneCount: 0,
    publicClueCount: 0,
    pendingApplicationCount: 1,
    checklist: [{ text: '确认手牌', done: false }],
  });

  assert.equal(readiness.status, 'NEEDS_ATTENTION');
  assert.equal(readiness.todoCount, 7);
  assert.deepEqual(
    readiness.items.filter(item => item.status === 'TODO').map(item => item.key),
    ['next-session', 'attendance', 'characters', 'objective', 'scene', 'clues', 'prep-checklist']
  );
});
