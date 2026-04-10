import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { io } from '../../index';

const router = Router();

// 获取私聊消息
router.get('/rooms/:roomId/private-messages', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: {
        members: {
          where: { userId },
          include: { character: true },
        },
      },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    const myMember = room.members[0];
    if (!myMember?.character || myMember.leftAt || myMember.joinStatus !== 'approved') {
      throw new AppError('NO_CHARACTER', '请先加入房间并选择角色', 400);
    }

    const characterId = myMember.character.id;

    // 获取发送和接收的私聊消息
    const messages = await prisma.privateMessage.findMany({
      where: {
        roomId: room.id,
        OR: [
          { senderId: characterId },
          { receiverId: characterId },
        ],
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    // 标记为已读
    await prisma.privateMessage.updateMany({
      where: {
        roomId: room.id,
        receiverId: characterId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    next(error);
  }
});

// 发送私聊消息
router.post('/rooms/:roomId/private-messages', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { receiverCharacterId, content } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: {
        members: {
          where: { userId },
          include: { character: true },
        },
      },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    const myMember = room.members[0];
    if (!myMember?.character || myMember.leftAt || myMember.joinStatus !== 'approved') {
      throw new AppError('NO_CHARACTER', '请先加入房间并选择角色', 400);
    }

    const senderId = myMember.character.id;

    // 验证接收者是否在同一房间且为有效成员
    const receiverMember = await prisma.roomMember.findFirst({
      where: {
        roomId: room.id,
        characterId: receiverCharacterId,
        leftAt: null,
        joinStatus: 'approved',
      },
    });

    if (!receiverMember) {
      throw new AppError('RECEIVER_NOT_FOUND', '接收者不在房间中或尚未通过审核', 404);
    }

    const message = await prisma.privateMessage.create({
      data: {
        roomId: room.id,
        senderId,
        receiverId: receiverCharacterId,
        content,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Socket 实时推送给接收者（按 userId + roomId 匹配在线 socket）
    const receiverUserId = receiverMember.userId;
    io.sockets.sockets.forEach((s: any) => {
      if (s.user?.userId === receiverUserId && s.rooms.has(roomId)) {
        s.emit('private_message:received', { roomId, message });
      }
    });

    res.status(201).json({
      success: true,
      data: { message },
    });
  } catch (error) {
    next(error);
  }
});

// 获取未读私聊数量
router.get('/rooms/:roomId/private-messages/unread', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: {
        members: {
          where: { userId },
          include: { character: true },
        },
      },
    });

    if (!room || !room.members[0]?.character || room.members[0].leftAt || room.members[0].joinStatus !== 'approved') {
      return res.json({ success: true, data: { count: 0 } });
    }

    const count = await prisma.privateMessage.count({
      where: {
        roomId: room.id,
        receiverId: room.members[0].character.id,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
