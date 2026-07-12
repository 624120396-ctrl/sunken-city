import type { Socket } from 'socket.io-client';
import { STAGE_SOCKET_EVENTS, type StageCapabilitiesProjection, type StageCommandAck, type StageCommandType, type StageSnapshot, type StageSocketCommandPayload, type StageSocketErrorPayload, type StageStatusProjection } from '../../../../shared/stage/stage-contract';

type StageCommandSocket = Pick<Socket, 'emit' | 'on' | 'off'>;

export const STAGE_COMMAND_TIMEOUT_MS = 10_000;

export type StageCommandTransportOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
};

/** The frozen contract delivers command results on stage:command:ack, not a Socket.IO callback. */
export function sendStageCommand(socket: StageCommandSocket, payload: StageSocketCommandPayload, options: StageCommandTransportOptions = {}) {
  return new Promise<StageCommandAck>((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      socket.off(STAGE_SOCKET_EVENTS.COMMAND_ACK, onAck);
      socket.off(STAGE_SOCKET_EVENTS.ERROR, onError);
      socket.off('disconnect', onDisconnect);
      options.signal?.removeEventListener('abort', onAbort);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const succeed = (ack: StageCommandAck) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(ack);
    };
    const onAck = (ack: StageCommandAck) => {
      if (ack.commandId !== payload.envelope.commandId) return;
      succeed(ack);
    };
    const onError = (error: StageSocketErrorPayload) => {
      if (error.commandId !== payload.envelope.commandId) return;
      fail(new Error(error.message));
    };
    const onDisconnect = () => fail(new Error('舞台连接已断开'));
    const onAbort = () => fail(new Error('舞台命令已取消'));
    socket.on(STAGE_SOCKET_EVENTS.COMMAND_ACK, onAck);
    socket.on(STAGE_SOCKET_EVENTS.ERROR, onError);
    socket.on('disconnect', onDisconnect);
    options.signal?.addEventListener('abort', onAbort, { once: true });
    if (options.signal?.aborted) return onAbort();
    timeout = setTimeout(() => fail(new Error('舞台命令响应超时')), options.timeoutMs ?? STAGE_COMMAND_TIMEOUT_MS);
    socket.emit(STAGE_SOCKET_EVENTS.COMMAND, payload);
  });
}

export function isStageUsable(status: StageStatusProjection | undefined) {
  return Boolean(status?.stageEnabled && status.enabled && status.capabilities.canUseStage);
}

export function selectActiveChannel(status: StageStatusProjection, current?: string) {
  if (!isStageUsable(status)) return undefined;
  return status.channels.some((entry) => entry.channel.id === current && entry.status === 'ACTIVE')
    ? current
    : status.channels.find((entry) => entry.status === 'ACTIVE')?.channel.id;
}

export function selectNewerSnapshot(current: StageSnapshot | undefined, next: StageSnapshot) {
  if (!current || next.channel.id !== current.channel.id || next.revision <= current.revision) return undefined;
  return next;
}

/** Accept an HTTP authority snapshot without allowing a same-channel rollback. */
export function acceptAuthoritativeSnapshot(current: StageSnapshot | undefined, next: StageSnapshot) {
  if (!current) return next;
  if (current.channel.id !== next.channel.id || next.revision < current.revision) return undefined;
  return next;
}

export function canDispatchStageCommand(capabilities: StageCapabilitiesProjection, commandType: StageCommandType) {
  if (!capabilities.canUseStage) return false;
  if (commandType === 'ACTOR_ENTER' || commandType === 'ACTOR_EXIT' || commandType === 'ACTOR_PERFORM') return capabilities.canControlOwnStageActor || capabilities.canManageStage;
  return capabilities.canManageStage;
}
