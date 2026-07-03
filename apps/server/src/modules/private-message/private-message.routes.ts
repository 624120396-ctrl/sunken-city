import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { capabilitiesFor, deriveLifecycle, deriveRoomRole } from '../rooms/room-auth';

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
          where: { userId, leftAt: null },
          include: { character: true },
        },
        roomRun: {
          select: { lifecycle: true },
        },
      },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    const myMember = room.members[0];
    if (myMember?.role !== 'PLAYER' || !myMember.characterId || !myMember.character) {
      throw new AppError('NO_CHARACTER', '请先选择角色', 400);
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

    if (typeof receiverCharacterId !== 'string' || !receiverCharacterId.trim()) {
      throw new AppError('INVALID_RECEIVER', '接收者无效', 400);
    }
    const normalizedReceiverCharacterId = receiverCharacterId.trim();

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: {
        members: {
          where: { userId, leftAt: null },
          include: { character: true },
        },
        roomRun: {
          select: { lifecycle: true },
        },
      },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    const myMember = room.members[0];
    const lifecycle = deriveLifecycle(room.status, room.roomRun?.lifecycle);
    const role = deriveRoomRole({ creatorId: room.creatorId, userId, member: myMember || null });
    const capabilities = capabilitiesFor(role, lifecycle);

    if (!capabilities.canSendPrivateMessage) {
      throw new AppError('FORBIDDEN', '你没有发送私聊消息的权限', 403);
    }

    if (myMember?.role !== 'PLAYER' || !myMember.characterId || !myMember.character) {
      throw new AppError('NO_CHARACTER', '请先选择角色', 400);
    }

    const senderId = myMember.character.id;

    // 验证接收者是否在同一房间
    const receiverMember = await prisma.roomMember.findFirst({
      where: {
        roomId: room.id,
        characterId: normalizedReceiverCharacterId,
        role: 'PLAYER',
        leftAt: null,
      },
    });

    if (!receiverMember) {
      throw new AppError('RECEIVER_NOT_FOUND', '接收者不在房间中', 404);
    }

    const message = await prisma.privateMessage.create({
      data: {
        roomId: room.id,
        senderId,
        receiverId: normalizedReceiverCharacterId,
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
          where: { userId, leftAt: null },
          include: { character: true },
        },
      },
    });

    const myMember = room?.members[0];
    if (!room || myMember?.role !== 'PLAYER' || !myMember.characterId || !myMember.character) {
      return res.json({ success: true, data: { count: 0 } });
    }

    const count = await prisma.privateMessage.count({
      where: {
        roomId: room.id,
        receiverId: myMember.character.id,
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
