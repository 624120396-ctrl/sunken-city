import { PrismaClient } from '@prisma/client';
import type { Server } from 'socket.io';
import { notifyUser } from '../../utils/socket-notify';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  content?: string;
  link?: string;
  postId?: string;
  replyId?: string;
  isSystem?: boolean;
}

export async function createNotification(
  prisma: PrismaClient,
  io: Server | null | undefined,
  input: CreateNotificationInput
) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      content: input.content,
      link: input.link,
      postId: input.postId,
      replyId: input.replyId,
      isSystem: input.isSystem ?? false,
    },
  });

  if (io) {
    notifyUser(io, input.userId, notification);
  }

  return notification;
}
