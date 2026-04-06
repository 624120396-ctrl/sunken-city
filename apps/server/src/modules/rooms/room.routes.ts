import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();

// 生成短房间ID
function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 获取房间列表
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        roomId: true,
        name: true,
        description: true,
        creatorId: true,
        _count: {
          select: { members: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        rooms: rooms.map(r => ({
          id: r.id,
          roomId: r.roomId,
          name: r.name,
          description: r.description,
          memberCount: r._count.members,
          isCreator: r.creatorId === req.userId,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 获取单个房间
router.get('/:roomId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatarUrl: true,
                equippedFrame: true,
                exp: true,
                coins: true,
                stardust: true,
                displayedTitleKey: true,
              },
            },
            character: {
              select: {
                id: true,
                name: true,
                occupation: true,
                hp: true,
                mp: true,
                san: true,
                maxHp: true,
                maxMp: true,
                maxSan: true,
                str: true,
                dex: true,
                con: true,
                siz: true,
                app: true,
                int: true,
                pow: true,
                edu: true,
                luck: true,
                mov: true,
                build: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    // 检查用户是否在房间中
    const isMember = room.members.some(m => m.userId === req.userId);
    const isCreator = room.creatorId === req.userId;

    // 批量获取头像框图片URL
    const frameKeys = [...new Set(room.members.map(m => m.user.equippedFrame).filter(Boolean))] as string[];
    const shopItems = frameKeys.length > 0
      ? await prisma.shopItem.findMany({ where: { key: { in: frameKeys } }, select: { key: true, iconUrl: true } })
      : [];
    const frameMap = new Map(shopItems.map(s => [s.key, s.iconUrl]));

    // 批量获取位阶与印记配置
    const [rankConfigs, titleConfigs] = await Promise.all([
      prisma.rankConfig.findMany({ where: { isActive: true }, orderBy: { level: 'asc' } }),
      prisma.titleConfig.findMany({ where: { isActive: true } }),
    ]);

    function getCurrentRank(exp: number) {
      const sorted = [...rankConfigs].sort((a, b) => b.level - a.level);
      for (const r of sorted) {
        if (exp >= r.expRequired) return r;
      }
      return sorted[sorted.length - 1];
    }

    const titleMap = new Map(titleConfigs.map(t => [t.key, t.name]));

    res.json({
      success: true,
      data: {
        room: {
          id: room.id,
          roomId: room.roomId,
          name: room.name,
          description: room.description,
          status: room.status,
          isCreator,
          isMember,
          members: room.members.map(m => {
            const rank = getCurrentRank(m.user.exp);
            return {
              id: m.id,
              userId: m.userId,
              nickname: m.user.nickname,
              avatarUrl: m.user.avatarUrl,
              frameUrl: frameMap.get(m.user.equippedFrame || '') || null,
              role: m.role,
              character: m.character,
              exp: m.user.exp,
              coins: m.user.coins,
              stardust: m.user.stardust,
              displayedTitleKey: m.user.displayedTitleKey,
              rankName: rank?.name || 'Unknown',
              titleName: titleMap.get(m.user.displayedTitleKey || '') || null,
            };
          }),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// 创建房间
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { name, description, password } = req.body;
    const userId = req.userId!;

    // 生成短ID (6位字母数字)
    const roomId = generateRoomId();

    const room = await prisma.room.create({
      data: {
        roomId,
        name,
        description,
        creatorId: userId,
        members: {
          create: {
            userId,
            role: 'KP',
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { room },
    });
  } catch (error) {
    next(error);
  }
});

// 加入房间
router.post('/:roomId/join', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { characterId } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    if (room.status !== 'ACTIVE') {
      throw new AppError('ROOM_CLOSED', '房间已关闭', 400);
    }

    // 检查是否已在房间中
    const existingMember = room.members.find(m => m.userId === userId);
    if (existingMember) {
      throw new AppError('ALREADY_MEMBER', '你已在房间中', 400);
    }

    // 加入房间
    const member = await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId,
        characterId,
        role: 'PLAYER',
      },
    });

    res.json({
      success: true,
      data: { member },
    });
  } catch (error) {
    next(error);
  }
});

// 离开房间
router.post('/:roomId/leave', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    const member = room.members.find(m => m.userId === userId);
    if (!member) {
      throw new AppError('NOT_MEMBER', '你不是房间成员', 400);
    }

    // KP不能离开，只能关闭房间
    if (member.role === 'KP' && room.creatorId === userId) {
      throw new AppError('KP_CANNOT_LEAVE', 'KP不能离开房间，请关闭房间', 400);
    }

    await prisma.roomMember.update({
      where: { id: member.id },
      data: { leftAt: new Date() },
    });

    res.json({
      success: true,
      message: '已离开房间',
    });
  } catch (error) {
    next(error);
  }
});

// 关闭房间 (仅KP)
router.post('/:roomId/close', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({
      where: { roomId },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    if (room.creatorId !== userId) {
      throw new AppError('FORBIDDEN', '只有KP可以关闭房间', 403);
    }

    await prisma.room.update({
      where: { id: room.id },
      data: { status: 'CLOSED' },
    });

    res.json({
      success: true,
      message: '房间已关闭',
    });
  } catch (error) {
    next(error);
  }
});

// ========== 新增：房间氛围与场景 ==========

// 更新房间氛围和场景描述 (仅KP)
router.patch('/:roomId/atmosphere', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { atmosphere, sceneDesc } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    const member = room.members.find(m => m.userId === userId);
    if (!member || member.role !== 'KP') {
      throw new AppError('FORBIDDEN', '只有KP可以修改房间氛围', 403);
    }

    const updatedRoom = await prisma.room.update({
      where: { id: room.id },
      data: {
        ...(atmosphere && { atmosphere }),
        ...(sceneDesc !== undefined && { sceneDesc }),
      },
    });

    res.json({
      success: true,
      data: {
        atmosphere: updatedRoom.atmosphere,
        sceneDesc: updatedRoom.sceneDesc,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 新增：成员状态标记 ==========

// 更新成员状态标记 (KP或自己)
router.patch('/:roomId/members/:memberId/status', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, memberId } = req.params;
    const userId = req.userId!;
    const { statusTags } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    const targetMember = room.members.find(m => m.id === memberId);
    if (!targetMember) {
      throw new AppError('MEMBER_NOT_FOUND', '成员不存在', 404);
    }

    const currentMember = room.members.find(m => m.userId === userId);
    const isKP = currentMember?.role === 'KP';
    const isSelf = targetMember.userId === userId;

    // KP可以修改任何人，玩家只能修改自己
    if (!isKP && !isSelf) {
      throw new AppError('FORBIDDEN', '只能修改自己的状态', 403);
    }

    const updatedMember = await prisma.roomMember.update({
      where: { id: memberId },
      data: { statusTags: JSON.stringify(statusTags) },
    });

    res.json({
      success: true,
      data: {
        memberId: updatedMember.id,
        statusTags: JSON.parse(updatedMember.statusTags),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 新增：房间统计 ==========

// 获取房间实时统计
router.get('/:roomId/stats', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.room.findUnique({
      where: { roomId },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    // 统计信息（简化版，不依赖RoomStats表）
    const stats = {
      messageCount: 0, // 可以后续从消息系统获取
      diceRollCount: await prisma.diceRoll.count({ where: { roomId: room.id } }),
      lastActivity: new Date(),
    };

    // 统计信息（从DiceRoll计算）
    const diceRolls = await prisma.diceRoll.findMany({
      where: { roomId: room.id },
    });

    const totalRolls = diceRolls.length;
    const successRolls = diceRolls.filter(r => ['SUCCESS', 'HARD_SUCCESS', 'CRITICAL_SUCCESS'].includes(r.successLevel || '')).length;
    const failRolls = diceRolls.filter(r => ['FAILURE', 'FUMBLE'].includes(r.successLevel || '')).length;

    // 统计最常用的技能
    const skillCount: Record<string, number> = {};
    diceRolls.forEach(roll => {
      if (roll.targetName) {
        skillCount[roll.targetName] = (skillCount[roll.targetName] || 0) + 1;
      }
    });
    const mostUsedSkill = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    res.json({
      success: true,
      data: {
        duration: 0, // 简化为0，可后续从room.createdAt计算
        totalRolls,
        successRolls,
        failRolls,
        mostUsedSkill,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;