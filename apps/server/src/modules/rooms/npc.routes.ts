import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { requireRoomCapability } from './room-auth';

const router = Router();

// 创建NPC
router.post('/:roomId/npcs', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageNpcs');
    const { name, avatarUrl, description, sceneId, statsJson, dynamicStats } = req.body;

    const npc = await prisma.roomNpc.create({
      data: {
        roomId: room.id,
        name,
        avatarUrl,
        description,
        sceneId: sceneId || null,
        statsJson: statsJson ? JSON.stringify(statsJson) : '{}',
        dynamicStats: dynamicStats ? JSON.stringify(dynamicStats) : '{}',
      },
    });

    res.status(201).json({ success: true, data: { npc } });
  } catch (error) {
    next(error);
  }
});

// 获取NPC列表（按场景过滤）
router.get('/:roomId/npcs', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { sceneId } = req.query;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const member = room.members.find(m => m.userId === req.userId);
    if (!member) throw new AppError('FORBIDDEN', '不是房间成员', 403);

    const where: any = { roomId: room.id };
    if (sceneId) {
      where.OR = [
        { sceneId: sceneId as string },
        { sceneId: null }, // 全局NPC
      ];
    }

    const npcs = await prisma.roomNpc.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: { npcs } });
  } catch (error) {
    next(error);
  }
});

// 更新NPC
router.patch('/:roomId/npcs/:npcId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, npcId } = req.params;
    await requireRoomCapability(roomId, req.userId, 'canManageNpcs');

    const { name, avatarUrl, description, sceneId, isActive, statsJson, dynamicStats, isActiveInScene } = req.body;

    const npc = await prisma.roomNpc.update({
      where: { id: npcId },
      data: {
        ...(name !== undefined && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(description !== undefined && { description }),
        ...(sceneId !== undefined && { sceneId }),
        ...(isActive !== undefined && { isActive }),
        ...(statsJson !== undefined && { statsJson: JSON.stringify(statsJson) }),
        ...(dynamicStats !== undefined && { dynamicStats: JSON.stringify(dynamicStats) }),
        ...(isActiveInScene !== undefined && { isActiveInScene }),
      },
    });

    res.json({ success: true, data: { npc } });
  } catch (error) {
    next(error);
  }
});

// 切换NPC在场状态
router.post('/:roomId/npcs/:npcId/toggle', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, npcId } = req.params;
    await requireRoomCapability(roomId, req.userId, 'canManageNpcs');

    const npc = await prisma.roomNpc.findUnique({ where: { id: npcId } });
    if (!npc) throw new AppError('NPC_NOT_FOUND', 'NPC不存在', 404);

    const updated = await prisma.roomNpc.update({
      where: { id: npcId },
      data: { isActive: !npc.isActive },
    });

    res.json({ success: true, data: { npc: updated } });
  } catch (error) {
    next(error);
  }
});

// 删除NPC
router.delete('/:roomId/npcs/:npcId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, npcId } = req.params;
    await requireRoomCapability(roomId, req.userId, 'canManageNpcs');

    await prisma.roomNpc.delete({ where: { id: npcId } });
    res.json({ success: true, message: 'NPC已删除' });
  } catch (error) {
    next(error);
  }
});

export default router;
