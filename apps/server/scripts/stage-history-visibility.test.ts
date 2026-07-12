import assert from 'node:assert/strict';
import test from 'node:test';
import { canViewRoomMessage } from '../src/config/socket.ts';
import { buildStageMessageMeta } from '../src/modules/rooms/stage/stage-events.ts';

test('private-thread history uses the exact realtime audience instead of every channel participant', () => {
  const meta = buildStageMessageMeta({
    commandId: 'cmd-private-1',
    channelId: 'private-thread-1',
    targetUserId: 'target-player',
    audienceUserIds: ['sender-player', 'target-player', 'owner-kp', 'assistant-kp'],
  });
  const message = { type: 'private', meta: JSON.stringify(meta) };

  assert.equal(canViewRoomMessage(message, 'sender-player'), true);
  assert.equal(canViewRoomMessage(message, 'target-player'), true);
  assert.equal(canViewRoomMessage(message, 'owner-kp'), true);
  assert.equal(canViewRoomMessage(message, 'assistant-kp'), true);
  assert.equal(canViewRoomMessage(message, 'other-thread-participant'), false);
});
