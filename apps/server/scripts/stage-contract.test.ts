import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGE_CONTRACT_VERSION,
  STAGE_ERROR_CODES,
  STAGE_REST_ENDPOINTS,
  STAGE_SOCKET_EVENTS,
  type StageSocketErrorPayload,
} from '../../shared/stage/stage-contract.ts';
import { mockStageCommandEnvelope, mockStageSnapshots, mockStageStatus } from '../../shared/stage/stage-contract.mock.ts';
import { STAGE_SOCKET_EVENTS as serverStageSocketEvents } from '../src/generated/stage-socket-events.ts';

test('stage contract exposes the amended d1a v1.1 version', () => {
  assert.equal(STAGE_CONTRACT_VERSION, 'stage.d1a.v1.1');
});

test('stage socket event names are unique and namespaced', () => {
  const events = Object.values(STAGE_SOCKET_EVENTS);
  assert.equal(new Set(events).size, events.length);
  for (const eventName of events) assert.match(eventName, /^stage:/);
});

test('server socket event constants are generated from the frozen shared contract', () => {
  assert.deepEqual(serverStageSocketEvents, STAGE_SOCKET_EVENTS);
  assert.equal(serverStageSocketEvents.EVENT, 'stage:event');
});

test('stage command errors can correlate an optional command id without breaking older error payloads', () => {
  const error: StageSocketErrorPayload = {
    code: 'STAGE_FORBIDDEN',
    message: '无权操作舞台',
    commandId: 'cmd-1',
  };
  assert.equal(error.commandId, 'cmd-1');
});

test('stage error codes are unique and programmatic', () => {
  const codes = Object.values(STAGE_ERROR_CODES);
  assert.equal(new Set(codes).size, codes.length);
  for (const code of codes) assert.match(code, /^STAGE_/);
});

test('stage rest endpoint names are frozen under room stage routes', () => {
  assert.equal(STAGE_REST_ENDPOINTS.STATUS, 'GET /api/rooms/:roomId/stage/status');
  assert.equal(STAGE_REST_ENDPOINTS.SNAPSHOT, 'GET /api/rooms/:roomId/stage/channels/:channelId/snapshot');
  assert.equal(STAGE_REST_ENDPOINTS.ENABLE, 'POST /api/rooms/:roomId/stage/enable');
  assert.equal(STAGE_REST_ENDPOINTS.DISABLE, 'POST /api/rooms/:roomId/stage/disable');
  assert.equal(STAGE_REST_ENDPOINTS.ASSET_PROXY, 'GET /api/rooms/:roomId/stage/assets/:assetId/proxy');
});

test('stage mocks include contract version channel revision and projection', () => {
  for (const snapshot of Object.values(mockStageSnapshots)) {
    assert.equal(snapshot.contractVersion, STAGE_CONTRACT_VERSION);
    assert.equal(snapshot.projection.contractVersion, STAGE_CONTRACT_VERSION);
    assert.equal(snapshot.channel.id, snapshot.projection.channel.id);
    assert.equal(snapshot.revision, snapshot.projection.revision);
    assert.ok(snapshot.revision >= 1);
  }
});

test('stage mocks cover main room sub-room and private-thread channels', () => {
  assert.equal(mockStageSnapshots.mainRoom.channel.kind, 'MAIN_ROOM');
  assert.equal(mockStageSnapshots.subRoom.channel.kind, 'SUB_ROOM');
  assert.equal(mockStageSnapshots.privateThread.channel.kind, 'PRIVATE_THREAD');
  assert.equal(mockStageSnapshots.privateThread.projection.actors[0].visibility, 'PRIVATE_TARGETS');
});

test('stage status mock gives D1-B the enabled state, full capabilities, and accessible channel catalog', () => {
  assert.equal(mockStageStatus.contractVersion, STAGE_CONTRACT_VERSION);
  assert.equal(mockStageStatus.stageEnabled, true);
  assert.equal(mockStageStatus.capabilities.canManageStageAssets, true);
  assert.deepEqual(mockStageStatus.channels.map((channel) => channel.scope.type), [
    'ROOM',
    'SUB_ROOM',
    'PRIVATE_THREAD',
  ]);
  assert.ok(mockStageStatus.channels.every((channel) => channel.display.label.length > 0));
});

test('stage command mock uses an exact discriminated payload and an optimistic revision', () => {
  assert.equal(mockStageCommandEnvelope.commandType, 'ACTOR_PERFORM');
  assert.deepEqual(mockStageCommandEnvelope.payload, {
    actorId: 'actor-pl-1',
    action: 'nod',
    expression: 'calm',
  });
  assert.equal(mockStageCommandEnvelope.expectedRevision, 3);
});
