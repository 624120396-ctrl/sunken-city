import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../../middleware/auth';
import { uploadMiddleware, ensureUploadDir } from '../../config/upload';

const router = Router();
const prisma = new PrismaClient();

ensureUploadDir();

/**
 * POST /api/uploads
 * 上传文件
 */
router.post('/uploads', authMiddleware, uploadMiddleware.single('file'), async (req: any, res) => {
  try {
    const userId = req.user!.userId;

    if (!req.file) {
      return res.status(400).json({ success: false, message: '未提供文件' });
    }

    const { originalname, filename, mimetype, size } = req.file;
    const relativePath = path.relative(
      path.join(process.cwd(), 'public'),
      req.file.path
    ).replace(/\\/g, '/');
    const url = `/${relativePath}`;

    const upload = await prisma.upload.create({
      data: {
        userId,
        originalName: originalname,
        filename,
        mimeType: mimetype,
        size,
        url,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: upload.id,
        url: upload.url,
        originalName: upload.originalName,
        size: upload.size,
        mimeType: upload.mimeType,
      },
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ success: false, message: '上传失败' });
  }
});

/**
 * GET /api/uploads
 * 获取当前用户上传记录
 */
router.get('/uploads', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [uploads, total] = await Promise.all([
      prisma.upload.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          url: true,
          originalName: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      }),
      prisma.upload.count({ where: { userId } }),
    ]);

    res.json({
      success: true,
      data: {
        uploads,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('获取上传记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * DELETE /api/uploads/:id
 * 删除上传的文件（仅本人）
 */
router.delete('/uploads/:id', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const upload = await prisma.upload.findFirst({
      where: { id, userId },
    });

    if (!upload) {
      return res.status(404).json({ success: false, message: '文件不存在或无权限' });
    }

    // 删除物理文件
    const filePath = path.join(process.cwd(), 'public', upload.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.upload.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '文件已删除',
    });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
