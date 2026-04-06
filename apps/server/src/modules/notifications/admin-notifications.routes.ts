import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/admin';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware, adminMiddleware);

/**
 * POST /api/admin/notifications/broadcast
 * 发送系统通知（全服广播或指定用户）
 */
router.post('/notifications/broadcast', async (req: any, res, next) => {
  try {
    const { title, content, link, userIds } = req.body;
    const io = req.app.get('io') as import('socket.io').Server | undefined;

    if (!title) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }

    let targetUserIds: string[] = userIds || [];

    // 未指定用户则全服广播
    if (targetUserIds.length === 0) {
      const allUsers = await prisma.user.findMany({ select: { id: true } });
      targetUserIds = allUsers.map((u) => u.id);
    }

    const notifications = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const uid of targetUserIds) {
        const n = await tx.notification.create({
          data: {
            userId: uid,
            type: 'system_announcement',
            title,
            content,
            link,
            isSystem: true,
          },
        });
        created.push(n);
      }
      return created;
    });

    // Socket 推送
    if (io) {
      const { notifyUser } = await import('../../utils/socket-notify');
      for (const n of notifications) {
        notifyUser(io, n.userId, n);
      }
    }

    res.json({
      success: true,
      message: `已发送 ${notifications.length} 条系统通知`,
      data: { sentCount: notifications.length },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
