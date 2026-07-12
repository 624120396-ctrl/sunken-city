import type { Server } from 'socket.io';
import type { AuthenticatedSocket } from '../../../config/socket';
import { STAGE_SOCKET_EVENTS } from '../../../generated/stage-socket-events';
import { getStageEventForCommand, getStageSnapshot, handleStageCommand } from './stage.service';

export function emitStageEvent(io: Pick<Server, 'to'>, event: { channelId: string; visibility: string; targetUserIds: string[] }) {
  if (event.visibility !== 'PUBLIC') {
    for (const userId of event.targetUserIds) io.to(`stage:${event.channelId}:user:${userId}`).emit(STAGE_SOCKET_EVENTS.EVENT, event);
    return;
  }
  io.to(`stage:${event.channelId}`).emit(STAGE_SOCKET_EVENTS.EVENT, event);
}

export function buildStageCommandError(error: unknown, commandId: unknown) {
  const appError = error as { code?: string; message?: string };
  return {
    code: appError.code || 'STAGE_INTERNAL_ERROR',
    message: appError.message || '舞台命令处理失败',
    ...(typeof commandId === 'string' ? { commandId } : {}),
  };
}

export function setupStageGateway(io: Server) {
  io.on('connection', (socket: AuthenticatedSocket) => {
    socket.on(STAGE_SOCKET_EVENTS.JOIN_CHANNEL, async (data: { roomId: string; channelId: string }) => {
      try {
        if (!socket.user?.userId) {
          socket.emit(STAGE_SOCKET_EVENTS.ERROR, { code: 'STAGE_FORBIDDEN', message: '请先登录' });
          return;
        }
        const snapshot = await getStageSnapshot({ roomId: data.roomId, channelId: data.channelId, userId: socket.user.userId });
        socket.join(`stage:${data.channelId}`);
        socket.join(`stage:${data.channelId}:user:${socket.user.userId}`);
        socket.emit(STAGE_SOCKET_EVENTS.SNAPSHOT, snapshot);
      } catch (error) {
        const appError = error as { code?: string; message?: string };
        socket.emit(STAGE_SOCKET_EVENTS.ERROR, { code: appError.code || 'STAGE_INTERNAL_ERROR', message: appError.message || '舞台快照获取失败' });
      }
    });

    socket.on(STAGE_SOCKET_EVENTS.LEAVE_CHANNEL, (data: { channelId: string }) => {
      socket.leave(`stage:${data.channelId}`);
      if (socket.user?.userId) socket.leave(`stage:${data.channelId}:user:${socket.user.userId}`);
    });

    socket.on(STAGE_SOCKET_EVENTS.COMMAND, async (data: { roomId: string; envelope: any }) => {
      try {
        if (!socket.user?.userId) {
          socket.emit(STAGE_SOCKET_EVENTS.ERROR, { code: 'STAGE_FORBIDDEN', message: '请先登录', ...(typeof data?.envelope?.commandId === 'string' ? { commandId: data.envelope.commandId } : {}) });
          return;
        }
        const ack = await handleStageCommand({
          roomId: data.roomId,
          userId: socket.user.userId,
          nickname: socket.user.nickname,
          envelope: data.envelope,
        });
        socket.emit(STAGE_SOCKET_EVENTS.COMMAND_ACK, ack);
        if (ack.accepted && ack.outcome === 'APPLIED') {
          const event = await getStageEventForCommand({ channelId: ack.channelId, commandId: ack.commandId });
          if (event) emitStageEvent(io, event);
        }
      } catch (error) {
        socket.emit(STAGE_SOCKET_EVENTS.ERROR, buildStageCommandError(error, data?.envelope?.commandId));
      }
    });
  });
}
