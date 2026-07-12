import test from 'node:test';
import assert from 'node:assert/strict';
import { emitStageEvent } from '../src/modules/rooms/stage/stage.gateway.ts';

test('gateway directs KP_ONLY and PRIVATE_TARGETS stage events only to their audience', () => {
  const deliveries: string[] = [];
  const io = {
    to(room: string) {
      return { emit: () => deliveries.push(room) };
    },
  } as any;
  emitStageEvent(io, { channelId: 'c1', visibility: 'KP_ONLY', targetUserIds: ['kp-1'] });
  emitStageEvent(io, { channelId: 'c1', visibility: 'PRIVATE_TARGETS', targetUserIds: ['pl-1', 'kp-1'] });
  emitStageEvent(io, { channelId: 'c1', visibility: 'PUBLIC', targetUserIds: [] });
  assert.deepEqual(deliveries, ['stage:c1:user:kp-1', 'stage:c1:user:pl-1', 'stage:c1:user:kp-1', 'stage:c1']);
});
