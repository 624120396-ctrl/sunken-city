import type { Server } from 'socket.io';
import type { AuthenticatedSocket } from '../../../config/socket';
import { handleStageCommand } from './stage.service';

const STAGE_SOCKET_EVENTS = {
  JOIN_CHANNEL: 'stage:channel:join',
  LEAVE_CHANNEL: 'stage:channel:leave',
  COMMAND: 'stage:command',
  COMMAND_ACK: 'stage:command:ack',
  SNAPSHOT: 'stage:snapshot',
  ERROR: 'stage:error',
} as const;

export function setupStageGateway(io: Server) {
  io.on('connection', (socket: AuthenticatedSocket) => {
    socket.on(STAGE_SOCKET_EVENTS.JOIN_CHANNEL, async (data: { roomId: string; channelId: string }) => {
      if (!socket.user?.userId) {
        socket.emit(STAGE_SOCKET_EVENTS.ERROR, { code: 'STAGE_FORBIDDEN', message: '请先登录' });
        return;
      }
      socket.join(`stage:${data.channelId}:user:${socket.user.userId}`);
      socket.emit(STAGE_SOCKET_EVENTS.SNAPSHOT, { channelId: data.channelId, pending: true });
    });

    socket.on(STAGE_SOCKET_EVENTS.LEAVE_CHANNEL, (data: { channelId: string }) => {
      if (socket.user?.userId) socket.leave(`stage:${data.channelId}:user:${socket.user.userId}`);
    });

    socket.on(STAGE_SOCKET_EVENTS.COMMAND, async (data: { roomId: string; envelope: any }) => {
      try {
        if (!socket.user?.userId) {
          socket.emit(STAGE_SOCKET_EVENTS.ERROR, { code: 'STAGE_FORBIDDEN', message: '请先登录' });
          return;
        }
        const ack = await handleStageCommand({
          roomId: data.roomId,
          userId: socket.user.userId,
          nickname: socket.user.nickname,
          envelope: data.envelope,
        });
        socket.emit(STAGE_SOCKET_EVENTS.COMMAND_ACK, ack);
      } catch (error) {
        const appError = error as { code?: string; message?: string };
        socket.emit(STAGE_SOCKET_EVENTS.ERROR, {
          code: appError.code || 'STAGE_INTERNAL_ERROR',
          message: appError.message || '舞台命令处理失败',
        });
      }
    });
  });
}
