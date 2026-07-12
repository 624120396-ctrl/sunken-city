import assert from 'node:assert/strict';
import test from 'node:test';
import { STAGE_CONTRACT_VERSION, type StageSnapshot } from '../../../../shared/stage/stage-contract.ts';
import { applyStageEvent, createStageViewModel } from './stage-view-model.ts';

const snapshot: StageSnapshot = {
  contractVersion: STAGE_CONTRACT_VERSION,
  channel: { id: 'stage-main', kind: 'MAIN_ROOM', roomId: 'room-1' },
  revision: 3,
  projection: {
    contractVersion: STAGE_CONTRACT_VERSION,
    channel: { id: 'stage-main', kind: 'MAIN_ROOM', roomId: 'room-1' },
    revision: 3, serverTime: '2026-07-12T01:00:00.000Z',
    viewer: { userId: 'player-1', kind: 'PLAYER', roomRole: 'PLAYER' },
    capabilities: { canUseStage: true, canControlOwnStageActor: true, canManageStage: false, canManageStageAssets: false, canExportStageReplay: false },
    scene: { title: '黑水港码头', backgroundAssetId: 'asset-bg-1' },
    actors: [{ actorId: 'actor-pl-1', actorKind: 'PLAYER_CHARACTER', ownerUserId: 'player-1', name: '林雾', zone: 'left', entered: true, visibility: 'PUBLIC' }],
    assetRefs: [{ assetId: 'asset-bg-1', kind: 'BACKGROUND', version: 1, proxyUrl: '/api/rooms/room-1/stage/assets/asset-bg-1/proxy' }],
  },
};

test('keeps only accessible proxy assets in the renderer view model', () => {
  const model = createStageViewModel(snapshot);

  assert.equal(model.scene.background?.proxyUrl, '/api/rooms/room-1/stage/assets/asset-bg-1/proxy');
  assert.equal(model.actors[0].portrait, undefined);
});

test('applies a contiguous event only to its matching snapshot revision', () => {
  const applied = applyStageEvent(snapshot, {
    eventId: 'evt-1', channelId: snapshot.channel.id, commandId: 'cmd-1', beforeRevision: 3, afterRevision: 4,
    eventType: 'ACTOR_PERFORM', payload: { actorId: 'actor-pl-1', action: 'nod', expression: 'calm' },
    visibility: 'PUBLIC', targetUserIds: [], createdAt: '2026-07-12T01:03:00.000Z',
  });

  assert.equal(applied?.revision, 4);
  assert.equal(applied?.projection.actors[0].action, 'nod');
  assert.equal(applyStageEvent(snapshot, {
    eventId: 'wrong', channelId: 'another-channel', commandId: 'cmd-2', beforeRevision: 3, afterRevision: 4,
    eventType: 'ACTOR_EXIT' as const, payload: { actorId: 'actor-pl-1' }, visibility: 'PUBLIC' as const,
    targetUserIds: [], createdAt: '2026-07-12T01:03:00.000Z',
  }), undefined);
});
