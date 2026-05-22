import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';

const router = Router();

// ========== 发送好友请求 ==========
const sendRequestSchema = z.object({
  targetUserId: z.string().uuid(),
  message: z.string().max(200).optional(),
});

router.post('/friends/requests', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { targetUserId, message } = sendRequestSchema.parse(req.body);

    if (userId === targetUserId) {
      throw new AppError('SELF_FRIEND', '不能添加自己为好友', 400);
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    // 检查是否已经是好友
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: targetUserId },
          { userAId: targetUserId, userBId: userId },
        ],
      },
    });
    if (existingFriendship) {
      throw new AppError('ALREADY_FRIENDS', '你们已经是好友了', 400);
    }

    // 检查是否已有请求记录
    const existingRequest = await prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: userId, receiverId: targetUserId } },
    });

    // 检查对方是否已发送请求给我（是的话直接接受）
    const reverseRequest = await prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: targetUserId, receiverId: userId } },
    });
    if (reverseRequest && reverseRequest.status === 'pending') {
      // 直接成为好友
      await prisma.$transaction([
        prisma.friendRequest.update({
          where: { id: reverseRequest.id },
          data: { status: 'accepted', updatedAt: new Date() },
        }),
        prisma.friendship.create({
          data: {
            userAId: userId < targetUserId ? userId : targetUserId,
            userBId: userId < targetUserId ? targetUserId : userId,
          },
        }),
      ]);

      // 发送通知
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'friend_accept',
          title: '好友请求被接受',
          content: `${req.user!.nickname} 接受了你的好友请求`,
        },
      });

      return res.json({ success: true, data: { autoAccepted: true } });
    }

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new AppError('REQUEST_PENDING', '好友请求已发送，请等待对方回应', 400);
      }
      if (existingRequest.status === 'rejected') {
        // 检查冷却期：被拒绝后24小时才能再发
        const hoursSince = (Date.now() - existingRequest.updatedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          throw new AppError('REQUEST_COOLDOWN', '对方拒绝后需等待24小时才能再次发送请求', 429);
        }
        // 更新为 pending
        const updated = await prisma.friendRequest.update({
          where: { id: existingRequest.id },
          data: { status: 'pending', message: message || existingRequest.message, updatedAt: new Date() },
        });

        await prisma.notification.create({
          data: {
            userId: targetUserId,
            type: 'friend_request',
            title: '新的好友请求',
            content: `${req.user!.nickname} 请求添加你为好友`,
          },
        });

        return res.json({ success: true, data: { request: updated } });
      }
    }

    const request = await prisma.friendRequest.create({
      data: {
        senderId: userId,
        receiverId: targetUserId,
        message: message || '',
      },
    });

    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'friend_request',
        title: '新的好友请求',
        content: `${req.user!.nickname} 请求添加你为好友`,
      },
    });

    res.json({ success: true, data: { request } });
  } catch (error) {
    next(error);
  }
});

// ========== 获取好友请求列表 ==========
router.get('/friends/requests', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const direction = req.query.direction as 'sent' | 'received' | undefined;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (direction === 'sent') {
      where.senderId = userId;
    } else if (direction === 'received') {
      where.receiverId = userId;
    } else {
      where.OR = [{ senderId: userId }, { receiverId: userId }];
    }
    if (status) {
      where.status = status;
    }

    const requests = await prisma.friendRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, displayId: true, nickname: true, avatarUrl: true, displayedTitleKey: true } },
        receiver: { select: { id: true, displayId: true, nickname: true, avatarUrl: true, displayedTitleKey: true } },
      },
    });

    res.json({ success: true, data: { requests } });
  } catch (error) {
    next(error);
  }
});

// ========== 接受/拒绝好友请求 ==========
const patchRequestSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
});

router.patch('/friends/requests/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { status } = patchRequestSchema.parse(req.body);

    const request = await prisma.friendRequest.findFirst({
      where: { id, receiverId: userId, status: 'pending' },
    });
    if (!request) {
      throw new AppError('REQUEST_NOT_FOUND', '好友请求不存在或已处理', 404);
    }

    if (status === 'accepted') {
      await prisma.$transaction([
        prisma.friendRequest.update({
          where: { id },
          data: { status: 'accepted', updatedAt: new Date() },
        }),
        prisma.friendship.create({
          data: {
            userAId: request.senderId < request.receiverId ? request.senderId : request.receiverId,
            userBId: request.senderId < request.receiverId ? request.receiverId : request.senderId,
          },
        }),
      ]);

      await prisma.notification.create({
        data: {
          userId: request.senderId,
          type: 'friend_accept',
          title: '好友请求被接受',
          content: `${req.user!.nickname} 接受了你的好友请求`,
        },
      });
    } else {
      await prisma.friendRequest.update({
        where: { id },
        data: { status: 'rejected', updatedAt: new Date() },
      });
    }

    res.json({ success: true, data: { status } });
  } catch (error) {
    next(error);
  }
});

// ========== 删除/撤回好友请求 ==========
router.delete('/friends/requests/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const request = await prisma.friendRequest.findUnique({
      where: { id },
    });
    if (!request) {
      throw new AppError('REQUEST_NOT_FOUND', '好友请求不存在', 404);
    }

    // 验证用户权限：必须是发送者或接收者
    if (request.senderId !== userId && request.receiverId !== userId) {
      throw new AppError('FORBIDDEN', '无权操作此请求', 403);
    }

    // 如果是 pending 状态且删除者是 receiver，改为 rejected（防止骚扰绕过）
    if (request.status === 'pending' && request.receiverId === userId) {
      await prisma.friendRequest.update({
        where: { id },
        data: { status: 'rejected', updatedAt: new Date() },
      });
    } else {
      // 其他情况：发送者撤回或非 pending 状态，执行删除
      await prisma.friendRequest.delete({ where: { id } });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 获取好友列表 ==========
router.get('/friends', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        userA: {
          select: {
            id: true,
            displayId: true,
            nickname: true,
            avatarUrl: true,
            displayedTitleKey: true,
            equippedFrame: true,
            exp: true,
            displayedCharacterId: true,
          },
        },
        userB: {
          select: {
            id: true,
            displayId: true,
            nickname: true,
            avatarUrl: true,
            displayedTitleKey: true,
            equippedFrame: true,
            exp: true,
            displayedCharacterId: true,
          },
        },
      },
    });

    const friends = friendships.map((f) => {
      const isA = f.userAId === userId;
      const friend = isA ? f.userB : f.userA;
      return {
        friendshipId: f.id,
        userId: friend.id,
        displayId: friend.displayId,
        nickname: friend.nickname,
        avatarUrl: friend.avatarUrl,
        displayedTitleKey: friend.displayedTitleKey,
        equippedFrame: friend.equippedFrame,
        exp: friend.exp,
        displayedCharacterId: friend.displayedCharacterId,
        createdAt: f.createdAt,
      };
    });

    res.json({ success: true, data: { friends } });
  } catch (error) {
    next(error);
  }
});

// ========== 查询与某用户的好友关系状态 ==========
router.get('/friends/check/:userId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const targetUserId = req.params.userId;

    if (userId === targetUserId) {
      return res.json({ success: true, data: { status: 'self' } });
    }

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: targetUserId },
          { userAId: targetUserId, userBId: userId },
        ],
      },
    });

    if (friendship) {
      return res.json({ success: true, data: { status: 'friend' } });
    }

    const sentRequest = await prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: userId, receiverId: targetUserId } },
    });
    if (sentRequest?.status === 'pending') {
      return res.json({ success: true, data: { status: 'pending_sent', requestId: sentRequest.id } });
    }
    if (sentRequest?.status === 'rejected') {
      return res.json({ success: true, data: { status: 'rejected', updatedAt: sentRequest.updatedAt } });
    }

    const receivedRequest = await prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: targetUserId, receiverId: userId } },
    });
    if (receivedRequest?.status === 'pending') {
      return res.json({ success: true, data: { status: 'pending_received', requestId: receivedRequest.id } });
    }

    res.json({ success: true, data: { status: 'none' } });
  } catch (error) {
    next(error);
  }
});

// ========== 删除好友 ==========
router.delete('/friends/:userId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { userId: targetUserId } = req.params;

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: targetUserId },
          { userAId: targetUserId, userBId: userId },
        ],
      },
    });
    if (!friendship) {
      throw new AppError('FRIENDSHIP_NOT_FOUND', '好友关系不存在', 404);
    }

    await prisma.friendship.delete({ where: { id: friendship.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 邀请好友进房 ==========
const inviteRoomSchema = z.object({
  roomId: z.string(),
  targetUserId: z.string().uuid(),
});

router.post('/friends/invite-room', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { roomId, targetUserId } = inviteRoomSchema.parse(req.body);

    // 校验是否为好友
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: targetUserId },
          { userAId: targetUserId, userBId: userId },
        ],
      },
    });
    if (!friendship) {
      throw new AppError('NOT_FRIEND', '只能邀请好友', 403);
    }

    const room = await prisma.room.findUnique({ where: { roomId } });
    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'room_invite',
        title: '房间邀请',
        content: `${req.user!.nickname} 邀请你加入房间「${room.name}」`,
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
