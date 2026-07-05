import { NextFunction, Response } from 'express';
import { ZodError, z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';

const kpNotePayloadSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().max(8000).default(''),
  tags: z.array(z.string().max(40)).optional(),
});

const kpNotePatchSchema = kpNotePayloadSchema.partial();

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter(tag => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

function serializeKpNote(note: {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  content: string;
  tags: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...note,
    tags: parseTags(note.tags),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export async function getKpPrivateNotes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canUseKPTools');

    const notes = await prisma.kpPrivateNote.findMany({
      where: { roomId: room.id, userId: req.userId! },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: { notes: notes.map(serializeKpNote) } });
  } catch (error) {
    next(error);
  }
}

export async function createKpPrivateNote(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canUseKPTools');
    const payload = kpNotePayloadSchema.parse(req.body ?? {});

    const note = await prisma.kpPrivateNote.create({
      data: {
        roomId: room.id,
        userId: req.userId!,
        title: payload.title,
        content: payload.content,
        tags: JSON.stringify(payload.tags ?? []),
      },
    });

    res.status(201).json({ success: true, data: { note: serializeKpNote(note) } });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_KP_PRIVATE_NOTE_PAYLOAD', 'KP 便签数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function updateKpPrivateNote(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, noteId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canUseKPTools');
    const payload = kpNotePatchSchema.parse(req.body ?? {});

    const existing = await prisma.kpPrivateNote.findFirst({
      where: { id: noteId, roomId: room.id, userId: req.userId! },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError('KP_PRIVATE_NOTE_NOT_FOUND', 'KP 便签不存在', 404);
    }

    const note = await prisma.kpPrivateNote.update({
      where: { id: noteId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.content !== undefined ? { content: payload.content } : {}),
        ...(payload.tags !== undefined ? { tags: JSON.stringify(payload.tags) } : {}),
      },
    });

    res.json({ success: true, data: { note: serializeKpNote(note) } });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_KP_PRIVATE_NOTE_PAYLOAD', 'KP 便签数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function deleteKpPrivateNote(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, noteId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canUseKPTools');

    const existing = await prisma.kpPrivateNote.findFirst({
      where: { id: noteId, roomId: room.id, userId: req.userId! },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError('KP_PRIVATE_NOTE_NOT_FOUND', 'KP 便签不存在', 404);
    }

    await prisma.kpPrivateNote.delete({ where: { id: noteId } });
    res.json({ success: true, message: 'KP 便签已删除' });
  } catch (error) {
    next(error);
  }
}
