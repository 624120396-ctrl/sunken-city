import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/admin';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/admin/announcements
 * 获取全部公告（管理端）
 */
router.get('/announcements', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        orderBy: [
          { isPinned: 'desc' },
          { publishedAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.announcement.count(),
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
 * POST /api/admin/announcements
 * 创建公告
 */
router.post('/announcements', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, content, isPinned, isActive, publishedAt } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: '标题和内容不能为空' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: String(title).trim(),
        content: String(content).trim(),
        isPinned: Boolean(isPinned),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: { announcement },
    });
  } catch (error) {
    console.error('创建公告失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * PATCH /api/admin/announcements/:id
 * 更新公告
 */
router.patch('/announcements/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, isPinned, isActive, publishedAt } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = String(title).trim();
    if (content !== undefined) updateData.content = String(content).trim();
    if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (publishedAt !== undefined) updateData.publishedAt = new Date(publishedAt);

    const announcement = await prisma.announcement.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: { announcement },
    });
  } catch (error) {
    console.error('更新公告失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * DELETE /api/admin/announcements/:id
 * 删除公告
 */
router.delete('/announcements/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.announcement.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '公告已删除',
    });
  } catch (error) {
    console.error('删除公告失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
