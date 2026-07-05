import { NextFunction, Response } from 'express';
import { ZodError, z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';
import { createInvestigationLogEntry } from './investigation-log.service';

const npcStatusSchema = z.enum(['UNSEEN', 'APPEARED', 'MISSING', 'DEAD', 'SUSPECT', 'ALLY', 'HOSTILE']);
const investigationVisibilitySchema = z.enum(['KP_ONLY', 'PUBLIC']);

const npcPayloadSchema = z.object({
  name: z.string().min(1).max(80),
  avatarUrl: z.string().max(500).nullable().optional(),
  publicProfile: z.string().max(4000).default(''),
  keeperNotes: z.string().max(4000).default(''),
  status: npcStatusSchema.optional(),
  visibility: investigationVisibilitySchema.optional(),
});

const npcPatchSchema = npcPayloadSchema.partial();

function serializeNpc(npc: {
  id: string;
  roomId: string;
  name: string;
  avatarUrl: string | null;
  publicProfile: string;
  keeperNotes: string;
  status: string;
  visibility: string;
  createdById: string;
  revealedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}, includeKeeperNotes: boolean) {
  const view: Record<string, unknown> = {
    ...npc,
    revealedAt: npc.revealedAt?.toISOString() ?? null,
    createdAt: npc.createdAt.toISOString(),
    updatedAt: npc.updatedAt.toISOString(),
  };
  if (!includeKeeperNotes) {
    delete view.keeperNotes;
  }
  return view;
}

export async function getInvestigationNpcs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room, capabilities } = await requireRoomCapability(roomId, req.userId, 'canViewPublicContent');

    const npcs = await prisma.investigationNpc.findMany({
      where: {
        roomId: room.id,
        ...(capabilities.canManageNpcs ? {} : { visibility: 'PUBLIC' }),
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    res.json({
      success: true,
      data: { npcs: npcs.map(npc => serializeNpc(npc, capabilities.canManageNpcs)) },
    });
  } catch (error) {
    next(error);
  }
}

export async function createInvestigationNpc(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageNpcs');
    const payload = npcPayloadSchema.parse(req.body ?? {});
    const isPublic = payload.visibility === 'PUBLIC';

    const npc = await prisma.$transaction(async tx => {
      const created = await tx.investigationNpc.create({
        data: {
          roomId: room.id,
          name: payload.name,
          avatarUrl: payload.avatarUrl ?? null,
          publicProfile: payload.publicProfile,
          keeperNotes: payload.keeperNotes,
          status: payload.status ?? (isPublic ? 'APPEARED' : 'UNSEEN'),
          visibility: payload.visibility ?? 'KP_ONLY',
          createdById: req.userId!,
          revealedAt: isPublic ? new Date() : null,
        },
      });

      if (isPublic) {
        await createInvestigationLogEntry(tx, {
          roomId: room.id,
          eventType: 'NPC_REVEALED',
          title: `NPC 登场：${created.name}`,
          payload: { npcId: created.id },
          visibility: 'PUBLIC',
          createdById: req.userId ?? null,
        });
      }

      return created;
    });

    res.status(201).json({ success: true, data: { npc: serializeNpc(npc, true) } });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_INVESTIGATION_NPC_PAYLOAD', 'NPC 数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function updateInvestigationNpc(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, npcId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageNpcs');
    const payload = npcPatchSchema.parse(req.body ?? {});

    const existing = await prisma.investigationNpc.findFirst({
      where: { id: npcId, roomId: room.id },
    });
    if (!existing) {
      throw new AppError('INVESTIGATION_NPC_NOT_FOUND', 'NPC 不存在', 404);
    }

    const shouldReveal = existing.visibility !== 'PUBLIC' && payload.visibility === 'PUBLIC';

    const npc = await prisma.$transaction(async tx => {
      const updated = await tx.investigationNpc.update({
        where: { id: npcId },
        data: {
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
          ...(payload.publicProfile !== undefined ? { publicProfile: payload.publicProfile } : {}),
          ...(payload.keeperNotes !== undefined ? { keeperNotes: payload.keeperNotes } : {}),
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
          ...(shouldReveal ? { revealedAt: new Date(), status: payload.status ?? 'APPEARED' } : {}),
        },
      });

      if (shouldReveal) {
        await createInvestigationLogEntry(tx, {
          roomId: room.id,
          eventType: 'NPC_REVEALED',
          title: `NPC 登场：${updated.name}`,
          payload: { npcId: updated.id },
          visibility: 'PUBLIC',
          createdById: req.userId ?? null,
        });
      }

      return updated;
    });

    res.json({ success: true, data: { npc: serializeNpc(npc, true) } });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_INVESTIGATION_NPC_PAYLOAD', 'NPC 数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function revealInvestigationNpc(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, npcId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageNpcs');

    const existing = await prisma.investigationNpc.findFirst({
      where: { id: npcId, roomId: room.id },
    });
    if (!existing) {
      throw new AppError('INVESTIGATION_NPC_NOT_FOUND', 'NPC 不存在', 404);
    }

    if (existing.visibility === 'PUBLIC') {
      return res.json({ success: true, data: { npc: serializeNpc(existing, true), alreadyRevealed: true } });
    }

    const npc = await prisma.$transaction(async tx => {
      const updated = await tx.investigationNpc.update({
        where: { id: npcId },
        data: {
          visibility: 'PUBLIC',
          status: existing.status === 'UNSEEN' ? 'APPEARED' : existing.status,
          revealedAt: new Date(),
        },
      });

      await createInvestigationLogEntry(tx, {
        roomId: room.id,
        eventType: 'NPC_REVEALED',
        title: `NPC 登场：${updated.name}`,
        payload: { npcId: updated.id },
        visibility: 'PUBLIC',
        createdById: req.userId ?? null,
      });

      return updated;
    });

    res.json({ success: true, data: { npc: serializeNpc(npc, true) } });
  } catch (error) {
    next(error);
  }
}

export async function deleteInvestigationNpc(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, npcId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageNpcs');

    const existing = await prisma.investigationNpc.findFirst({
      where: { id: npcId, roomId: room.id },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError('INVESTIGATION_NPC_NOT_FOUND', 'NPC 不存在', 404);
    }

    await prisma.investigationNpc.delete({ where: { id: npcId } });
    res.json({ success: true, message: 'NPC 已删除' });
  } catch (error) {
    next(error);
  }
}
