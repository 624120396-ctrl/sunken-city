import test from 'node:test';
import assert from 'node:assert/strict';
import {
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

test('stage snapshot serializer keeps contract version channel revision and projection together', () => {
  const snapshot = serializeStageSnapshot({
    contractVersion: 'stage.d1a.v1',
    channel: { id: 'stage-main', kind: 'MAIN_ROOM', roomId: 'room-1' },
    revision: 2,
    projection: { actors: [] },
  });
  assert.equal(snapshot.contractVersion, 'stage.d1a.v1');
  assert.equal(snapshot.channel.id, 'stage-main');
  assert.equal(snapshot.revision, 2);
});
