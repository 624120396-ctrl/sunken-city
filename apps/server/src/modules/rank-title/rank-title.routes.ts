import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * 根据灵魂碎片数获取当前位阶
 */
function getCurrentRank(exp: number, ranks: any[]) {
  const sortedRanks = [...ranks]
    .filter(r => r.isActive)
    .sort((a, b) => b.level - a.level);
  
  for (const rank of sortedRanks) {
    if (exp >= rank.expRequired) {
      return rank;
    }
  }
  return sortedRanks[sortedRanks.length - 1];
}

/**
 * 获取下一级位阶
 */
function getNextRank(exp: number, ranks: any[]) {
  const currentRank = getCurrentRank(exp, ranks);
  const sortedRanks = [...ranks]
    .filter(r => r.isActive)
    .sort((a, b) => a.level - b.level);
  
  const currentIndex = sortedRanks.findIndex(r => r.level === currentRank.level);
  return sortedRanks[currentIndex + 1] || null;
}

/**
 * 获取位阶进度
 */
function getRankProgress(exp: number, ranks: any[]) {
  const currentRank = getCurrentRank(exp, ranks);
  const nextRank = getNextRank(exp, ranks);
  
  if (!nextRank) return { progress: 100, expToNext: 0 };
  
  const expInCurrentLevel = exp - currentRank.expRequired;
  const expNeededForLevel = nextRank.expRequired - currentRank.expRequired;
  const progress = Math.min(100, Math.floor((expInCurrentLevel / expNeededForLevel) * 100));
  const expToNext = nextRank.expRequired - exp;
  
  return { progress, expToNext };
}

// ========== 用户端API ==========

/**
 * GET /api/users/me/rank-title
 * 获取当前用户的位阶和印记信息
 */
router.get('/users/me/rank-title', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    
    // 获取用户数据
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        exp: true,
        displayedTitleKey: true,
        isAdmin: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 获取所有位阶配置
    const rankConfigs = await prisma.rankConfig.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
    });
    
    // 计算位阶信息
    const currentRank = getCurrentRank(user.exp, rankConfigs);
    const nextRank = getNextRank(user.exp, rankConfigs);
    const { progress, expToNext } = getRankProgress(user.exp, rankConfigs);
    
    // 获取已解锁印记数量
    const unlockedCount = await prisma.userTitle.count({
      where: { userId },
    });
    
    // 获取当前展示的印记
    let displayedTitle = null;
    if (user.displayedTitleKey) {
      displayedTitle = await prisma.titleConfig.findUnique({
        where: { key: user.displayedTitleKey },
      });
    }
    
    // 计算显示徽章
    const displayBadge = displayedTitle
      ? {
          type: 'title' as const,
          name: displayedTitle.name,
          icon: displayedTitle.icon,
          color: displayedTitle.color,
        }
      : {
          type: 'rank' as const,
          name: currentRank.name,
          icon: currentRank.icon,
          color: currentRank.color,
        };
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        exp: user.exp,
        isAdmin: user.isAdmin,
        rank: {
          level: currentRank.level,
          name: currentRank.name,
          icon: currentRank.icon,
          color: currentRank.color,
          expRequired: currentRank.expRequired,
          description: currentRank.description,
        },
        nextRank: nextRank
          ? {
              level: nextRank.level,
              name: nextRank.name,
              expRequired: nextRank.expRequired,
            }
          : null,
        progress,
        expToNext,
        displayBadge,
        titleStats: {
          unlockedCount,
          displayedTitleKey: user.displayedTitleKey,
        },
      },
    });
  } catch (error) {
    console.error('获取用户位阶信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /api/ranks
 * 获取所有位阶配置
 */
router.get('/ranks', async (req, res) => {
  try {
    const ranks = await prisma.rankConfig.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
      select: {
        id: true,
        level: true,
        name: true,
        expRequired: true,
        description: true,
        privileges: true,
        icon: true,
        color: true,
      },
    });
    
    res.json({
      success: true,
      data: { ranks },
    });
  } catch (error) {
    console.error('获取位阶列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /api/titles
 * 获取所有印记配置
 */
router.get('/titles', async (req, res) => {
  try {
    const { category, rarity } = req.query;
    
    const where: any = { isActive: true };
    if (category) where.category = category;
    if (rarity) where.rarity = rarity;
    
    const titles = await prisma.titleConfig.findMany({
      where,
      orderBy: [{ rarity: 'desc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        category: true,
        rarity: true,
        condition: true,
        expReward: true,
        icon: true,
        color: true,
        hint: true,
        isHidden: true,
      },
    });
    
    res.json({
      success: true,
      data: { titles },
    });
  } catch (error) {
    console.error('获取印记列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /api/users/me/titles
 * 获取当前用户已解锁的印记
 */
router.get('/users/me/titles', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user!.userId;
    
    const userTitles = await prisma.userTitle.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });
    
    // 获取印记配置
    const titleKeys = userTitles.map(ut => ut.titleKey);
    const titleConfigs = await prisma.titleConfig.findMany({
      where: { key: { in: titleKeys.length > 0 ? titleKeys : [''] } },
    });
    
    const titleConfigMap = new Map(titleConfigs.map(t => [t.key, t]));
    
    const titlesWithConfig = userTitles.map(ut => ({
      ...ut,
      titleConfig: titleConfigMap.get(ut.titleKey),
    }));
    
    res.json({
      success: true,
      data: { titles: titlesWithConfig },
    });
  } catch (error) {
    console.error('获取用户印记失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * PUT /api/users/me/displayed-title
 * 设置当前展示的印记
 */
router.put('/users/me/displayed-title', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { titleKey } = req.body;
    
    // 如果设置为null，表示展示位阶名称
    if (titleKey === null) {
      await prisma.user.update({
        where: { id: userId },
        data: { displayedTitleKey: null },
      });
      
      return res.json({
        success: true,
        message: '已设置为展示位阶名称',
      });
    }
    
    // 验证印记是否存在
    const title = await prisma.titleConfig.findUnique({
      where: { key: titleKey },
    });
    
    if (!title) {
      return res.status(404).json({ success: false, message: '印记不存在' });
    }
    
    // 验证用户是否已解锁该印记
    const userTitle = await prisma.userTitle.findUnique({
      where: {
        userId_titleKey: {
          userId,
          titleKey,
        },
      },
    });
    
    if (!userTitle) {
      return res.status(403).json({ success: false, message: '尚未解锁该印记' });
    }
    
    // 更新展示印记
    await prisma.user.update({
      where: { id: userId },
      data: { displayedTitleKey: titleKey },
    });
    
    res.json({
      success: true,
      message: '展示印记已更新',
      data: {
        title: {
          key: title.key,
          name: title.name,
          icon: title.icon,
          color: title.color,
        },
      },
    });
  } catch (error) {
    console.error('设置展示印记失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;