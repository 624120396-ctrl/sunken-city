import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { requireRoomCapability } from './room-auth';

const router = Router();

async function requireMember(req: AuthRequest, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { roomId },
    include: { members: { include: { user: { select: { nickname: true } } } } },
  });
  if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
  const member = room.members.find(m => m.userId === req.userId);
  if (!member) throw new AppError('FORBIDDEN', '不是房间成员', 403);
  return { room, member };
}

// ===== 初始化战斗 =====
router.post('/:roomId/combat/init', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageCombat');

    // 检查是否已有活跃战斗
    const existing = await prisma.combatSession.findFirst({
      where: { roomId: room.id, status: 'active' },
    });
    if (existing) {
      throw new AppError('COMBAT_ACTIVE', '已有进行中的战斗', 400);
    }

    // 获取房间成员（绑定角色卡的），按 DEX 排序
    const members = await prisma.roomMember.findMany({
      where: { roomId: room.id, leftAt: null },
      include: { character: true, user: { select: { nickname: true } } },
    });

    const combatants = members
      .filter(m => m.character)
      .map(m => ({
        actorId: m.character!.id,
        actorType: 'player' as const,
        actorName: m.character!.name,
        dex: m.character!.dex || 50,
        hp: m.character!.hp || 10,
        maxHp: m.character!.maxHp || 10,
        userId: m.userId,
      }))
      .sort((a, b) => b.dex - a.dex);

    // 创建 CombatSession
    const session = await prisma.combatSession.create({
      data: {
        roomId: room.id,
        status: 'active',
        initiative: JSON.stringify(combatants),
        roundCount: 1,
      },
    });

    // 创建第1回合
    const round = await prisma.combatRound.create({
      data: {
        combatId: session.id,
        roundNum: 1,
      },
    });

    // 更新房间当前战斗ID
    await prisma.room.update({
      where: { id: room.id },
      data: { activeCombatId: session.id },
    });

    // 写入事件日志
    await prisma.roomEventLog.create({
      data: {
        roomId: room.id,
        eventType: 'COMBAT_ACTION',
        payload: JSON.stringify({
          action: '战斗开始',
          round: 1,
          initiative: combatants.map(c => c.actorName).join(' > '),
          combatId: session.id,
        }),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        combat: {
          ...session,
          initiative: combatants,
          currentRound: round,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== 获取当前战斗 =====
router.get('/:roomId/combat/current', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { room } = await requireMember(req, roomId);

    const session = await prisma.combatSession.findFirst({
      where: { roomId: room.id, status: 'active' },
      include: {
        rounds: {
          orderBy: { roundNum: 'desc' },
          take: 1,
          include: { actions: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });

    if (!session) {
      return res.json({ success: true, data: { combat: null } });
    }

    const initiative = JSON.parse(session.initiative || '[]');
    const currentRound = session.rounds[0];

    res.json({
      success: true,
      data: {
        combat: {
          ...session,
          initiative,
          currentRound,
          currentRoundNum: currentRound?.roundNum || session.roundCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== 推进到下一个行动者 =====
router.post('/:roomId/combat/:combatId/next-turn', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, combatId } = req.params;
    const { room } = await requireMember(req, roomId);

    const session = await prisma.combatSession.findUnique({
      where: { id: combatId },
      include: { rounds: { orderBy: { roundNum: 'desc' }, take: 1 } },
    });
    if (!session || session.roomId !== room.id) {
      throw new AppError('COMBAT_NOT_FOUND', '战斗不存在', 404);
    }

    const initiative = JSON.parse(session.initiative || '[]');
    const currentRound = session.rounds[0];
    const actionCount = currentRound ? await prisma.combatAction.count({ where: { roundId: currentRound.id } }) : 0;

    // 计算当前行动者索引
    const currentIndex = actionCount % initiative.length;
    const nextIndex = (currentIndex + 1) % initiative.length;
    const isRoundEnd = nextIndex === 0;

    // 获取当前行动者
    const currentActor = initiative[currentIndex];

    // 只有当前行动者或具备战斗管理权限者可以推进
    const isActor = currentActor?.userId === req.userId;
    if (!isActor) {
      await requireRoomCapability(roomId, req.userId, 'canManageCombat');
    } else {
      await requireRoomCapability(roomId, req.userId, 'canRollPublicDice');
    }

    // 如果行动者没有提交行动，自动添加 "end" 行动
    const hasActionThisTurn = await prisma.combatAction.findFirst({
      where: {
        roundId: currentRound.id,
        actorId: currentActor?.actorId,
        createdAt: { gte: new Date(Date.now() - 5000) }, // 最近5秒内
      },
    });

    if (!hasActionThisTurn) {
      await prisma.combatAction.create({
        data: {
          roundId: currentRound.id,
          actorId: currentActor?.actorId,
          actorType: currentActor?.actorType || 'player',
          actionType: 'end',
          description: '跳过回合',
          result: JSON.stringify({ skipped: true }),
        },
      });
    }

    let nextRound = currentRound;
    if (isRoundEnd) {
      // 结束当前回合，创建新回合
      await prisma.combatRound.update({
        where: { id: currentRound.id },
        data: { endedAt: new Date() },
      });

      nextRound = await prisma.combatRound.create({
        data: {
          combatId: session.id,
          roundNum: currentRound.roundNum + 1,
        },
      });

      await prisma.combatSession.update({
        where: { id: combatId },
        data: { roundCount: currentRound.roundNum + 1 },
      });

      // 写入事件日志
      await prisma.roomEventLog.create({
        data: {
          roomId: room.id,
          eventType: 'COMBAT_ACTION',
          payload: JSON.stringify({
            action: '新回合开始',
            round: currentRound.roundNum + 1,
            combatId: session.id,
          }),
        },
      });
    }

    const nextActor = initiative[isRoundEnd ? 0 : nextIndex];

    res.json({
      success: true,
      data: {
        nextActor,
        roundNum: nextRound.roundNum,
        isRoundEnd,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== 提交战斗行动 =====
router.post('/:roomId/combat/:combatId/action', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, combatId } = req.params;
    const { actionType, targetId, targetType, description, result } = req.body;
    const { room, member } = await requireMember(req, roomId);

    const session = await prisma.combatSession.findUnique({
      where: { id: combatId },
      include: { rounds: { orderBy: { roundNum: 'desc' }, take: 1 } },
    });
    if (!session || session.roomId !== room.id) {
      throw new AppError('COMBAT_NOT_FOUND', '战斗不存在', 404);
    }

    const initiative = JSON.parse(session.initiative || '[]');
    const currentRound = session.rounds[0];
    const actionCount = await prisma.combatAction.count({ where: { roundId: currentRound.id } });
    const currentIndex = actionCount % initiative.length;
    const currentActor = initiative[currentIndex];

    // 只有当前行动者或具备战斗管理权限者可以提交行动
    if (currentActor?.userId !== req.userId) {
      await requireRoomCapability(roomId, req.userId, 'canManageCombat');
    } else {
      await requireRoomCapability(roomId, req.userId, 'canRollPublicDice');
    }

    const actorId = currentActor?.actorId || req.userId;
    const actorType = currentActor?.actorType || 'player';

    const action = await prisma.combatAction.create({
      data: {
        roundId: currentRound.id,
        actorId,
        actorType,
        actionType: actionType || 'move',
        targetId: targetId || null,
        targetType: targetType || null,
        description: description || '',
        result: JSON.stringify(result || {}),
      },
    });

    // 写入事件日志
    await prisma.roomEventLog.create({
      data: {
        roomId: room.id,
        eventType: 'COMBAT_ACTION',
        payload: JSON.stringify({
          action: description || actionType,
          actor: currentActor?.actorName || member.user.nickname,
          target: targetId,
          round: currentRound.roundNum,
          combatId: session.id,
          result,
        }),
      },
    });

    res.json({ success: true, data: { action } });
  } catch (error) {
    next(error);
  }
});

// ===== 结束回合（KP 专用，强制推进） =====
router.post('/:roomId/combat/:combatId/end-round', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, combatId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageCombat');

    const session = await prisma.combatSession.findUnique({
      where: { id: combatId },
      include: { rounds: { orderBy: { roundNum: 'desc' }, take: 1 } },
    });
    if (!session || session.roomId !== room.id) {
      throw new AppError('COMBAT_NOT_FOUND', '战斗不存在', 404);
    }

    const currentRound = session.rounds[0];

    // 结束当前回合
    await prisma.combatRound.update({
      where: { id: currentRound.id },
      data: { endedAt: new Date() },
    });

    // 创建新回合
    const nextRound = await prisma.combatRound.create({
      data: {
        combatId: session.id,
        roundNum: currentRound.roundNum + 1,
      },
    });

    await prisma.combatSession.update({
      where: { id: combatId },
      data: { roundCount: currentRound.roundNum + 1 },
    });

    const initiative = JSON.parse(session.initiative || '[]');
    const nextActor = initiative[0];

    // 写入事件日志
    await prisma.roomEventLog.create({
      data: {
        roomId: room.id,
        eventType: 'COMBAT_ACTION',
        payload: JSON.stringify({
          action: 'KP强制结束回合',
          round: nextRound.roundNum,
          combatId: session.id,
        }),
      },
    });

    res.json({
      success: true,
      data: {
        message: '回合已结束',
        nextRoundNum: nextRound.roundNum,
        nextActor,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== 结束战斗 =====
router.post('/:roomId/combat/:combatId/end', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, combatId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageCombat');

    const session = await prisma.combatSession.findUnique({ where: { id: combatId } });
    if (!session || session.roomId !== room.id) {
      throw new AppError('COMBAT_NOT_FOUND', '战斗不存在', 404);
    }

    await prisma.combatSession.update({
      where: { id: combatId },
      data: { status: 'ended', endedAt: new Date() },
    });

    // 清除房间活跃战斗ID
    await prisma.room.update({
      where: { id: room.id },
      data: { activeCombatId: null },
    });

    // 写入事件日志
    await prisma.roomEventLog.create({
      data: {
        roomId: room.id,
        eventType: 'COMBAT_ACTION',
        payload: JSON.stringify({
          action: '战斗结束',
          totalRounds: session.roundCount,
          combatId: session.id,
        }),
      },
    });

    res.json({ success: true, data: { message: '战斗已结束' } });
  } catch (error) {
    next(error);
  }
});

export default router;
