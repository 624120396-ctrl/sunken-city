import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCharacterRoomHistoryView } from '../src/modules/characters/character-room-history.service';

test('character room history maps room run, report and settlement summary', () => {
  const history = buildCharacterRoomHistoryView([
    {
      id: 'participant-1',
      role: 'PLAYER',
      participationStatus: 'ACTIVE',
      joinedRunAt: new Date('2026-07-01T12:00:00.000Z'),
      leftRunAt: null,
      roomRun: {
        lifecycle: 'FINISHED',
        startedAt: new Date('2026-07-01T12:00:00.000Z'),
        finishedAt: new Date('2026-07-02T12:00:00.000Z'),
        room: {
          roomId: 'mist-room',
          name: '雾港疑案',
        },
        settlements: [
          {
            status: 'APPROVED',
            outcome: 'SURVIVED',
            hpFinal: 9,
            mpFinal: 11,
            sanFinal: 44,
          },
        ],
      },
    },
  ], new Map([
    ['mist-room', {
      id: 'report-1',
      title: '雾港疑案 - 游戏报告',
      summary: '调查员封存了灯塔档案。',
      createdAt: new Date('2026-07-02T13:00:00.000Z'),
    }],
  ]));

  assert.equal(history.length, 1);
  assert.equal(history[0].roomName, '雾港疑案');
  assert.equal(history[0].report?.link, '/rooms/mist-room/report');
  assert.equal(history[0].settlement?.outcome, 'SURVIVED');
  assert.equal(history[0].settlement?.sanFinal, 44);
});

test('character room history works without report or settlement', () => {
  const history = buildCharacterRoomHistoryView([
    {
      id: 'participant-2',
      role: 'PLAYER',
      participationStatus: 'ACTIVE',
      joinedRunAt: new Date('2026-07-03T12:00:00.000Z'),
      leftRunAt: null,
      roomRun: {
        lifecycle: 'IN_PROGRESS',
        startedAt: new Date('2026-07-03T12:00:00.000Z'),
        finishedAt: null,
        room: {
          roomId: 'open-room',
          name: '未竟之夜',
        },
        settlements: [],
      },
    },
  ], new Map());

  assert.equal(history[0].report, null);
  assert.equal(history[0].settlement, null);
  assert.equal(history[0].lifecycle, 'IN_PROGRESS');
});
