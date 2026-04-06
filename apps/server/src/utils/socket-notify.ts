import type { Server } from 'socket.io';

export function notifyUser(io: Server, userId: string, payload: any) {
  io.to(`user:${userId}`).emit('notification:new', payload);
}

export function notifyMessageUser(io: Server, userId: string, payload: any) {
  io.to(`user:${userId}`).emit('user_message:new', payload);
}
