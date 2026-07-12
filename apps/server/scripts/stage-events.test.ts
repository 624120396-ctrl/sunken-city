import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStageCommandDisabledResult,
  buildStageEventPayload,
  buildStageEventAudience,
  buildStageEventTargetUserIds,
  buildStageMessageMeta,
  canExecuteStageChannelCommand,
  nextStageRevision,
} from '../src/modules/rooms/stage/stage-events.ts';
import { buildStageStatus, canAcceptStageCommands } from '../src/modules/rooms/stage/stage-flags.ts';
import { validateStageCommandEnvelope } from '../src/modules/rooms/stage/stage-validation.ts';

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
    contractVersion: 'stage.d1a.v1.1',
    stageEnabled: true,
    enabled: false,
    roomStageEnabled: true,
    globalEnabled: true,
    viewer: { userId: '', kind: 'OBSERVER', roomRole: 'UNKNOWN' },
    capabilities: {
      canUseStage: false,
      canControlOwnStageActor: false,
      canManageStage: false,
      canManageStageAssets: false,
      canExportStageReplay: false,
    },
    channels: [],
  });
});

test('stage disabled command result uses the public rejected acknowledgement shape', () => {
  assert.deepEqual(buildStageCommandDisabledResult({
    commandId: 'cmd-1',
    channelId: 'channel-1',
    revision: 7,
  }), {
    contractVersion: 'stage.d1a.v1.1',
    accepted: false,
    outcome: 'REJECTED',
    commandId: 'cmd-1',
    channelId: 'channel-1',
    revision: 7,
    error: {
      code: 'STAGE_DISABLED',
      message: '舞台当前未启用',
    },
  });
});

test('stage message metadata links room message to stage command without changing room authority', () => {
  assert.deepEqual(buildStageMessageMeta({
    commandId: 'cmd-1',
    channelId: 'channel-1',
    targetUserId: 'pl-2',
    audienceUserIds: ['kp-1', 'pl-2'],
  }), {
    stageCommandId: 'cmd-1',
    stageChannelId: 'channel-1',
    targetUserId: 'pl-2',
    participantUserIds: ['kp-1', 'pl-2'],
  });
});

test('private stage event targets always include both the recipient and operator', () => {
  assert.deepEqual(buildStageEventTargetUserIds({ operatorUserId: 'kp-1', targetUserId: 'pl-1' }), ['kp-1', 'pl-1']);
  assert.deepEqual(buildStageEventTargetUserIds({ operatorUserId: 'pl-1', targetUserId: 'pl-1' }), ['pl-1']);
});

test('hidden actor event audience retains actor visibility and includes KP viewers', () => {
  assert.deepEqual(buildStageEventAudience({
    visibility: 'KP_ONLY',
    targetUserIds: [],
    kpUserIds: ['kp-1', 'kp-2'],
  }), { visibility: 'KP_ONLY', targetUserIds: ['kp-1', 'kp-2'] });
  assert.deepEqual(buildStageEventAudience({
    visibility: 'PRIVATE_TARGETS',
    targetUserIds: ['pl-1'],
    kpUserIds: ['kp-1'],
  }), { visibility: 'PRIVATE_TARGETS', targetUserIds: ['pl-1', 'kp-1'] });
});

test('private message audience includes the operator, recipient, and every active KP', () => {
  assert.deepEqual(buildStageEventAudience({
    visibility: 'PRIVATE_TARGETS',
    targetUserIds: buildStageEventTargetUserIds({ operatorUserId: 'pl-1', targetUserId: 'pl-2' }),
    kpUserIds: ['owner-kp', 'assistant-kp'],
  }), {
    visibility: 'PRIVATE_TARGETS',
    targetUserIds: ['pl-1', 'pl-2', 'owner-kp', 'assistant-kp'],
  });
});

test('only a managing KP can re-enable a disabled channel', () => {
  assert.equal(canExecuteStageChannelCommand({ status: 'DISABLED', commandType: 'ACTOR_PERFORM', canManageStage: true }), false);
  assert.equal(canExecuteStageChannelCommand({ status: 'DISABLED', commandType: 'CHANNEL_ENABLE', canManageStage: false }), false);
  assert.equal(canExecuteStageChannelCommand({ status: 'DISABLED', commandType: 'CHANNEL_ENABLE', canManageStage: true }), true);
});

test('stage command validator accepts only the frozen discriminated payload for each command', () => {
  const accepted = validateStageCommandEnvelope({
    contractVersion: 'stage.d1a.v1.1',
    commandId: 'cmd-1',
    channelId: 'channel-1',
    expectedRevision: 3,
    commandType: 'ACTOR_PERFORM',
    payload: { actorId: 'actor-1', action: 'nod', expression: 'calm' },
  });
  assert.equal(accepted.ok, true);

  const rejected = validateStageCommandEnvelope({
    contractVersion: 'stage.d1a.v1.1',
    commandId: 'cmd-2',
    channelId: 'channel-1',
    expectedRevision: 3,
    commandType: 'ACTOR_PERFORM',
    payload: { actorId: 'actor-1', action: 'nod', unexpected: true },
  });
  assert.deepEqual(rejected, { ok: false, message: 'ACTOR_PERFORM payload contains unsupported fields' });
});
