import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { requireRoomCapability } from './room-auth';

const router = Router();

// 创建线索
router.post('/:roomId/clues', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageClues');
    const { title, content, imageUrl, isHidden, requiresSkill, requiresValue,
            discoverySkill, discoveryThreshold, autoReveal } = req.body;

    const clue = await prisma.roomClue.create({
      data: {
        roomId: room.id,
        title,
        content,
        imageUrl,
        isHidden: isHidden ?? false,
        requiresSkill,
        requiresValue,
        discoverySkill,
        discoveryThreshold: discoveryThreshold ?? 50,
        autoReveal: autoReveal ?? false,
      },
    });

    res.status(201).json({ success: true, data: { clue } });
  } catch (error) {
    next(error);
  }
});

// 获取线索列表（PL 只能看已揭示的，KP 可以看全部）
router.get('/:roomId/clues', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const member = room.members.find(m => m.userId === req.userId);
    if (!member) throw new AppError('FORBIDDEN', '不是房间成员', 403);

    const isKP = member.role === 'KP';
    const where: any = { roomId: room.id };
    if (!isKP) {
      where.isHidden = false;
    }

    const clues = await prisma.roomClue.findMany({ where, orderBy: { createdAt: 'asc' } });

    res.json({
      success: true,
      data: {
        clues: clues.map(c => ({
          ...c,
          content: (!isKP && c.isHidden) ? undefined : c.content,
          imageUrl: (!isKP && c.isHidden) ? undefined : c.imageUrl,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 揭示线索（检定成功后调用，或KP手动揭示）
router.post('/:roomId/clues/:clueId/reveal', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, clueId } = req.params;
    const { characterId, characterName } = req.body;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const member = room.members.find(m => m.userId === req.userId);
    if (!member) throw new AppError('FORBIDDEN', '不是房间成员', 403);

    // KP 可以手动揭示，PL 只能揭示满足条件的线索
    const clue = await prisma.roomClue.findUnique({ where: { id: clueId } });
    if (!clue || clue.roomId !== room.id) {
      throw new AppError('CLUE_NOT_FOUND', '线索不存在', 404);
    }

    if (!clue.isHidden) {
      return res.json({ success: true, data: { clue, alreadyRevealed: true } });
    }

    const isKP = member.role === 'KP';
    if (isKP) {
      await requireRoomCapability(roomId, req.userId, 'canManageClues');
    }
    if (!isKP && !clue.autoReveal) {
      throw new AppError('FORBIDDEN', '此线索需要KP揭示', 403);
    }
    if (!isKP) {
      await requireRoomCapability(roomId, req.userId, 'canSendPublicMessage');
    }

    const updated = await prisma.roomClue.update({
      where: { id: clueId },
      data: {
        isHidden: false,
        discoveredByUserId: req.userId,
        discoveredAt: new Date(),
      },
    });

    // 写入事件日志
    await prisma.roomEventLog.create({
      data: {
        roomId: room.id,
        eventType: 'CLUE_DISCOVERED',
        payload: JSON.stringify({
          clueId: updated.id,
          clueTitle: updated.title,
          discoveredBy: characterName || (await prisma.user.findUnique({ where: { id: req.userId! }, select: { nickname: true } }))?.nickname || '玩家',
          characterId,
        }),
        userId: req.userId,
      },
    });

    res.json({ success: true, data: { clue: updated } });
  } catch (error) {
    next(error);
  }
});

// 更新线索（仅KP）
router.patch('/:roomId/clues/:clueId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, clueId } = req.params;
    await requireRoomCapability(roomId, req.userId, 'canManageClues');

    const { title, content, imageUrl, isHidden, requiresSkill, requiresValue,
            discoverySkill, discoveryThreshold, autoReveal } = req.body;

    const clue = await prisma.roomClue.update({
      where: { id: clueId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isHidden !== undefined && { isHidden }),
        ...(requiresSkill !== undefined && { requiresSkill }),
        ...(requiresValue !== undefined && { requiresValue }),
        ...(discoverySkill !== undefined && { discoverySkill }),
        ...(discoveryThreshold !== undefined && { discoveryThreshold }),
        ...(autoReveal !== undefined && { autoReveal }),
      },
    });

    res.json({ success: true, data: { clue } });
  } catch (error) {
    next(error);
  }
});

// 删除线索（仅KP）
router.delete('/:roomId/clues/:clueId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, clueId } = req.params;
    await requireRoomCapability(roomId, req.userId, 'canManageClues');

    await prisma.roomClue.delete({ where: { id: clueId } });
    res.json({ success: true, message: '线索已删除' });
  } catch (error) {
    next(error);
  }
});

export default router;
