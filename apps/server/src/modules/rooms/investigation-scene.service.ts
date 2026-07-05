import { NextFunction, Response } from 'express';
import { ZodError, z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';
import { createInvestigationLogEntry } from './investigation-log.service';

const scenePayloadSchema = z.object({
  title: z.string().min(1).max(100),
  publicSummary: z.string().max(4000).default(''),
  keeperNotes: z.string().max(4000).default(''),
  atmosphere: z.string().max(40).default('normal'),
  imageUrl: z.string().max(500).nullable().optional(),
  isCurrent: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const scenePatchSchema = scenePayloadSchema.partial();

function serializeScene(scene: {
  id: string;
  roomId: string;
  title: string;
  publicSummary: string;
  keeperNotes: string;
  atmosphere: string;
  imageUrl: string | null;
  isCurrent: boolean;
  sortOrder: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}, includeKeeperNotes: boolean) {
  const view: Record<string, unknown> = {
    ...scene,
    createdAt: scene.createdAt.toISOString(),
    updatedAt: scene.updatedAt.toISOString(),
  };
  if (!includeKeeperNotes) {
    delete view.keeperNotes;
  }
  return view;
}

export async function getInvestigationScenes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room, capabilities } = await requireRoomCapability(roomId, req.userId, 'canViewPublicContent');

    const scenes = await prisma.investigationScene.findMany({
      where: { roomId: room.id },
      orderBy: [{ isCurrent: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    res.json({
      success: true,
      data: { scenes: scenes.map(scene => serializeScene(scene, capabilities.canManageScene)) },
    });
  } catch (error) {
    next(error);
  }
}

export async function createInvestigationScene(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageScene');
    const payload = scenePayloadSchema.parse(req.body ?? {});

    const scene = await prisma.$transaction(async tx => {
      if (payload.isCurrent) {
        await tx.investigationScene.updateMany({
          where: { roomId: room.id },
          data: { isCurrent: false },
        });
      }

      const created = await tx.investigationScene.create({
        data: {
          roomId: room.id,
          title: payload.title,
          publicSummary: payload.publicSummary,
          keeperNotes: payload.keeperNotes,
          atmosphere: payload.atmosphere,
          imageUrl: payload.imageUrl ?? null,
          isCurrent: payload.isCurrent ?? false,
          sortOrder: payload.sortOrder ?? 0,
          createdById: req.userId!,
        },
      });

      if (created.isCurrent) {
        await createInvestigationLogEntry(tx, {
          roomId: room.id,
          eventType: 'SCENE_CHANGED',
          title: `当前场景：${created.title}`,
          content: created.publicSummary || null,
          payload: { sceneId: created.id },
          visibility: 'PUBLIC',
          createdById: req.userId ?? null,
        });
      }

      return created;
    });

    res.status(201).json({ success: true, data: { scene: serializeScene(scene, true) } });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_INVESTIGATION_SCENE_PAYLOAD', '场景数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function updateInvestigationScene(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, sceneId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageScene');
    const payload = scenePatchSchema.parse(req.body ?? {});

    const existing = await prisma.investigationScene.findFirst({
      where: { id: sceneId, roomId: room.id },
    });
    if (!existing) {
      throw new AppError('INVESTIGATION_SCENE_NOT_FOUND', '场景不存在', 404);
    }

    const scene = await prisma.$transaction(async tx => {
      if (payload.isCurrent) {
        await tx.investigationScene.updateMany({
          where: { roomId: room.id },
          data: { isCurrent: false },
        });
      }

      const updated = await tx.investigationScene.update({
        where: { id: sceneId },
        data: {
          ...(payload.title !== undefined ? { title: payload.title } : {}),
          ...(payload.publicSummary !== undefined ? { publicSummary: payload.publicSummary } : {}),
          ...(payload.keeperNotes !== undefined ? { keeperNotes: payload.keeperNotes } : {}),
          ...(payload.atmosphere !== undefined ? { atmosphere: payload.atmosphere } : {}),
          ...(payload.imageUrl !== undefined ? { imageUrl: payload.imageUrl } : {}),
          ...(payload.isCurrent !== undefined ? { isCurrent: payload.isCurrent } : {}),
          ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
        },
      });

      if (payload.isCurrent && !existing.isCurrent) {
        await createInvestigationLogEntry(tx, {
          roomId: room.id,
          eventType: 'SCENE_CHANGED',
          title: `当前场景：${updated.title}`,
          content: updated.publicSummary || null,
          payload: { sceneId: updated.id },
          visibility: 'PUBLIC',
          createdById: req.userId ?? null,
        });
      }

      return updated;
    });

    res.json({ success: true, data: { scene: serializeScene(scene, true) } });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_INVESTIGATION_SCENE_PAYLOAD', '场景数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function setCurrentInvestigationScene(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, sceneId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageScene');

    const existing = await prisma.investigationScene.findFirst({
      where: { id: sceneId, roomId: room.id },
    });
    if (!existing) {
      throw new AppError('INVESTIGATION_SCENE_NOT_FOUND', '场景不存在', 404);
    }

    const scene = await prisma.$transaction(async tx => {
      await tx.investigationScene.updateMany({
        where: { roomId: room.id },
        data: { isCurrent: false },
      });

      const updated = await tx.investigationScene.update({
        where: { id: sceneId },
        data: { isCurrent: true },
      });

      if (!existing.isCurrent) {
        await createInvestigationLogEntry(tx, {
          roomId: room.id,
          eventType: 'SCENE_CHANGED',
          title: `当前场景：${updated.title}`,
          content: updated.publicSummary || null,
          payload: { sceneId: updated.id },
          visibility: 'PUBLIC',
          createdById: req.userId ?? null,
        });
      }

      return updated;
    });

    res.json({ success: true, data: { scene: serializeScene(scene, true) } });
  } catch (error) {
    next(error);
  }
}

export async function deleteInvestigationScene(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, sceneId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageScene');

    const existing = await prisma.investigationScene.findFirst({
      where: { id: sceneId, roomId: room.id },
      select: { id: true },
    });
    if (!existing) {
      throw new AppError('INVESTIGATION_SCENE_NOT_FOUND', '场景不存在', 404);
    }

    await prisma.investigationScene.delete({ where: { id: sceneId } });
    res.json({ success: true, message: '场景已删除' });
  } catch (error) {
    next(error);
  }
}
