import { NextFunction, Response } from 'express';
import { ZodError, z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';

const currentFocusPayloadSchema = z.object({
  lastRecap: z.string().max(6000).optional(),
  currentObjective: z.string().max(1200).optional(),
  unresolvedQuestions: z.array(z.string().min(1).max(200)).optional(),
  pinnedMessage: z.string().max(1200).optional(),
  keeperNotes: z.string().max(4000).optional(),
});

function parseQuestions(value: string): string[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function serializeCurrentFocus(focus: {
  id: string;
  roomId: string;
  lastRecap: string;
  currentObjective: string;
  unresolvedQuestions: string;
  pinnedMessage: string;
  keeperNotes: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}, includeKeeperFields: boolean) {
  return {
    ...focus,
    unresolvedQuestions: parseQuestions(focus.unresolvedQuestions),
    keeperNotes: includeKeeperFields ? focus.keeperNotes : undefined,
    createdAt: focus.createdAt.toISOString(),
    updatedAt: focus.updatedAt.toISOString(),
  };
}

export async function getCurrentFocus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room, capabilities } = await requireRoomCapability(roomId, req.userId, 'canViewPublicContent');

    const focus = await prisma.roomCurrentFocus.findUnique({
      where: { roomId: room.id },
    });

    res.json({
      success: true,
      data: {
        focus: focus ? serializeCurrentFocus(focus, capabilities.canUseKPTools) : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function saveCurrentFocus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canUseKPTools');
    const payload = currentFocusPayloadSchema.parse(req.body ?? {});

    const focus = await prisma.roomCurrentFocus.upsert({
      where: { roomId: room.id },
      create: {
        roomId: room.id,
        lastRecap: payload.lastRecap ?? '',
        currentObjective: payload.currentObjective ?? '',
        unresolvedQuestions: JSON.stringify(payload.unresolvedQuestions ?? []),
        pinnedMessage: payload.pinnedMessage ?? '',
        keeperNotes: payload.keeperNotes ?? '',
        updatedById: req.userId ?? null,
      },
      update: {
        ...(payload.lastRecap !== undefined ? { lastRecap: payload.lastRecap } : {}),
        ...(payload.currentObjective !== undefined ? { currentObjective: payload.currentObjective } : {}),
        ...(payload.unresolvedQuestions !== undefined ? { unresolvedQuestions: JSON.stringify(payload.unresolvedQuestions) } : {}),
        ...(payload.pinnedMessage !== undefined ? { pinnedMessage: payload.pinnedMessage } : {}),
        ...(payload.keeperNotes !== undefined ? { keeperNotes: payload.keeperNotes } : {}),
        updatedById: req.userId ?? null,
      },
    });

    res.json({
      success: true,
      data: { focus: serializeCurrentFocus(focus, true) },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_CURRENT_FOCUS_PAYLOAD', '当前焦点数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}
