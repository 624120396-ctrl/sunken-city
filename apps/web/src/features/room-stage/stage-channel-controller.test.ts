import assert from 'node:assert/strict';
import test from 'node:test';
import { STAGE_CONTRACT_VERSION, type StageSnapshot } from '../../../../shared/stage/stage-contract.ts';
import { canDispatchStageCommand, selectNewerSnapshot } from './stage-channel-controller.ts';

const snapshot = (channelId: string, revision: number): StageSnapshot => ({ contractVersion: STAGE_CONTRACT_VERSION, channel: { id: channelId, kind: 'MAIN_ROOM', roomId: 'room-1' }, revision, projection: { contractVersion: STAGE_CONTRACT_VERSION, channel: { id: channelId, kind: 'MAIN_ROOM', roomId: 'room-1' }, revision, serverTime: '', viewer: { userId: 'player-1', kind: 'PLAYER', roomRole: 'PLAYER' }, capabilities: { canUseStage: true, canControlOwnStageActor: true, canManageStage: false, canManageStageAssets: false, canExportStageReplay: false }, scene: { title: '现场' }, actors: [], assetRefs: [] } });

test('rejects a snapshot from another stage channel and accepts a newer matching one', () => {
  const current = snapshot('a', 2);
  assert.equal(selectNewerSnapshot(current, snapshot('b', 3)), undefined);
  assert.equal(selectNewerSnapshot(current, snapshot('a', 2)), undefined);
  assert.equal(selectNewerSnapshot(current, snapshot('a', 3))?.revision, 3);
});

test('does not authorize global scene control from ordinary stage access', () => {
  assert.equal(canDispatchStageCommand(snapshot('a', 1).projection.capabilities, 'SCENE_SET'), false);
  assert.equal(canDispatchStageCommand(snapshot('a', 1).projection.capabilities, 'ACTOR_PERFORM'), true);
});
