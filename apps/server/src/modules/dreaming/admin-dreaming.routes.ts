import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/admin';
import { prisma } from '../../config/database';
import { z } from 'zod';

const router = Router();

/**
 * 获取溺者之牌列表
 * GET /api/admin/dream-cards
 */
router.get('/dream-cards', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const cards = await prisma.dreamCard.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: { cards },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 更新溺者之牌
 * PATCH /api/admin/dream-cards/:id
 */
const updateDreamCardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
  imageUrl: z.string().max(1000).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

router.patch('/dream-cards/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = updateDreamCardSchema.parse(req.body);

    const card = await prisma.dreamCard.update({
      where: { id },
      data: payload,
    });

    res.json({
      success: true,
      data: { card },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
