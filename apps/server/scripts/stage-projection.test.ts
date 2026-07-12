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

test('a seeded bound player actor can enter, perform, and exit from an otherwise empty stage', () => {
  const seed = {
    contractVersion: 'stage.d1a.v1.1', channel: { id: 'stage-main', kind: 'MAIN_ROOM' as const, roomId: 'room-1' }, revision: 0,
    serverTime: '', viewer: { userId: 'pl-1', kind: 'PLAYER' as const, roomRole: 'PLAYER' },
    capabilities: { canUseStage: true, canControlOwnStageActor: true, canManageStage: false, canManageStageAssets: false, canExportStageReplay: false },
    scene: { title: '共享舞台' }, assetRefs: [],
    actors: [{ actorId: 'bound-character-1', actorKind: 'PLAYER_CHARACTER', ownerUserId: 'pl-1', characterId: 'character-1', name: '林雾', zone: 'center', entered: false, visibility: 'PUBLIC' as const }],
  };
  const entered = applyStageCommandToProjection({ projection: seed, revision: 1, commandType: 'ACTOR_ENTER', payload: { actorId: 'bound-character-1', zone: 'left' } });
  const performed = applyStageCommandToProjection({ projection: entered, revision: 2, commandType: 'ACTOR_PERFORM', payload: { actorId: 'bound-character-1', action: 'nod' } });
  const exited = applyStageCommandToProjection({ projection: performed, revision: 3, commandType: 'ACTOR_EXIT', payload: { actorId: 'bound-character-1' } });
  assert.equal(entered.actors[0].entered, true);
  assert.equal(performed.actors[0].action, 'nod');
  assert.equal(exited.actors[0].entered, false);
});
