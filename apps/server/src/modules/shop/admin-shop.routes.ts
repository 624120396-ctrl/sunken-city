import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/admin';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware, adminMiddleware);

/**
 * GET /api/admin/shop/items
 * 获取所有商品（含下架）
 */
router.get('/shop/items', async (req, res) => {
  try {
    const { page = '1', limit = '50', category, isActive } = req.query;
    const where: any = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [items, total] = await Promise.all([
      prisma.shopItem.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      prisma.shopItem.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items, total, pagination: { page: parseInt(page as string), limit: take, totalPages: Math.ceil(total / take) } },
    });
  } catch (error) {
    console.error('获取商品列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * POST /api/admin/shop/items
 * 创建商品
 */
router.post('/shop/items', async (req, res) => {
  try {
    const { key, name, description, category, price, currency, rarity, iconUrl, sortOrder } = req.body;

    const existing = await prisma.shopItem.findUnique({
      where: { key },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: '商品标识已存在' });
    }

    const item = await prisma.shopItem.create({
      data: {
        key,
        name,
        description,
        category,
        price: parseInt(price) || 0,
        currency: currency || 'coin',
        rarity: rarity || 'common',
        iconUrl,
        sortOrder: parseInt(sortOrder) || 0,
      },
    });

    res.json({ success: true, message: '商品创建成功', data: { item } });
  } catch (error) {
    console.error('创建商品失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * PUT /api/admin/shop/items/:id
 * 更新商品
 */
router.put('/shop/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, price, currency, rarity, iconUrl, sortOrder, isActive } = req.body;

    const item = await prisma.shopItem.update({
      where: { id },
      data: {
        name,
        description,
        category,
        price: price !== undefined ? parseInt(price) : undefined,
        currency,
        rarity,
        iconUrl,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : undefined,
        isActive,
      },
    });

    res.json({ success: true, message: '商品更新成功', data: { item } });
  } catch (error) {
    console.error('更新商品失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * DELETE /api/admin/shop/items/:id
 * 删除商品
 */
router.delete('/shop/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.shopItem.delete({ where: { id } });
    res.json({ success: true, message: '商品删除成功' });
  } catch (error) {
    console.error('删除商品失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * POST /api/admin/users/:userId/currency/adjust
 * 调整用户货币（锈蚀硬币 / 虚银）
 */
router.post('/users/:userId/currency/adjust', async (req, res) => {
  try {
    const { userId } = req.params;
    const { coins, stardust, reason } = req.body;
    const adminId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true, coins: true, stardust: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const updateData: any = {};
    if (coins !== undefined) {
      const newCoins = Math.max(0, user.coins + parseInt(coins));
      updateData.coins = newCoins;
    }
    if (stardust !== undefined) {
      const newStardust = Math.max(0, user.stardust + parseInt(stardust));
      updateData.stardust = newStardust;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { coins: true, stardust: true },
    });

    res.json({
      success: true,
      message: '货币已调整',
      data: {
        oldCoins: user.coins,
        oldStardust: user.stardust,
        newCoins: updated.coins,
        newStardust: updated.stardust,
        reason,
        changedBy: adminId,
      },
    });
  } catch (error) {
    console.error('调整货币失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
