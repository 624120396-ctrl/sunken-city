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
  const socket = new FakeStageSocket();
  const pending = sendStageCommand(socket as any, command('cmd-1'), { timeoutMs: 50 });
  assert.deepEqual(socket.emitted[0], [STAGE_SOCKET_EVENTS.COMMAND, command('cmd-1')]);
  socket.receive(STAGE_SOCKET_EVENTS.COMMAND_ACK, ack('cmd-1'));
  const result = await pending;
  assert.equal(result.outcome, 'APPLIED');
  assert.equal(socket.listenerCount(), 0);
});

test('keeps concurrent commands isolated from unrelated stage errors and acknowledgements', async () => {
  const socket = new FakeStageSocket();
  const first = sendStageCommand(socket as any, command('cmd-1'), { timeoutMs: 100 });
  const second = sendStageCommand(socket as any, command('cmd-2'), { timeoutMs: 100 });
  socket.receive(STAGE_SOCKET_EVENTS.ERROR, { code: 'STAGE_FORBIDDEN', message: 'other command', commandId: 'cmd-other' });
  socket.receive(STAGE_SOCKET_EVENTS.COMMAND_ACK, ack('cmd-1'));
  assert.equal((await first).commandId, 'cmd-1');
  socket.receive(STAGE_SOCKET_EVENTS.ERROR, { code: 'STAGE_FORBIDDEN', message: 'denied', commandId: 'cmd-2' });
  await assert.rejects(second, /denied/);
  assert.equal(socket.listenerCount(), 0);
});

test('cleans up a pending command on timeout, disconnect, and abort signal', async () => {
  const timeoutSocket = new FakeStageSocket();
  await assert.rejects(sendStageCommand(timeoutSocket as any, command('cmd-timeout'), { timeoutMs: 5 }), /超时/);
  assert.equal(timeoutSocket.listenerCount(), 0);

  const disconnectSocket = new FakeStageSocket();
  const disconnectPending = sendStageCommand(disconnectSocket as any, command('cmd-disconnect'), { timeoutMs: 100 });
  disconnectSocket.receive('disconnect');
  await assert.rejects(disconnectPending, /连接已断开/);
  assert.equal(disconnectSocket.listenerCount(), 0);

  const abortSocket = new FakeStageSocket();
  const controller = new AbortController();
  const abortPending = sendStageCommand(abortSocket as any, command('cmd-unmount'), { timeoutMs: 100, signal: controller.signal });
  controller.abort();
  await assert.rejects(abortPending, /已取消/);
  assert.equal(abortSocket.listenerCount(), 0);
});

function command(commandId: string) {
  return { roomId: 'room-1', envelope: { contractVersion: STAGE_CONTRACT_VERSION, commandId, channelId: 'a', expectedRevision: 1, commandType: 'ACTOR_EXIT' as const, payload: { actorId: 'actor-1' } } };
}

function ack(commandId: string) {
  return { contractVersion: STAGE_CONTRACT_VERSION, accepted: true as const, outcome: 'APPLIED' as const, commandId, channelId: 'a', revision: 2 };
}

class FakeStageSocket {
  listeners = new Map<string, Set<(payload?: any) => void>>();
  emitted: Array<[string, any]> = [];

  on(event: string, listener: (payload?: any) => void) {
    const current = this.listeners.get(event) ?? new Set();
    current.add(listener);
    this.listeners.set(event, current);
    return this;
  }

  off(event: string, listener: (payload?: any) => void) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, payload: any) {
    this.emitted.push([event, payload]);
    return this;
  }

  receive(event: string, payload?: any) {
    for (const listener of this.listeners.get(event) ?? []) listener(payload);
  }

  listenerCount() {
    return [...this.listeners.values()].reduce((count, listeners) => count + listeners.size, 0);
  }
}
