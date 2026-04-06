import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { calculateSuccessLevel } from '../../utils/character-calc';

const router = Router();

// 投骰历史查询
router.get('/rooms/:roomId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;

    const rolls = await prisma.diceRoll.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        rolls: rolls.map(r => ({
          id: r.id,
          rollType: r.rollType,
          targetName: r.targetName,
          targetValue: r.targetValue,
          rollResult: r.rollResult,
          rolls: JSON.parse(r.rolls),
          successLevel: r.successLevel,
          nickname: r.user?.nickname || 'Unknown',
          timestamp: r.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 角色投骰统计
router.get('/characters/:characterId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { characterId } = req.params;
    const userId = req.userId!;

    // 验证角色卡所有权
    const character = await prisma.character.findFirst({
      where: { id: characterId, userId },
    });

    if (!character) {
      throw new AppError('CHARACTER_NOT_FOUND', '调查员不存在', 404);
    }

    const rolls = await prisma.diceRoll.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const stats = {
      total: rolls.length,
      criticalSuccess: rolls.filter(r => r.successLevel === '大成功').length,
      extremeSuccess: rolls.filter(r => r.successLevel === '极难成功').length,
      hardSuccess: rolls.filter(r => r.successLevel === '困难成功').length,
      success: rolls.filter(r => r.successLevel === '成功').length,
      failure: rolls.filter(r => r.successLevel === '失败').length,
      fumble: rolls.filter(r => r.successLevel === '大失败').length,
    };

    res.json({
      success: true,
      data: {
        stats,
        rolls: rolls.slice(0, 20).map(r => ({
          id: r.id,
          rollType: r.rollType,
          targetName: r.targetName,
          targetValue: r.targetValue,
          rollResult: r.rollResult,
          successLevel: r.successLevel,
          timestamp: r.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { calculateSuccessLevel };
export default router;