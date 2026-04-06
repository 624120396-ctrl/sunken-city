import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/admin';
import { createNotification } from '../notifications/notifications.service';
import { checkAndNotifyRankUp } from './rank-title.service';

const router = Router();
const prisma = new PrismaClient();

// 所有路由都需要管理员权限
router.use(authMiddleware, adminMiddleware);

/**
 * GET /api/admin/ranks
 * 获取位阶配置列表（管理后台）
 */
router.get('/ranks', async (req, res) => {
  try {
    const { page = '1', limit = '50', isActive } = req.query;
    
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    
    const [ranks, total] = await Promise.all([
      prisma.rankConfig.findMany({
        where,
        orderBy: { level: 'asc' },
        skip,
        take,
      }),
      prisma.rankConfig.count({ where }),
    ]);
    
    // 统计每个位阶的用户数量
    const ranksWithStats = await Promise.all(
      ranks.map(async (rank) => {
        const nextRank = await prisma.rankConfig.findFirst({
          where: { level: { gt: rank.level }, isActive: true },
          orderBy: { level: 'asc' },
        });
        
        const userCount = await prisma.user.count({
          where: {
            exp: {
              gte: rank.expRequired,
              lt: nextRank?.expRequired ?? 99999999,
            },
          },
        });
        
        return { ...rank, userCount };
      })
    );
    
    res.json({
      success: true,
      data: { ranks: ranksWithStats, total },
    });
  } catch (error) {
    console.error('获取位阶列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * POST /api/admin/ranks
 * 创建位阶
 */
router.post('/ranks', async (req, res) => {
  try {
    const { level, name, expRequired, description, privileges, icon, color } = req.body;
    
    // 验证level唯一性
    const existing = await prisma.rankConfig.findUnique({
      where: { level: parseInt(level) },
    });
    
    if (existing) {
      return res.status(400).json({ success: false, message: '该等级已存在' });
    }
    
    const rank = await prisma.rankConfig.create({
      data: {
        level: parseInt(level),
        name,
        expRequired: parseInt(expRequired),
        description,
        privileges: JSON.stringify(privileges || []),
        icon,
        color,
        updatedAt: new Date(),
      },
    });
    
    res.json({
      success: true,
      message: '位阶创建成功',
      data: { rank },
    });
  } catch (error) {
    console.error('创建位阶失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * PUT /api/admin/ranks/:id
 * 更新位阶
 */
router.put('/ranks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, expRequired, description, privileges, icon, color, isActive, sortOrder } = req.body;
    
    const rank = await prisma.rankConfig.update({
      where: { id },
      data: {
        name,
        expRequired: expRequired !== undefined ? parseInt(expRequired) : undefined,
        description,
        privileges: privileges !== undefined ? JSON.stringify(privileges) : undefined,
        icon,
        color,
        isActive,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : undefined,
        updatedAt: new Date(),
      },
    });
    
    res.json({
      success: true,
      message: '位阶更新成功',
      data: { rank },
    });
  } catch (error) {
    console.error('更新位阶失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * DELETE /api/admin/ranks/:id
 * 删除位阶
 */
router.delete('/ranks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.rankConfig.delete({
      where: { id },
    });
    
    res.json({
      success: true,
      message: '位阶删除成功',
    });
  } catch (error) {
    console.error('删除位阶失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 印记管理 ==========

/**
 * GET /api/admin/titles
 * 获取印记配置列表
 */
router.get('/titles', async (req, res) => {
  try {
    const { page = '1', limit = '50', category, rarity, isActive, search } = req.query;
    
    const where: any = {};
    if (category) where.category = category;
    if (rarity) where.rarity = rarity;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
        { key: { contains: search as string } },
      ];
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    
    const [titles, total] = await Promise.all([
      prisma.titleConfig.findMany({
        where,
        orderBy: [{ rarity: 'desc' }, { sortOrder: 'asc' }],
        skip,
        take,
      }),
      prisma.titleConfig.count({ where }),
    ]);
    
    // 统计解锁数量
    const titlesWithStats = await Promise.all(
      titles.map(async (title) => {
        const unlockedCount = await prisma.userTitle.count({
          where: { titleKey: title.key },
        });
        return { ...title, unlockedCount };
      })
    );
    
    // 统计分布
    const [byCategory, byRarity] = await Promise.all([
      prisma.titleConfig.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
      prisma.titleConfig.groupBy({
        by: ['rarity'],
        _count: { rarity: true },
      }),
    ]);
    
    res.json({
      success: true,
      data: {
        titles: titlesWithStats,
        total,
        stats: {
          total: await prisma.titleConfig.count(),
          byCategory: Object.fromEntries(byCategory.map(c => [c.category, c._count.category])),
          byRarity: Object.fromEntries(byRarity.map(r => [r.rarity, r._count.rarity])),
        },
      },
    });
  } catch (error) {
    console.error('获取印记列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * POST /api/admin/titles
 * 创建印记
 */
router.post('/titles', async (req, res) => {
  try {
    const {
      key,
      name,
      description,
      category,
      rarity,
      condition,
      conditionCode,
      expReward,
      icon,
      color,
      hint,
      isHidden,
    } = req.body;
    
    // 验证key唯一性
    const existing = await prisma.titleConfig.findUnique({
      where: { key },
    });
    
    if (existing) {
      return res.status(400).json({ success: false, message: '该标识已存在' });
    }
    
    const title = await prisma.titleConfig.create({
      data: {
        key,
        name,
        description,
        category,
        rarity,
        condition,
        conditionCode,
        expReward: parseInt(expReward) || 0,
        icon,
        color,
        hint,
        isHidden: isHidden || false,
        updatedAt: new Date(),
      },
    });
    
    res.json({
      success: true,
      message: '印记创建成功',
      data: { title },
    });
  } catch (error) {
    console.error('创建印记失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * PUT /api/admin/titles/:id
 * 更新印记
 */
router.put('/titles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (updateData.expReward !== undefined) {
      updateData.expReward = parseInt(updateData.expReward);
    }
    
    const title = await prisma.titleConfig.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });
    
    res.json({
      success: true,
      message: '印记更新成功',
      data: { title },
    });
  } catch (error) {
    console.error('更新印记失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * DELETE /api/admin/titles/:id
 * 删除印记
 */
router.delete('/titles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.titleConfig.delete({
      where: { id },
    });
    
    res.json({
      success: true,
      message: '印记删除成功',
    });
  } catch (error) {
    console.error('删除印记失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 用户印记管理 ==========

/**
 * GET /api/admin/users/:userId/titles
 * 获取用户的印记信息
 */
router.get('/users/:userId/titles', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true, email: true, exp: true, displayedTitleKey: true },
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 获取当前位阶
    const ranks = await prisma.rankConfig.findMany({ where: { isActive: true } });
    const sortedRanks = [...ranks].sort((a, b) => b.level - a.level);
    let currentRank = sortedRanks[sortedRanks.length - 1];
    for (const rank of sortedRanks) {
      if (user.exp >= rank.expRequired) {
        currentRank = rank;
        break;
      }
    }
    
    // 获取已解锁印记
    const unlockedTitles = await prisma.userTitle.findMany({
      where: { userId },
      include: { titleConfig: true },
      orderBy: { unlockedAt: 'desc' },
    });
    
    // 获取当前展示印记
    let displayedTitle = null;
    if (user.displayedTitleKey) {
      displayedTitle = await prisma.titleConfig.findUnique({
        where: { key: user.displayedTitleKey },
      });
    }
    
    // 获取可授予的印记（未解锁的）
    const unlockedKeys = unlockedTitles.map(ut => ut.titleKey);
    const availableTitles = await prisma.titleConfig.findMany({
      where: {
        isActive: true,
        key: { notIn: unlockedKeys.length > 0 ? unlockedKeys : [''] },
      },
      orderBy: [{ rarity: 'desc' }, { name: 'asc' }],
    });
    
    res.json({
      success: true,
      data: {
        user: { ...user, currentRank },
        unlockedTitles,
        displayedTitle,
        availableTitles,
      },
    });
  } catch (error) {
    console.error('获取用户印记信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * POST /api/admin/users/:userId/titles
 * 授予印记
 */
router.post('/users/:userId/titles', async (req: any, res) => {
  try {
    const { userId } = req.params;
    const { titleKey, note } = req.body;
    const adminId = req.user!.userId;
    const io = req.app.get('io') as import('socket.io').Server | undefined;
    
    // 验证印记
    const title = await prisma.titleConfig.findUnique({
      where: { key: titleKey },
    });
    
    if (!title) {
      return res.status(404).json({ success: false, message: '印记不存在' });
    }
    
    // 检查是否已解锁
    const existing = await prisma.userTitle.findUnique({
      where: { userId_titleKey: { userId, titleKey } },
    });
    
    if (existing) {
      return res.status(400).json({ success: false, message: '用户已拥有该印记' });
    }
    
    // 创建用户印记记录
    const userTitle = await prisma.userTitle.create({
      data: {
        userId,
        titleKey,
        unlockedBy: 'admin',
        grantedBy: adminId,
        note,
      },
    });
    
    // 添加灵魂碎片奖励
    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { exp: true },
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { exp: { increment: title.expReward } },
    });

    if (oldUser && title.expReward > 0) {
      await checkAndNotifyRankUp(userId, oldUser.exp, updatedUser.exp, io);
    }

    // 货币奖励（根据稀有度）
    const rarityCoinMap: Record<string, number> = {
      common: 50,
      rare: 100,
      epic: 150,
      legendary: 250,
      mythical: 500,
    };
    const rarityStardustMap: Record<string, number> = {
      legendary: 10,
      mythical: 50,
    };
    const coinReward = rarityCoinMap[title.rarity] || 50;
    const stardustReward = rarityStardustMap[title.rarity] || 0;

    if (coinReward > 0 || stardustReward > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(coinReward > 0 ? { coins: { increment: coinReward } } : {}),
          ...(stardustReward > 0 ? { stardust: { increment: stardustReward } } : {}),
        },
      });
    }
    
    // 发送通知
    await createNotification(prisma, io, {
      userId,
      type: 'title_unlock',
      title: `获得印记：${title.name}`,
      content: title.description?.slice(0, 100) || `管理员授予了你印记「${title.name}」。`,
      link: '/titles',
      isSystem: true,
    });
    
    // 记录日志
    await prisma.titleUnlockLog.create({
      data: {
        userId,
        titleKey,
        expReward: title.expReward,
        unlockedBy: 'admin',
        grantedBy: adminId,
        note,
      },
    });
    
    res.json({
      success: true,
      message: '印记授予成功',
      data: {
        userTitle,
        expReward: title.expReward,
        coinReward,
        stardustReward,
      },
    });
  } catch (error) {
    console.error('授予印记失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * DELETE /api/admin/users/:userId/titles/:titleKey
 * 撤销印记
 */
router.delete('/users/:userId/titles/:titleKey', async (req, res) => {
  try {
    const { userId, titleKey } = req.params;
    const { reason } = req.body;
    
    await prisma.userTitle.delete({
      where: { userId_titleKey: { userId, titleKey } },
    });
    
    // 如果当前展示的是该印记，重置为null
    await prisma.user.updateMany({
      where: { id: userId, displayedTitleKey: titleKey },
      data: { displayedTitleKey: null },
    });
    
    res.json({
      success: true,
      message: '印记已撤销',
    });
  } catch (error) {
    console.error('撤销印记失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * PUT /api/admin/users/:userId/displayed-title
 * 修改用户展示的印记
 */
router.put('/users/:userId/displayed-title', async (req, res) => {
  try {
    const { userId } = req.params;
    const { titleKey } = req.body;
    
    // 验证印记是否已解锁
    if (titleKey !== null) {
      const userTitle = await prisma.userTitle.findUnique({
        where: { userId_titleKey: { userId, titleKey } },
      });
      
      if (!userTitle) {
        return res.status(400).json({ success: false, message: '用户未解锁该印记' });
      }
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: { displayedTitleKey: titleKey },
    });
    
    res.json({
      success: true,
      message: '展示印记已更新',
    });
  } catch (error) {
    console.error('更新展示印记失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 用户灵魂碎片管理 ==========

/**
 * POST /api/admin/users/:userId/exp/adjust
 * 调整用户灵魂碎片
 */
router.post('/users/:userId/exp/adjust', async (req: any, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;
    const adminId = req.user!.userId;
    const io = req.app.get('io') as import('socket.io').Server | undefined;
    
    // 获取用户当前信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, exp: true },
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const oldExp = user.exp;
    const newExp = Math.max(0, oldExp + parseInt(amount));
    
    // 获取位阶信息
    const ranks = await prisma.rankConfig.findMany({ where: { isActive: true } });
    const sortedRanks = [...ranks].sort((a, b) => b.level - a.level);
    
    let oldRank = sortedRanks[sortedRanks.length - 1];
    let newRank = sortedRanks[sortedRanks.length - 1];
    
    for (const rank of sortedRanks) {
      if (oldExp >= rank.expRequired) oldRank = rank;
      if (newExp >= rank.expRequired) newRank = rank;
    }
    
    // 更新灵魂碎片
    await prisma.user.update({
      where: { id: userId },
      data: { exp: newExp },
    });

    await checkAndNotifyRankUp(userId, oldExp, newExp, io, true);

    // 位阶晋升货币奖励
    let coinReward = 0;
    let stardustReward = 0;
    if (newRank.level > oldRank.level) {
      for (let lvl = oldRank.level + 1; lvl <= newRank.level; lvl++) {
        coinReward += 100 * lvl;
        stardustReward += 5;
      }
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(coinReward > 0 ? { coins: { increment: coinReward } } : {}),
          ...(stardustReward > 0 ? { stardust: { increment: stardustReward } } : {}),
        },
      });
    }
    
    // 记录历史
    await prisma.userRankHistory.create({
      data: {
        userId,
        oldLevel: oldRank.level,
        newLevel: newRank.level,
        oldExp,
        newExp,
        reason,
        changedBy: adminId,
      },
    });
    
    res.json({
      success: true,
      message: '灵魂碎片已调整',
      data: {
        oldExp,
        newExp,
        adjustment: parseInt(amount),
        rankChanged: oldRank.level !== newRank.level,
        newRank: oldRank.level !== newRank.level
          ? { level: newRank.level, name: newRank.name }
          : null,
        coinReward,
        stardustReward,
      },
    });
  } catch (error) {
    console.error('调整灵魂碎片失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /api/admin/users/:userId/rank-history
 * 获取用户位阶变更历史
 */
router.get('/users/:userId/rank-history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '20' } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);
    
    const [history, total] = await Promise.all([
      prisma.userRankHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.userRankHistory.count({ where: { userId } }),
    ]);
    
    res.json({
      success: true,
      data: { history, total },
    });
  } catch (error) {
    console.error('获取位阶历史失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;