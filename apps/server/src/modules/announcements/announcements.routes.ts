import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/announcements
 * 获取公告列表（仅返回已发布、按置顶和时间排序）
 */
router.get('/announcements', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where: { isActive: true },
        orderBy: [
          { isPinned: 'desc' },
          { publishedAt: 'desc' },
        ],
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          isPinned: true,
          publishedAt: true,
        },
      }),
      prisma.announcement.count({ where: { isActive: true } }),
    ]);

    res.json({
      success: true,
      data: {
        announcements,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('获取公告列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /api/announcements/:id
 * 获取公告详情
 */
router.get('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await prisma.announcement.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        title: true,
        content: true,
        isPinned: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }

    res.json({
      success: true,
      data: { announcement },
    });
  } catch (error) {
    console.error('获取公告详情失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
