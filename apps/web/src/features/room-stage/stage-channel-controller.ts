import type { Socket } from 'socket.io-client';
import { STAGE_SOCKET_EVENTS, type StageCapabilitiesProjection, type StageCommandAck, type StageCommandType, type StageSnapshot, type StageSocketCommandPayload, type StageSocketErrorPayload, type StageStatusProjection } from '../../../../shared/stage/stage-contract';

type StageCommandSocket = Pick<Socket, 'emit' | 'on' | 'off'>;

/** The frozen contract delivers command results on stage:command:ack, not a Socket.IO callback. */
export function sendStageCommand(socket: StageCommandSocket, payload: StageSocketCommandPayload) {
  return new Promise<StageCommandAck>((resolve, reject) => {
    const cleanup = () => {
      socket.off(STAGE_SOCKET_EVENTS.COMMAND_ACK, onAck);
      socket.off(STAGE_SOCKET_EVENTS.ERROR, onError);
    };
    const onAck = (ack: StageCommandAck) => {
      if (ack.commandId !== payload.envelope.commandId) return;
      cleanup();
      resolve(ack);
    };
    const onError = (error: StageSocketErrorPayload) => {
      cleanup();
      reject(new Error(error.message));
    };
    socket.on(STAGE_SOCKET_EVENTS.COMMAND_ACK, onAck);
    socket.on(STAGE_SOCKET_EVENTS.ERROR, onError);
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
