import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { calculateSuccessLevel } from '../../utils/character-calc';

const router = Router();

function parseVisibleUserIds(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function loadRoomDiceHistory(roomIdOrCode: string, userId: string) {
  const room = await prisma.room.findFirst({
    where: {
      OR: [
        { id: roomIdOrCode },
        { roomId: roomIdOrCode },
      ],
    },
    include: {
      members: {
        where: { userId, leftAt: null },
        select: { userId: true, role: true },
      },
    },
  });

  if (!room) {
    throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
  }

  const member = room.members[0];
  if (!member) {
    throw new AppError('FORBIDDEN', '你没有查看该房间投骰历史的权限', 403);
  }

  const isKP = member.role === 'KP';
  const rolls = await prisma.diceRoll.findMany({
    where: { roomId: room.id },
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

  return rolls
    .filter((r) => {
      const legacySecretRoll = r.targetName === 'KP暗骰';
      const isSecretRoll = r.isBlind || legacySecretRoll;
      if (!isSecretRoll) return true;
      if (isKP || r.userId === userId) return true;
      return parseVisibleUserIds(r.visibleToUserIds).includes(userId);
    })
    .map((r) => ({
      id: r.id,
      rollType: r.rollType,
      targetName: r.targetName,
      targetValue: r.targetValue,
      rollResult: r.rollResult,
      rolls: JSON.parse(r.rolls),
      successLevel: r.successLevel,
      nickname: r.user?.nickname || 'Unknown',
      user: {
        nickname: r.user?.nickname || 'Unknown',
      },
      timestamp: r.createdAt,
      createdAt: r.createdAt,
    }));
}

// 投骰历史查询：当前前端使用 /api/dice/history?roomId=房间号
router.get('/history', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const roomId = typeof req.query.roomId === 'string' ? req.query.roomId : '';
    if (!roomId) {
      throw new AppError('ROOM_ID_REQUIRED', '缺少房间号', 400);
    }

    const rolls = await loadRoomDiceHistory(roomId, req.userId!);

    res.json({
      success: true,
      data: { rolls },
    });
  } catch (error) {
    next(error);
  }
});

// 投骰历史查询：保留旧路径兼容
router.get('/rooms/:roomId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const rolls = await loadRoomDiceHistory(roomId, req.userId!);

    res.json({
      success: true,
      data: { rolls },
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
