import { NextFunction, Response } from 'express';
import { ZodError, z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';
import { createInvestigationLogEntry } from './investigation-log.service';

const clueStatusSchema = z.enum(['UNREVEALED', 'REVEALED', 'ANALYZED', 'KEY', 'DOUBTFUL']);
const investigationVisibilitySchema = z.enum(['KP_ONLY', 'PUBLIC']);

const cluePayloadSchema = z.object({
  title: z.string().min(1).max(80),
  content: z.string().max(4000).default(''),
  source: z.string().max(120).nullable().optional(),
  status: clueStatusSchema.optional(),
  visibility: investigationVisibilitySchema.optional(),
  npcId: z.string().nullable().optional(),
  sceneId: z.string().nullable().optional(),
});

const cluePatchSchema = cluePayloadSchema.partial();

function serializeClue(clue: {
  id: string;
  roomId: string;
  title: string;
  content: string;
  source: string | null;
  status: string;
  visibility: string;
  npcId: string | null;
  sceneId: string | null;
  createdById: string;
  revealedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...clue,
    revealedAt: clue.revealedAt?.toISOString() ?? null,
    createdAt: clue.createdAt.toISOString(),
    updatedAt: clue.updatedAt.toISOString(),
  };
}

export async function getInvestigationClues(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room, capabilities } = await requireRoomCapability(roomId, req.userId, 'canViewPublicContent');

    const clues = await prisma.investigationClue.findMany({
      where: {
        roomId: room.id,
        ...(capabilities.canManageClues ? {} : { visibility: 'PUBLIC' }),
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    res.json({ success: true, data: { clues: clues.map(serializeClue) } });
  } catch (error) {
    next(error);
  }
}

export async function createInvestigationClue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageClues');
    const payload = cluePayloadSchema.parse(req.body ?? {});
    const isPublic = payload.visibility === 'PUBLIC';

    const clue = await prisma.$transaction(async tx => {
      const created = await tx.investigationClue.create({
        data: {
          roomId: room.id,
          title: payload.title,
          content: payload.content,
          source: payload.source ?? null,
          status: payload.status ?? (isPublic ? 'REVEALED' : 'UNREVEALED'),
          visibility: payload.visibility ?? 'KP_ONLY',
          npcId: payload.npcId ?? null,
          sceneId: payload.sceneId ?? null,
          createdById: req.userId!,
          revealedAt: isPublic ? new Date() : null,
        },
      });

      if (isPublic) {
        await createInvestigationLogEntry(tx, {
          roomId: room.id,
          eventType: 'CLUE_REVEALED',
          title: `发现线索：${created.title}`,
          payload: { clueId: created.id },
          visibility: 'PUBLIC',
          createdById: req.userId ?? null,
        });
      }

      return created;
    });

    res.status(201).json({ success: true, data: { clue: serializeClue(clue) } });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_INVESTIGATION_CLUE_PAYLOAD', '线索数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function updateInvestigationClue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, clueId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageClues');
    const payload = cluePatchSchema.parse(req.body ?? {});

    const existing = await prisma.investigationClue.findFirst({
      where: { id: clueId, roomId: room.id },
    });
    if (!existing) {
      throw new AppError('INVESTIGATION_CLUE_NOT_FOUND', '线索不存在', 404);
    }

    const shouldReveal = existing.visibility !== 'PUBLIC' && payload.visibility === 'PUBLIC';

    const clue = await prisma.$transaction(async tx => {
      const updated = await tx.investigationClue.update({
        where: { id: clueId },
        data: {
          ...(payload.title !== undefined ? { title: payload.title } : {}),
          ...(payload.content !== undefined ? { content: payload.content } : {}),
          ...(payload.source !== undefined ? { source: payload.source } : {}),
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
          ...(payload.npcId !== undefined ? { npcId: payload.npcId } : {}),
          ...(payload.sceneId !== undefined ? { sceneId: payload.sceneId } : {}),
          ...(shouldReveal ? { revealedAt: new Date(), status: payload.status ?? 'REVEALED' } : {}),
        },
      });

      if (shouldReveal) {
        await createInvestigationLogEntry(tx, {
          roomId: room.id,
          eventType: 'CLUE_REVEALED',
          title: `发现线索：${updated.title}`,
          payload: { clueId: updated.id },
          visibility: 'PUBLIC',
          createdById: req.userId ?? null,
        });
      }

      return updated;
    });

    res.json({ success: true, data: { clue: serializeClue(clue) } });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_INVESTIGATION_CLUE_PAYLOAD', '线索数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function revealInvestigationClue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, clueId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageClues');

    const existing = await prisma.investigationClue.findFirst({
      where: { id: clueId, roomId: room.id },
    });
    if (!existing) {
      throw new AppError('INVESTIGATION_CLUE_NOT_FOUND', '线索不存在', 404);
    }

    if (existing.visibility === 'PUBLIC') {
      return res.json({ success: true, data: { clue: serializeClue(existing), alreadyRevealed: true } });
    }

    const clue = await prisma.$transaction(async tx => {
      const updated = await tx.investigationClue.update({
        where: { id: clueId },
        data: {
          visibility: 'PUBLIC',
          status: existing.status === 'UNREVEALED' ? 'REVEALED' : existing.status,
          revealedAt: new Date(),
        },
      });

      await createInvestigationLogEntry(tx, {
        roomId: room.id,
        eventType: 'CLUE_REVEALED',
        title: `发现线索：${updated.title}`,
        payload: { clueId: updated.id },
        visibility: 'PUBLIC',
        createdById: req.userId ?? null,
      });

      return updated;
    });

    res.json({ success: true, data: { clue: serializeClue(clue) } });
  } catch (error) {
    next(error);
  }
}

export async function deleteInvestigationClue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, clueId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageClues');

    const existing = await prisma.investigationClue.findFirst({
      where: { id: clueId, roomId: room.id },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError('INVESTIGATION_CLUE_NOT_FOUND', '线索不存在', 404);
    }

    await prisma.investigationClue.delete({ where: { id: clueId } });
    res.json({ success: true, message: '线索已删除' });
  } catch (error) {
    next(error);
  }
}
