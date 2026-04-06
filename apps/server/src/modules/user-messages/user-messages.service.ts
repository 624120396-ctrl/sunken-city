import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MessagePayload {
  senderId: string;
  receiverId: string;
  content: string;
}

export async function createUserMessage(payload: MessagePayload) {
  return prisma.userMessage.create({
    data: payload,
    include: {
      sender: { select: { id: true, nickname: true, avatarUrl: true } },
      receiver: { select: { id: true, nickname: true, avatarUrl: true } },
    },
  });
}

export async function getConversationList(userId: string) {
  const messages = await prisma.userMessage.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, nickname: true, avatarUrl: true } },
      receiver: { select: { id: true, nickname: true, avatarUrl: true } },
    },
  });

  // 按对话分组，取最后一条
  const conversationMap = new Map<
    string,
    {
      partnerId: string;
      partner: { id: string; nickname: string; avatarUrl?: string | null };
      lastMessage: typeof messages[0];
      unreadCount: number;
    }
  >();

  for (const msg of messages) {
    const isMe = msg.senderId === userId;
    const partnerId = isMe ? msg.receiverId : msg.senderId;
    const partner = isMe ? msg.receiver : msg.sender;

    if (!conversationMap.has(partnerId)) {
      const unreadCount = await prisma.userMessage.count({
        where: { senderId: partnerId, receiverId: userId, isRead: false },
      });
      conversationMap.set(partnerId, {
        partnerId,
        partner,
        lastMessage: msg,
        unreadCount,
      });
    }
  }

  return Array.from(conversationMap.values()).sort(
    (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
  );
}

export async function getMessagesBetween(userId: string, partnerId: string, limit = 50) {
  const messages = await prisma.userMessage.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      sender: { select: { id: true, nickname: true, avatarUrl: true } },
      receiver: { select: { id: true, nickname: true, avatarUrl: true } },
    },
  });

  // 标记对方发给我的为已读
  await prisma.userMessage.updateMany({
    where: {
      senderId: partnerId,
      receiverId: userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return messages.reverse();
}

export async function markMessageAsRead(messageId: string, userId: string) {
  return prisma.userMessage.updateMany({
    where: { id: messageId, receiverId: userId },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.userMessage.count({
    where: { receiverId: userId, isRead: false },
  });
}
