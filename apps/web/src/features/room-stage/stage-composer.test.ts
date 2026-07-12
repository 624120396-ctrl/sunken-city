import assert from 'node:assert/strict';
import test from 'node:test';
import { canSubmitStageComposer, selectStageMessageTargets, shouldClearStageComposer } from './stage-composer.ts';
import type { StageViewModel } from './stage-view-model.ts';

const privateThread: StageViewModel = {
  channelId: 'private-1', channelKind: 'PRIVATE_THREAD', revision: 3,
  scene: { title: '私密场景' },
  viewer: { userId: 'sender-player', kind: 'PLAYER', roomRole: 'PLAYER' },
  capabilities: { canUseStage: true, canControlOwnStageActor: true, canManageStage: false, canManageStageAssets: false, canExportStageReplay: false },
  actors: [
    { actorId: 'sender-actor', ownerUserId: 'sender-player', name: '发送者', zone: 'left', entered: true, visibility: 'PRIVATE_TARGETS' },
    { actorId: 'target-actor', ownerUserId: 'target-player', name: '接收者', zone: 'center', entered: true, visibility: 'PRIVATE_TARGETS' },
    { actorId: 'other-actor', ownerUserId: 'other-thread-participant', name: '其他参与者', zone: 'right', entered: true, visibility: 'PRIVATE_TARGETS' },
  ],
};

test('private composer targets are limited to server-projected visible participants', () => {
  assert.deepEqual(selectStageMessageTargets(privateThread), [
    { userId: 'target-player', label: '接收者' },
    { userId: 'other-thread-participant', label: '其他参与者' },
  ]);
});

test('private composer disables submission until an explicit visible target is selected', () => {
  assert.equal(canSubmitStageComposer({ content: '悄声说话', channelKind: 'PRIVATE_THREAD', targetUserId: undefined }), false);
  assert.equal(canSubmitStageComposer({ content: '悄声说话', channelKind: 'PRIVATE_THREAD', targetUserId: 'target-player' }), true);
});

test('composer retains draft after dispatch failure and clears it only after accepted acknowledgement', () => {
  assert.equal(shouldClearStageComposer({ accepted: false, message: '舞台连接已断开' }), false);
  assert.equal(shouldClearStageComposer({ accepted: true }), true);
});
