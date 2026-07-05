import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomReportArchiveView } from '../src/modules/rooms/room-report-archive.service';

test('report archive maps room, report and participant role for current user', () => {
  const archive = buildRoomReportArchiveView([
    {
      id: 'room-db-1',
      roomId: 'MIST01',
      name: '雾港疑案',
      creatorId: 'keeper',
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      roomRun: {
        lifecycle: 'FINISHED',
        finishedAt: new Date('2026-07-03T00:00:00.000Z'),
      },
      members: [{ userId: 'player-a', role: 'PLAYER', leftAt: null }],
      reports: [{
        id: 'report-1',
        title: '雾港疑案 - 游戏报告',
        summary: '灯塔案件已经归档。',
        createdAt: new Date('2026-07-03T01:00:00.000Z'),
      }],
    },
  ], 'player-a');

  assert.equal(archive.length, 1);
  assert.equal(archive[0].myRole, 'PLAYER');
  assert.equal(archive[0].report?.link, '/rooms/MIST01/report');
  assert.equal(archive[0].report?.summary, '灯塔案件已经归档。');
});

test('report archive supports hosted rooms without generated report yet', () => {
  const archive = buildRoomReportArchiveView([
    {
      id: 'room-db-2',
      roomId: 'OPEN01',
      name: '未竟之夜',
      creatorId: 'keeper',
      createdAt: new Date('2026-07-04T00:00:00.000Z'),
      roomRun: {
        lifecycle: 'IN_PROGRESS',
        finishedAt: null,
      },
      members: [],
      reports: [],
    },
  ], 'keeper');

  assert.equal(archive[0].myRole, 'OWNER_KP');
  assert.equal(archive[0].report, null);
  assert.equal(archive[0].lifecycle, 'IN_PROGRESS');
});
