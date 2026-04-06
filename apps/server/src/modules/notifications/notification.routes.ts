import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/notifications
 * 获取当前用户通知列表
 */
router.get('/notifications', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 20));

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    res.json({
      success: true,
      data: { notifications, unreadCount },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * 标记单条通知已读
 */
router.patch('/notifications/:id/read', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/notifications/read-all
 * 标记全部通知已读
 */
router.patch('/notifications/read-all', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.user!.userId;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/notifications/unread-count
 * 获取未读通知数量
 */
router.get('/notifications/unread-count', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.user!.userId;
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/notifications/:id
 * 删除单条通知（系统通知不可删除）
 */
router.delete('/notifications/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existing = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '通知不存在' });
    }

    if (existing.isSystem) {
      return res.status(403).json({ success: false, message: '系统通知不可删除' });
    }

    await prisma.notification.deleteMany({
      where: { id, userId },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
