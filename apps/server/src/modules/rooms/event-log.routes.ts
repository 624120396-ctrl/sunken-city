import { Router } from 'express';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { requireRoomCapability } from './room-auth';

const router = Router();

// 写入事件日志（内部用，KP也可手动添加）
router.post('/:roomId/events', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { eventType, payload, isSecret, phaseId, sceneId } = req.body;

    const { room } = await requireRoomCapability(roomId, req.userId, 'canSendPublicMessage');
    if (isSecret) {
      await requireRoomCapability(roomId, req.userId, 'canUseKPTools');
    }

    const event = await prisma.roomEventLog.create({
      data: {
        roomId: room.id,
        eventType,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
        isSecret: isSecret || false,
        phaseId,
        sceneId,
        userId: req.userId,
      },
    });

    res.status(201).json({ success: true, data: { event } });
  } catch (error) {
    next(error);
  }
});

// 获取事件日志（KP 可看全部，PL 只能看非 secret）
router.get('/:roomId/events', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { eventType, limit = '50', offset = '0' } = req.query;

    const { room, capabilities } = await requireRoomCapability(roomId, req.userId, 'canViewPublicContent');
    const canViewSecret = capabilities.canViewSecretEvents;
    const take = Math.min(parseInt(limit as string) || 50, 200);
    const skip = parseInt(offset as string) || 0;

    const where: any = {
      roomId: room.id,
      ...(eventType && { eventType: eventType as string }),
      ...(!canViewSecret && { isSecret: false }),
    };

    const [events, total] = await Promise.all([
      prisma.roomEventLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.roomEventLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        events,
        pagination: { total, limit: take, offset: skip },
      },
    });
  } catch (error) {
    next(error);
  }
});

// 获取事件摘要（按类型分组统计）
router.get('/:roomId/events/summary', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;

    const { room, capabilities } = await requireRoomCapability(roomId, req.userId, 'canViewPublicContent');

    const events = await prisma.roomEventLog.groupBy({
      by: ['eventType'],
      where: { roomId: room.id, ...(!capabilities.canViewSecretEvents && { isSecret: false }) },
      _count: { eventType: true },
    });

    res.json({
      success: true,
      data: {
        summary: events.map(e => ({
          eventType: e.eventType,
          count: e._count.eventType,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
