import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fromFile } from 'file-type';
import { authMiddleware } from '../../middleware/auth';
import { uploadMiddleware, ensureUploadDir } from '../../config/upload';
import { uploadRateLimit } from '../../middleware/rate-limit';

const router = Router();
const prisma = new PrismaClient();

ensureUploadDir();

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

/**
 * POST /api/uploads
 * 上传文件
 */
router.post('/uploads', authMiddleware, uploadRateLimit, uploadMiddleware.single('file'), async (req: any, res) => {
  try {
    const userId = req.user!.userId;

    if (!req.file) {
      return res.status(400).json({ success: false, message: '未提供文件' });
    }

    const tempPath = req.file.path;

    // 1. 读取文件头魔数校验真实 MIME 类型
    const detected = await fromFile(tempPath);
    if (!detected || !ALLOWED_MIMES.includes(detected.mime)) {
      // 校验失败，立即删除已上传的临时文件
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: '不支持的文件类型，仅允许 jpg, png, gif, webp 图片',
        },
      });
    }

    // 2. 服务端重命名为 UUID + 安全扩展名，彻底剥离 originalname
    const safeExt = MIME_TO_EXT[detected.mime];
    const newFilename = `${crypto.randomUUID()}${safeExt}`;
    const destDir = path.dirname(tempPath);
    const newPath = path.join(destDir, newFilename);

    // 重命名物理文件
    fs.renameSync(tempPath, newPath);

    // 计算相对路径和访问 URL
    const relativePath = path.relative(
      path.join(process.cwd(), 'public'),
      newPath
    ).replace(/\\/g, '/');
    const url = `/${relativePath}`;

    // 3. 存入数据库
    const upload = await prisma.upload.create({
      data: {
        userId,
        originalName: req.file.originalname, // 保留原始名称供前端展示，物理文件已安全重命名
        filename: newFilename,
        mimeType: detected.mime,
        size: fs.statSync(newPath).size,
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

    // 删除物理文件（安全路径拼接）
    const filePath = path.resolve(process.cwd(), 'public', upload.url.replace(/^\//, ''));
    const publicRoot = path.resolve(process.cwd(), 'public');
    if (filePath.startsWith(publicRoot + path.sep) && fs.existsSync(filePath)) {
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
