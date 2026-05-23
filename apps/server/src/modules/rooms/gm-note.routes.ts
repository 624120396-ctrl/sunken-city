import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();

async function requireKP(req: AuthRequest, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { roomId },
    include: { members: true },
  });
  if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
  const member = room.members.find(m => m.userId === req.userId);
  if (!member || member.role !== 'KP') {
    throw new AppError('FORBIDDEN', '只有KP可以操作', 403);
  }
  return room;
}

// 创建GM笔记
router.post('/:roomId/gm-notes', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await requireKP(req, roomId);
    const { title, content, tags } = req.body;

    const note = await prisma.gmNote.create({
      data: {
        roomId: room.id,
        userId: req.userId!,
        title,
        content: content || '',
        tags: JSON.stringify(tags || []),
      },
    });

    res.status(201).json({ success: true, data: { note } });
  } catch (error) {
    next(error);
  }
});

// 获取GM笔记列表
router.get('/:roomId/gm-notes', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await requireKP(req, roomId);

    const notes = await prisma.gmNote.findMany({
      where: { roomId: room.id },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        notes: notes.map(n => ({
          ...n,
          tags: JSON.parse(n.tags || '[]'),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 更新GM笔记
router.patch('/:roomId/gm-notes/:noteId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, noteId } = req.params;
    await requireKP(req, roomId);

    const { title, content, tags } = req.body;
    const note = await prisma.gmNote.update({
      where: { id: noteId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
      },
    });

    res.json({ success: true, data: { note: { ...note, tags: JSON.parse(note.tags || '[]') } } });
  } catch (error) {
    next(error);
  }
});

// 删除GM笔记
router.delete('/:roomId/gm-notes/:noteId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, noteId } = req.params;
    await requireKP(req, roomId);

    await prisma.gmNote.delete({ where: { id: noteId } });
    res.json({ success: true, message: '笔记已删除' });
  } catch (error) {
    next(error);
  }
});

export default router;
