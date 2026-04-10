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
      },
    });

    const roomIds = rooms.map(r => r.id);
    const memberCounts = roomIds.length > 0
      ? await prisma.roomMember.groupBy({
          by: ['roomId'],
          where: {
            roomId: { in: roomIds },
            leftAt: null,
            joinStatus: 'approved',
          },
          _count: { userId: true },
        })
      : [];
    const countMap = new Map(memberCounts.map(m => [m.roomId, m._count.userId]));

    res.json({
      success: true,
      data: {
        rooms: rooms.map(r => ({
          id: r.id,
          roomId: r.roomId,
          name: r.name,
          description: r.description,
          memberCount: countMap.get(r.id) || 0,
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
    const isMember = room.members.some(m => m.userId === req.userId && !m.leftAt);
    const isApproved = room.members.some(m => m.userId === req.userId && m.joinStatus === 'approved' && !m.leftAt);
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
          isApproved,
          members: room.members.filter(m => !m.leftAt).map(m => {
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
              joinStatus: m.joinStatus,
              applyNote: m.applyNote,
              broughtRelics: JSON.parse(m.broughtRelics || '[]'),
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

// 加入房间（提交申请）
router.post('/:roomId/join', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { characterId, applyNote, broughtRelicIds } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    if (room.status !== 'ACTIVE') {
      throw new AppError('ROOM_CLOSED', '房间已关闭或已开始', 400);
    }

    // 检查是否已在房间中（包括 pending 和 approved）
    const existingMember = room.members.find(m => m.userId === userId && !m.leftAt);
    if (existingMember) {
      throw new AppError('ALREADY_MEMBER', '你已在该房间中', 400);
    }

    // 检查是否已有 pending 申请（未退出的）
    const pendingMember = room.members.find(m => m.userId === userId && m.joinStatus === 'pending' && !m.leftAt);
    if (pendingMember) {
      throw new AppError('PENDING_APPLICATION', '你已提交申请，等待 KP 审核', 400);
    }

    // 校验携带遗物
    let carriedRelics: string[] = [];
    if (broughtRelicIds && Array.isArray(broughtRelicIds) && broughtRelicIds.length > 0) {
      if (broughtRelicIds.length > 2) {
        throw new AppError('TOO_MANY_RELICS', '每场最多携带2件遗物', 400);
      }
      if (characterId) {
        const valid = await prisma.characterRelic.findMany({
          where: { id: { in: broughtRelicIds }, characterId, userId },
        });
        if (valid.length !== broughtRelicIds.length) {
          throw new AppError('INVALID_RELICS', '部分遗物不属于所选角色', 400);
        }
        carriedRelics = broughtRelicIds;
      } else {
        throw new AppError('CHARACTER_REQUIRED', '携带遗物必须同时选择角色卡', 400);
      }
    }

    // 如果之前加入过并已通过审核，直接恢复成员资格
    const previousApproved = room.members.find(m => m.userId === userId && m.joinStatus === 'approved' && m.leftAt);
    if (previousApproved) {
      const member = await prisma.roomMember.update({
        where: { id: previousApproved.id },
        data: {
          leftAt: null,
          lastSeenAt: new Date(),
          characterId: characterId || previousApproved.characterId,
          broughtRelics: JSON.stringify(carriedRelics),
          applyNote: applyNote || previousApproved.applyNote || null,
          submittedAt: new Date(),
        },
      });
      return res.json({
        success: true,
        data: { member },
        message: '欢迎回来，调查员',
      });
    }

    // 加入房间（pending 状态）
    const member = await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId,
        characterId,
        role: 'PLAYER',
        joinStatus: 'pending',
        applyNote: applyNote || null,
        broughtRelics: JSON.stringify(carriedRelics),
        lastSeenAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: { member },
      message: '申请已提交，等待 KP 审核',
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

// ========== 新增：KP审核与游戏开启（v1.5.0 遗物系统）==========

// 获取待审核成员列表 (仅KP)
router.get('/:roomId/applications', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: {
        members: {
          where: { joinStatus: 'pending', leftAt: null },
          include: {
            user: {
              select: { id: true, nickname: true, avatarUrl: true, exp: true },
            },
            character: {
              select: {
                id: true, name: true, occupation: true,
                hp: true, mp: true, san: true,
                maxHp: true, maxMp: true, maxSan: true,
                str: true, dex: true, con: true, siz: true,
                app: true, int: true, pow: true, edu: true,
                luck: true, mov: true, build: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }
    if (room.creatorId !== userId) {
      throw new AppError('FORBIDDEN', '只有KP可以查看审核列表', 403);
    }

    res.json({
      success: true,
      data: {
        applications: room.members.map(m => ({
          id: m.id,
          userId: m.userId,
          nickname: m.user.nickname,
          avatarUrl: m.user.avatarUrl,
          applyNote: m.applyNote,
          broughtRelics: JSON.parse(m.broughtRelics || '[]'),
          character: m.character,
          submittedAt: m.submittedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// KP 审核申请 (仅KP)
router.post('/:roomId/applications/:memberId/review', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, memberId } = req.params;
    const userId = req.userId!;
    const { action, reason } = req.body; // action: 'approve' | 'reject'

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }
    if (room.creatorId !== userId) {
      throw new AppError('FORBIDDEN', '只有KP可以审核成员', 403);
    }

    const member = room.members.find(m => m.id === memberId);
    if (!member || member.joinStatus !== 'pending') {
      throw new AppError('NOT_FOUND', '申请不存在或已处理', 404);
    }

    if (action === 'reject') {
      if (!reason || reason.trim().length < 5) {
        throw new AppError('INVALID_REASON', '拒绝理由至少需要5个字', 400);
      }
      await prisma.roomMember.update({
        where: { id: memberId },
        data: { joinStatus: 'rejected', joinReason: reason.trim(), reviewedAt: new Date(), leftAt: new Date() },
      });
      return res.json({ success: true, message: '已拒绝申请' });
    }

    if (action === 'approve') {
      // 重新校验携带遗物数量
      const relicIds: string[] = JSON.parse(member.broughtRelics || '[]');
      if (relicIds.length > 2) {
        throw new AppError('TOO_MANY_RELICS', '该申请者携带遗物超过2件，无法通过', 400);
      }
      await prisma.roomMember.update({
        where: { id: memberId },
        data: { joinStatus: 'approved', reviewedAt: new Date() },
      });
      return res.json({ success: true, message: '已通过申请' });
    }

    throw new AppError('INVALID_ACTION', '无效的操作', 400);
  } catch (error) {
    next(error);
  }
});

// 游戏开启 (仅KP)
router.post('/:roomId/start', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: { where: { leftAt: null } } },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }
    if (room.creatorId !== userId) {
      throw new AppError('FORBIDDEN', '只有KP可以开启游戏', 403);
    }
    if (room.status === 'PLAYING') {
      throw new AppError('ALREADY_STARTED', '游戏已经开始', 400);
    }
    if (room.status === 'CLOSED') {
      throw new AppError('ROOM_CLOSED', '房间已关闭', 400);
    }

    // 检查是否所有非 KP 成员都已 approved
    const unapproved = room.members.filter(m => m.role !== 'KP' && m.joinStatus !== 'approved');
    if (unapproved.length > 0) {
      throw new AppError('MEMBERS_NOT_READY', `还有 ${unapproved.length} 位成员未通过审核`, 400);
    }

    await prisma.room.update({
      where: { id: room.id },
      data: { status: 'PLAYING' },
    });

    res.json({ success: true, message: '游戏已开始' });
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
    const { atmosphere, sceneDesc, sceneImageUrl, sceneMusicUrl } = req.body;

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
        ...(atmosphere !== undefined && { atmosphere }),
        ...(sceneDesc !== undefined && { sceneDesc }),
        ...(sceneImageUrl !== undefined && { sceneImageUrl }),
        ...(sceneMusicUrl !== undefined && { sceneMusicUrl }),
      },
    });

    res.json({
      success: true,
      data: {
        atmosphere: updatedRoom.atmosphere,
        sceneDesc: updatedRoom.sceneDesc,
        sceneImageUrl: updatedRoom.sceneImageUrl,
        sceneMusicUrl: updatedRoom.sceneMusicUrl,
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

// ========== v1.5.0 房间线索板 ==========

// 获取房间线索列表
router.get('/:roomId/clues', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const isKP = room.members.some(m => m.userId === userId && m.role === 'KP');

    const allClues = await prisma.roomClue.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
    });

    // 非KP只能看到非隐藏线索，或已满足条件的线索（简化：先只过滤 isHidden）
    const visibleClues = isKP
      ? allClues
      : allClues.filter(c => !c.isHidden);

    res.json({ success: true, data: visibleClues });
  } catch (error) {
    next(error);
  }
});

// 创建线索 (KP only)
router.post('/:roomId/clues', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { title, content, imageUrl, isHidden, requiresSkill, requiresValue } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const member = room.members.find(m => m.userId === userId);
    if (!member || member.role !== 'KP') throw new AppError('FORBIDDEN', '只有KP可以创建线索', 403);

    const clue = await prisma.roomClue.create({
      data: {
        roomId: room.id,
        title: title?.trim() || '未命名线索',
        content: content?.trim() || '',
        imageUrl: imageUrl || null,
        isHidden: !!isHidden,
        requiresSkill: requiresSkill || null,
        requiresValue: requiresValue ? parseInt(requiresValue, 10) : null,
      },
    });

    res.json({ success: true, data: clue });
  } catch (error) {
    next(error);
  }
});

// 更新线索 (KP only)
router.patch('/:roomId/clues/:clueId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, clueId } = req.params;
    const userId = req.userId!;
    const { title, content, imageUrl, isHidden, requiresSkill, requiresValue } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const member = room.members.find(m => m.userId === userId);
    if (!member || member.role !== 'KP') throw new AppError('FORBIDDEN', '只有KP可以编辑线索', 403);

    const clue = await prisma.roomClue.update({
      where: { id: clueId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content.trim() }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isHidden !== undefined && { isHidden: !!isHidden }),
        ...(requiresSkill !== undefined && { requiresSkill: requiresSkill || null }),
        ...(requiresValue !== undefined && { requiresValue: requiresValue ? parseInt(requiresValue, 10) : null }),
      },
    });

    res.json({ success: true, data: clue });
  } catch (error) {
    next(error);
  }
});

// 删除线索 (KP only)
router.delete('/:roomId/clues/:clueId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, clueId } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const member = room.members.find(m => m.userId === userId);
    if (!member || member.role !== 'KP') throw new AppError('FORBIDDEN', '只有KP可以删除线索', 403);

    await prisma.roomClue.delete({ where: { id: clueId } });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

// ========== v1.5.0 房间 NPC ==========

// 获取房间 NPC 列表
router.get('/:roomId/npcs', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await prisma.room.findUnique({ where: { roomId } });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const npcs = await prisma.roomNpc.findMany({
      where: { roomId: room.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: npcs });
  } catch (error) {
    next(error);
  }
});

// 创建 NPC (KP only)
router.post('/:roomId/npcs', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { name, avatarUrl, description, statsJson } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const member = room.members.find(m => m.userId === userId);
    if (!member || member.role !== 'KP') throw new AppError('FORBIDDEN', '只有KP可以创建NPC', 403);

    const npc = await prisma.roomNpc.create({
      data: {
        roomId: room.id,
        name: name?.trim() || '未命名NPC',
        avatarUrl: avatarUrl || null,
        description: description?.trim() || '',
        statsJson: statsJson ? JSON.stringify(statsJson) : '{}',
      },
    });

    res.json({ success: true, data: npc });
  } catch (error) {
    next(error);
  }
});

// 更新 NPC (KP only)
router.patch('/:roomId/npcs/:npcId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, npcId } = req.params;
    const userId = req.userId!;
    const { name, avatarUrl, description, statsJson, isActive } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const member = room.members.find(m => m.userId === userId);
    if (!member || member.role !== 'KP') throw new AppError('FORBIDDEN', '只有KP可以编辑NPC', 403);

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
    if (description !== undefined) updateData.description = description.trim();
    if (statsJson !== undefined) updateData.statsJson = JSON.stringify(statsJson);
    if (isActive !== undefined) updateData.isActive = !!isActive;

    const npc = await prisma.roomNpc.update({
      where: { id: npcId },
      data: updateData,
    });

    res.json({ success: true, data: npc });
  } catch (error) {
    next(error);
  }
});

// 删除 NPC (KP only)
router.delete('/:roomId/npcs/:npcId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, npcId } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const member = room.members.find(m => m.userId === userId);
    if (!member || member.role !== 'KP') throw new AppError('FORBIDDEN', '只有KP可以删除NPC', 403);

    await prisma.roomNpc.delete({ where: { id: npcId } });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

export default router;