import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

async function getFrameUrl(frameKey: string | null): Promise<string | null> {
  if (!frameKey) return null;
  const item = await prisma.shopItem.findUnique({
    where: { key: frameKey },
    select: { iconUrl: true },
  });
  return item?.iconUrl || null;
}

/**
 * GET /api/shop/items
 * 获取商店商品列表
 */
router.get('/shop/items', async (req, res) => {
  try {
    const { category } = req.query;
    const where: any = { isActive: true };
    if (category) where.category = category;

    const items = await prisma.shopItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        category: true,
        price: true,
        currency: true,
        rarity: true,
        iconUrl: true,
      },
    });

    res.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    console.error('获取商店商品失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * POST /api/shop/items/:key/purchase
 * 购买商品
 */
router.post('/shop/items/:key/purchase', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user!.userId;
    const { key } = req.params;
    const { quantity = 1 } = req.body;
    const qty = Math.max(1, Math.min(10, parseInt(quantity) || 1));

    const item = await prisma.shopItem.findUnique({
      where: { key },
    });

    if (!item || !item.isActive) {
      return res.status(404).json({ success: false, message: '商品不存在或已下架' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true, stardust: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const totalPrice = item.price * qty;
    if (item.currency === 'coin' && user.coins < totalPrice) {
      return res.status(400).json({ success: false, message: '锈蚀硬币不足' });
    }
    if (item.currency === 'stardust' && user.stardust < totalPrice) {
      return res.status(400).json({ success: false, message: '虚银不足' });
    }

    await prisma.$transaction(async (tx) => {
      // 扣款
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(item.currency === 'coin'
            ? { coins: { decrement: totalPrice } }
            : { stardust: { decrement: totalPrice } }),
        },
      });

      // 印记类商品：解锁印记
      if (item.category === 'title') {
        const existingTitle = await tx.userTitle.findUnique({
          where: { userId_titleKey: { userId, titleKey: key } },
        });
        if (!existingTitle) {
          await tx.userTitle.create({
            data: { userId, titleKey: key, unlockedBy: 'shop' },
          });
        }
      }

      // 加入背包
      const existing = await tx.userInventory.findUnique({
        where: { userId_itemKey: { userId, itemKey: key } },
      });

      if (existing) {
        await tx.userInventory.update({
          where: { id: existing.id },
          data: { quantity: { increment: qty } },
        });
      } else {
        await tx.userInventory.create({
          data: { userId, itemKey: key, quantity: qty },
        });
      }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        exp: true,
        displayedTitleKey: true,
        isAdmin: true,
        coins: true,
        stardust: true,
        equippedFrame: true,
      },
    });

    const frameUrl = await getFrameUrl(updatedUser?.equippedFrame || null);

    res.json({
      success: true,
      message: '购买成功',
      data: {
        itemKey: key,
        quantity: qty,
        totalPrice,
        currency: item.currency,
        user: updatedUser ? { ...updatedUser, frameUrl } : null,
      },
    });
  } catch (error) {
    console.error('购买商品失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /api/shop/inventory
 * 获取当前用户背包（合并 UserInventory + UserTitle 中的印记）
 */
router.get('/shop/inventory', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user!.userId;

    const [inventory, userTitles] = await Promise.all([
      prisma.userInventory.findMany({
        where: { userId },
        orderBy: { purchasedAt: 'desc' },
      }),
      prisma.userTitle.findMany({
        where: { userId },
        include: { titleConfig: true },
        orderBy: { unlockedAt: 'desc' },
      }),
    ]);

    const itemKeys = inventory.map((i) => i.itemKey);
    const items = await prisma.shopItem.findMany({
      where: { key: { in: itemKeys.length > 0 ? itemKeys : [''] } },
    });
    const itemMap = new Map(items.map((i) => [i.key, i]));

    const inventoryItems = inventory.map((inv) => ({
      ...inv,
      item: itemMap.get(inv.itemKey),
    }));

    // 将系统/成就解锁且尚未在 UserInventory 中的印记转为背包项
    const unlockedKeys = new Set(inventory.map((i) => i.itemKey));
    const titleItems = userTitles
      .filter((ut) => !unlockedKeys.has(ut.titleKey))
      .map((ut) => ({
        id: `title-${ut.id}`,
        userId: ut.userId,
        itemKey: ut.titleKey,
        quantity: 1,
        purchasedAt: ut.unlockedAt,
        item: {
          id: `title-${ut.titleConfig.id}`,
          key: ut.titleConfig.key,
          name: ut.titleConfig.name,
          description: ut.titleConfig.description,
          category: 'title',
          price: 0,
          currency: 'coin',
          rarity: ut.titleConfig.rarity,
          iconUrl: ut.titleConfig.icon || null,
        },
      }));

    res.json({
      success: true,
      data: { inventory: [...inventoryItems, ...titleItems] },
    });
  } catch (error) {
    console.error('获取背包失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * POST /api/shop/equip
 * 装备/卸下头像框
 */
router.post('/shop/equip', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user!.userId;
    const { itemKey } = req.body;

    if (itemKey === null || itemKey === undefined || itemKey === '') {
      // 卸下
      const user = await prisma.user.update({
        where: { id: userId },
        data: { equippedFrame: null },
        select: {
          id: true,
          email: true,
          nickname: true,
          avatarUrl: true,
          exp: true,
          displayedTitleKey: true,
          isAdmin: true,
          coins: true,
          stardust: true,
          equippedFrame: true,
        },
      });
      const frameUrl = null;
      return res.json({ success: true, message: '已卸下头像框', data: { user: { ...user, frameUrl } } });
    }

    // 验证是否拥有
    const owned = await prisma.userInventory.findUnique({
      where: { userId_itemKey: { userId, itemKey } },
    });

    if (!owned) {
      return res.status(403).json({ success: false, message: '尚未拥有该物品' });
    }

    const item = await prisma.shopItem.findUnique({
      where: { key: itemKey },
    });

    if (!item || !item.isActive) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { equippedFrame: itemKey },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        exp: true,
        displayedTitleKey: true,
        isAdmin: true,
        coins: true,
        stardust: true,
        equippedFrame: true,
      },
    });

    const frameUrl = item.iconUrl || null;

    res.json({
      success: true,
      message: '装备成功',
      data: { user: { ...user, frameUrl } },
    });
  } catch (error) {
    console.error('装备失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
