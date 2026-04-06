import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';

const router = Router();

// 获取房间倒计时列表
router.get('/rooms/:roomId/countdowns', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.room.findUnique({
      where: { roomId },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    const countdowns = await prisma.countdown.findMany({
      where: {
        roomId: room.id,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { countdowns },
    });
  } catch (error) {
    next(error);
  }
});

// 创建倒计时
router.post('/rooms/:roomId/countdowns', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { title, duration } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    // 只有KP可以创建倒计时
    const member = room.members.find(m => m.userId === userId);
    if (!member || member.role !== 'KP') {
      throw new AppError('FORBIDDEN', '只有KP可以创建倒计时', 403);
    }

    const countdown = await prisma.countdown.create({
      data: {
        roomId: room.id,
        title,
        duration,
        remaining: duration,
        createdBy: userId,
      },
    });

    res.status(201).json({
      success: true,
      data: { countdown },
    });
  } catch (error) {
    next(error);
  }
});

// 停止倒计时
router.post('/rooms/:roomId/countdowns/:countdownId/stop', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, countdownId } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    const member = room.members.find(m => m.userId === userId);
    if (!member || member.role !== 'KP') {
      throw new AppError('FORBIDDEN', '只有KP可以停止倒计时', 403);
    }

    const countdown = await prisma.countdown.update({
      where: { id: countdownId },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: { countdown },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
