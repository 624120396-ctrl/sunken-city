import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();

async function requireKP(req: AuthRequest, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { roomId },
    include: { members: { include: { user: { select: { nickname: true } } } } },
  });
  if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
  const member = room.members.find(m => m.userId === req.userId && !m.leftAt);
  if (!member || member.role !== 'KP') {
    throw new AppError('FORBIDDEN', '只有KP可以操作', 403);
  }
  return room;
}

async function requireMember(req: AuthRequest, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { roomId },
    include: { members: { include: { user: { select: { nickname: true } } } } },
  });
  if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
  const member = room.members.find(m => m.userId === req.userId && !m.leftAt);
  if (!member) throw new AppError('FORBIDDEN', '不是房间成员', 403);
  return { room, member };
}

// ===== 创建子房间（仅KP） =====
router.post('/:roomId/sub-rooms', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await requireKP(req, roomId);
    const { name, description, atmosphere, sceneImageUrl, timeMode, sceneDesc, participantUserIds } = req.body;

    const subRoom = await prisma.subRoom.create({
      data: {
        parentRoomId: room.id,
        name,
        description,
        atmosphere: atmosphere || 'normal',
        sceneImageUrl,
        creatorId: req.userId!,
        timeMode: timeMode || 'sync',
        sceneDesc,
      },
    });

    // 自动邀请参与者
    const validMembers = room.members.filter(m => !m.leftAt && participantUserIds?.includes(m.userId));
    for (const m of validMembers) {
      const character = m.characterId ? await prisma.character.findUnique({ where: { id: m.characterId }, select: { name: true, occupation: true, hp: true, mp: true, san: true } }) : null;
      await prisma.subRoomMember.create({
        data: {
          subRoomId: subRoom.id,
          userId: m.userId,
          roomMemberId: m.id,
          characterId: m.characterId,
          characterSnapshot: character ? JSON.stringify(character) : null,
        },
      });
    }

    // 写入主房间事件日志
    await prisma.roomEventLog.create({
      data: {
        roomId: room.id,
        eventType: 'SYSTEM_EVENT',
        payload: JSON.stringify({
          action: '创建子房间',
          subRoomName: subRoom.name,
          participantCount: validMembers.length,
        }),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        subRoom: {
          ...subRoom,
          memberCount: validMembers.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== 获取子房间列表 =====
router.get('/:roomId/sub-rooms', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { room, member } = await requireMember(req, roomId);

    const where: any = { parentRoomId: room.id, status: 'active' };
    // PL 只能看到自己参与的子房间
    if (member.role !== 'KP') {
      const mySubRooms = await prisma.subRoomMember.findMany({
        where: { userId: req.userId! },
        select: { subRoomId: true },
      });
      where.id = { in: mySubRooms.map(s => s.subRoomId) };
    }

    const subRooms = await prisma.subRoom.findMany({
      where,
      include: {
        members: true,
        messages: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 批量获取用户信息
    const userIds = [...new Set((subRooms as any[]).flatMap((s: any) => s.members?.map((m: any) => m.userId) || []))];
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true, avatarUrl: true },
    }) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    res.json({
      success: true,
      data: {
        subRooms: (subRooms as any[]).map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          atmosphere: s.atmosphere,
          sceneImageUrl: s.sceneImageUrl,
          timeMode: s.timeMode,
          status: s.status,
          memberCount: s.members?.filter((m: any) => !m.leftAt).length || 0,
          members: s.members?.filter((m: any) => !m.leftAt).map((m: any) => {
            const u = userMap.get(m.userId);
            return {
              userId: m.userId,
              nickname: u?.nickname || '未知',
              avatarUrl: u?.avatarUrl,
            };
          }) || [],
          lastMessage: s.messages?.[0] ? {
            content: s.messages[0].content.slice(0, 20),
            timestamp: s.messages[0].timestamp,
          } : null,
          isMember: s.members?.some((m: any) => m.userId === req.userId && !m.leftAt) || false,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== 加入子房间 =====
router.post('/:roomId/sub-rooms/:subRoomId/join', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, subRoomId } = req.params;
    const { room, member } = await requireMember(req, roomId);

    const subRoom = await prisma.subRoom.findUnique({
      where: { id: subRoomId },
      include: { members: true },
    });
    if (!subRoom || subRoom.parentRoomId !== room.id) {
      throw new AppError('SUBROOM_NOT_FOUND', '子房间不存在', 404);
    }

    // 检查是否已在子房间中
    const existing = subRoom.members.find(m => m.userId === req.userId && !m.leftAt);
    if (existing) {
      return res.json({ success: true, data: { alreadyJoined: true } });
    }

    // 检查是否被邀请（PL 需要被邀请，KP 可直接加入任何子房间）
    const wasInvited = subRoom.members.some(m => m.userId === req.userId);
    if (member.role !== 'KP' && !wasInvited) {
      throw new AppError('FORBIDDEN', '你未被邀请加入此子房间', 403);
    }

    if (wasInvited) {
      // 恢复已离开的成员
      const leftMember = subRoom.members.find(m => m.userId === req.userId && m.leftAt);
      if (leftMember) {
        await prisma.subRoomMember.update({
          where: { id: leftMember.id },
          data: { leftAt: null },
        });
      }
    } else {
      // KP 首次加入
      await prisma.subRoomMember.create({
        data: {
          subRoomId: subRoom.id,
          userId: req.userId!,
          roomMemberId: member.id,
          characterId: member.characterId,
          role: 'KP',
        },
      });
    }

    res.json({ success: true, data: { message: '已加入子房间' } });
  } catch (error) {
    next(error);
  }
});

// ===== 离开子房间 =====
router.post('/:roomId/sub-rooms/:subRoomId/leave', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, subRoomId } = req.params;
    const { room, member } = await requireMember(req, roomId);

    const subRoomMember = await prisma.subRoomMember.findFirst({
      where: { subRoomId, userId: req.userId!, leftAt: null },
    });
    if (!subRoomMember) {
      throw new AppError('NOT_MEMBER', '不在此子房间中', 400);
    }

    await prisma.subRoomMember.update({
      where: { id: subRoomMember.id },
      data: { leftAt: new Date() },
    });

    res.json({ success: true, message: '已离开子房间' });
  } catch (error) {
    next(error);
  }
});

// ===== 解散子房间（仅KP） =====
router.post('/:roomId/sub-rooms/:subRoomId/dissolve', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, subRoomId } = req.params;
    const { syncEvents = [] } = req.body;
    const room = await requireKP(req, roomId);

    const subRoom = await prisma.subRoom.findUnique({
      where: { id: subRoomId },
      include: { members: true, messages: true, clues: true },
    });
    if (!subRoom || subRoom.parentRoomId !== room.id) {
      throw new AppError('SUBROOM_NOT_FOUND', '子房间不存在', 404);
    }

    // 解散：标记状态，不清除数据
    await prisma.subRoom.update({
      where: { id: subRoomId },
      data: {
        status: 'dissolved',
        dissolvedAt: new Date(),
      },
    });

    // 数据回流（同步事件到主房间）
    for (const event of syncEvents) {
      await prisma.roomEventLog.create({
        data: {
          roomId: room.id,
          eventType: event.type || 'SYSTEM_EVENT',
          payload: JSON.stringify({
            ...event,
            sourceSubRoom: subRoom.name,
            dissolved: true,
          }),
        },
      });
    }

    // 将子房间成员移回主房间
    await prisma.subRoomMember.updateMany({
      where: { subRoomId, leftAt: null },
      data: { leftAt: new Date() },
    });

    res.json({
      success: true,
      data: {
        message: `子房间「${subRoom.name}」已解散`,
        syncEventsCount: syncEvents.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== 子房间消息 =====
router.get('/:roomId/sub-rooms/:subRoomId/messages', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, subRoomId } = req.params;
    const { room, member } = await requireMember(req, roomId);

    const subRoom = await prisma.subRoom.findUnique({
      where: { id: subRoomId },
      include: { members: true },
    });
    if (!subRoom || subRoom.parentRoomId !== room.id) {
      throw new AppError('SUBROOM_NOT_FOUND', '子房间不存在', 404);
    }

    // 检查是否是成员
    const isMember = subRoom.members.some(m => m.userId === req.userId && !m.leftAt);
    if (!isMember && member.role !== 'KP') {
      throw new AppError('FORBIDDEN', '你不是此子房间的成员', 403);
    }

    const messages = await prisma.subRoomMessage.findMany({
      where: { subRoomId },
      orderBy: { timestamp: 'asc' },
      take: 200,
    });

    res.json({ success: true, data: { messages } });
  } catch (error) {
    next(error);
  }
});

export default router;
