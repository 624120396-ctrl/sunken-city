import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStageCommandDisabledResult,
  buildStageEventPayload,
  buildStageMessageMeta,
  nextStageRevision,
} from '../src/modules/rooms/stage/stage-events.ts';
import { buildStageStatus, canAcceptStageCommands } from '../src/modules/rooms/stage/stage-flags.ts';

test('stage revision rejects stale commands', () => {
  assert.deepEqual(nextStageRevision({ currentRevision: 5, expectedRevision: 4 }), {
    ok: false,
    code: 'STAGE_REVISION_CONFLICT',
    latestRevision: 5,
  });
});

test('stage revision advances by one for accepted commands', () => {
  assert.deepEqual(nextStageRevision({ currentRevision: 5, expectedRevision: 5 }), {
    ok: true,
    beforeRevision: 5,
    afterRevision: 6,
  });
});

test('stage event payload preserves immutable source command data', () => {
  const event = buildStageEventPayload({
    commandId: 'cmd-1',
    commandType: 'ACTOR_PERFORM',
    operatorUserId: 'pl-1',
    beforeRevision: 1,
    afterRevision: 2,
    payload: { actorId: 'actor-1', action: 'nod' },
  });
  assert.equal(event.commandId, 'cmd-1');
  assert.equal(event.afterRevision, 2);
  assert.deepEqual(event.payload, { actorId: 'actor-1', action: 'nod' });
});

test('stage commands default to disabled unless global and room flags are both on', () => {
  assert.equal(canAcceptStageCommands({ globalEnabled: false, roomStageEnabled: true }), false);
  assert.equal(canAcceptStageCommands({ globalEnabled: true, roomStageEnabled: false }), false);
  assert.equal(canAcceptStageCommands({ globalEnabled: true, roomStageEnabled: true }), true);
});

test('stage status reports enabled only when flag and capability allow it', () => {
  assert.deepEqual(buildStageStatus({
    globalEnabled: true,
    roomStageEnabled: true,
    canUseStage: false,
    canManageStage: false,
  }), {
    contractVersion: 'stage.d1a.v1',
    enabled: false,
    roomStageEnabled: true,
    globalEnabled: true,
    capabilities: {
      canUseStage: false,
      canManageStage: false,
    },
  });
});

test('stage disabled command result uses frozen error code', () => {
  assert.deepEqual(buildStageCommandDisabledResult({
    commandId: 'cmd-1',
    channelId: 'channel-1',
    revision: 7,
  }), {
    accepted: false,
    commandId: 'cmd-1',
    channelId: 'channel-1',
    revision: 7,
    code: 'STAGE_DISABLED',
  });
});

test('stage message metadata links room message to stage command without changing room authority', () => {
  assert.deepEqual(buildStageMessageMeta({
    commandId: 'cmd-1',
    channelId: 'channel-1',
    targetUserId: 'pl-2',
  }), {
    stageCommandId: 'cmd-1',
    stageChannelId: 'channel-1',
    targetUserId: 'pl-2',
  });
});
