import assert from 'node:assert/strict';
import test from 'node:test';
import { STAGE_CONTRACT_VERSION, STAGE_SOCKET_EVENTS, type StageSnapshot } from '../../../../shared/stage/stage-contract.ts';
import { acceptAuthoritativeSnapshot, canDispatchStageCommand, selectNewerSnapshot, sendStageCommand } from './stage-channel-controller.ts';

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

test('does not let a delayed reconnect snapshot roll a channel back after its event', () => {
  const revisionFive = snapshot('a', 5);
  const revisionSix = snapshot('a', 6);
  assert.equal(acceptAuthoritativeSnapshot(undefined, revisionFive)?.revision, 5);
  assert.equal(acceptAuthoritativeSnapshot(revisionFive, revisionSix)?.revision, 6);
  assert.equal(acceptAuthoritativeSnapshot(revisionSix, revisionFive), undefined);
});

test('sends commands through the frozen command event and consumes the matching ack event', async () => {
  const listeners = new Map<string, (payload: any) => void>();
  const socket = {
    on(event: string, listener: (payload: any) => void) { listeners.set(event, listener); return socket; },
    off(event: string) { listeners.delete(event); return socket; },
    emit(event: string, payload: any) {
      assert.equal(event, STAGE_SOCKET_EVENTS.COMMAND);
      assert.equal(payload.envelope.commandId, 'cmd-1');
      listeners.get(STAGE_SOCKET_EVENTS.COMMAND_ACK)?.({ contractVersion: STAGE_CONTRACT_VERSION, accepted: true, outcome: 'APPLIED', commandId: 'cmd-1', channelId: 'a', revision: 2 });
      return socket;
    },
  } as any;
  const ack = await sendStageCommand(socket, { roomId: 'room-1', envelope: { contractVersion: STAGE_CONTRACT_VERSION, commandId: 'cmd-1', channelId: 'a', expectedRevision: 1, commandType: 'ACTOR_EXIT', payload: { actorId: 'actor-1' } } });
  assert.equal(ack.outcome, 'APPLIED');
});
