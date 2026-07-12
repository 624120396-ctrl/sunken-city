import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStageCommandToProjection,
  canViewerSeeActor,
  serializeStageSnapshot,
  trimStageAssetRefs,
} from '../src/modules/rooms/stage/stage-projection.ts';

test('stage projection hides kp-only actors from players and observers', () => {
  assert.equal(canViewerSeeActor({ visibility: 'KP_ONLY', viewerUserId: 'pl1', viewerCanManageStage: false }), false);
  assert.equal(canViewerSeeActor({ visibility: 'KP_ONLY', viewerUserId: 'kp1', viewerCanManageStage: true }), true);
});

test('stage projection exposes private actors only to targets and kp', () => {
  assert.equal(canViewerSeeActor({ visibility: 'PRIVATE_TARGETS', viewerUserId: 'pl1', viewerCanManageStage: false, targetUserIds: ['pl1'] }), true);
  assert.equal(canViewerSeeActor({ visibility: 'PRIVATE_TARGETS', viewerUserId: 'pl2', viewerCanManageStage: false, targetUserIds: ['pl1'] }), false);
});

test('stage projection never returns storage keys in asset refs', () => {
  const refs = trimStageAssetRefs({
    viewerUserId: 'pl1',
    viewerCanManageStage: false,
    assets: [
      { visibility: 'PUBLIC', proxyUrl: '/api/rooms/r1/stage/assets/a1/proxy', storageKey: 'private/a1.png' },
      { visibility: 'KP_ONLY', proxyUrl: '/api/rooms/r1/stage/assets/a2/proxy', storageKey: 'private/a2.png' },
    ],
  });
  assert.equal(refs.length, 1);
  assert.equal('storageKey' in refs[0], false);
});

test('stage projection keeps private-room assets for active room members', () => {
  const refs = trimStageAssetRefs({
    viewerUserId: 'pl1',
    viewerCanManageStage: false,
    roomUserIds: ['pl1'],
    assets: [
      { visibility: 'PRIVATE_ROOM', proxyUrl: '/delivery/a1', storageKey: 'private/a1.png' },
      { visibility: 'PRIVATE_ROOM', proxyUrl: '/delivery/a2', storageKey: 'private/a2.png' },
    ],
  });
  assert.equal(refs.length, 2);
});

test('stage snapshot serializer keeps contract version channel revision and projection together', () => {
  const snapshot = serializeStageSnapshot({
    contractVersion: 'stage.d1a.v1.1',
    channel: { id: 'stage-main', kind: 'MAIN_ROOM', roomId: 'room-1' },
    revision: 2,
    projection: { actors: [] },
  });
  assert.equal(snapshot.contractVersion, 'stage.d1a.v1.1');
  assert.equal(snapshot.channel.id, 'stage-main');
  assert.equal(snapshot.revision, 2);
});

test('stage projection advances with an accepted discriminated command so recovery refetch is authoritative', () => {
  const next = applyStageCommandToProjection({
    projection: {
      contractVersion: 'stage.d1a.v1.1',
      channel: { id: 'stage-main', kind: 'MAIN_ROOM', roomId: 'room-1' },
      revision: 2,
      serverTime: '2026-07-12T01:00:00.000Z',
      viewer: { userId: 'kp-1', kind: 'KP', roomRole: 'OWNER_KP' },
      capabilities: { canUseStage: true, canControlOwnStageActor: true, canManageStage: true, canManageStageAssets: true, canExportStageReplay: true },
      scene: { title: '旧场景' },
      actors: [{ actorId: 'actor-1', actorKind: 'PLAYER_CHARACTER', name: '林雾', zone: 'left', entered: true, visibility: 'PUBLIC' }],
      assetRefs: [],
    },
    revision: 3,
    commandType: 'ACTOR_PERFORM',
    payload: { actorId: 'actor-1', action: 'nod', expression: 'calm' },
  });
  assert.equal(next.revision, 3);
  assert.equal(next.actors[0].action, 'nod');
  assert.equal(next.actors[0].expression, 'calm');
});
