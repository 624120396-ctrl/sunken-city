import { NextFunction, Response } from 'express';
import { ZodError, z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';

const logVisibilitySchema = z.enum(['PUBLIC', 'KP_ONLY']);
const manualLogTypeSchema = z.enum(['IMPORTANT_MESSAGE', 'KP_NOTE_MARKER', 'DICE_KEY']);

const manualLogPayloadSchema = z.object({
  eventType: manualLogTypeSchema,
  title: z.string().min(1).max(120),
  content: z.string().max(4000).nullable().optional(),
  payload: z.unknown().optional(),
  visibility: logVisibilitySchema.default('PUBLIC'),
  isPinned: z.boolean().optional(),
});

const pinPayloadSchema = z.object({
  isPinned: z.boolean(),
});

const importantMessagePayloadSchema = z.object({
  messageId: z.string().max(80).optional(),
  title: z.string().min(1).max(120).optional(),
  content: z.string().min(1).max(4000),
  nickname: z.string().max(80).optional(),
  timestamp: z.string().max(80).optional(),
  visibility: logVisibilitySchema.default('PUBLIC'),
  isPinned: z.boolean().default(true),
});

const keyDicePayloadSchema = z.object({
  diceRollId: z.string().max(80).optional(),
  title: z.string().min(1).max(120).optional(),
  rollType: z.string().max(40).optional(),
  targetName: z.string().max(80).nullable().optional(),
  targetValue: z.number().int().nullable().optional(),
  rollResult: z.number().int().optional(),
  successLevel: z.string().max(40).nullable().optional(),
  nickname: z.string().max(80).optional(),
  timestamp: z.string().max(80).optional(),
  visibility: logVisibilitySchema.default('PUBLIC'),
  isPinned: z.boolean().default(false),
});

function parsePayload(value: string): unknown {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function serializeLogEntry(entry: {
  id: string;
  roomId: string;
  eventType: string;
  title: string;
  content: string | null;
  payload: string;
  visibility: string;
  isPinned: boolean;
  createdById: string | null;
  createdAt: Date;
}) {
  return {
    ...entry,
    payload: parsePayload(entry.payload),
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function createInvestigationLogEntry(
  db: Pick<typeof prisma, 'investigationLogEntry'>,
  data: {
    roomId: string;
    eventType: string;
    title: string;
    content?: string | null;
    payload?: unknown;
    visibility?: 'PUBLIC' | 'KP_ONLY';
    isPinned?: boolean;
    createdById?: string | null;
  }
) {
  return db.investigationLogEntry.create({
    data: {
      roomId: data.roomId,
      eventType: data.eventType,
      title: data.title,
      content: data.content ?? null,
      payload: JSON.stringify(data.payload ?? {}),
      visibility: data.visibility ?? 'PUBLIC',
      isPinned: data.isPinned ?? false,
      createdById: data.createdById ?? null,
    },
  });
}

export async function getInvestigationTimeline(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room, capabilities } = await requireRoomCapability(roomId, req.userId, 'canViewPublicContent');

    const entries = await prisma.investigationLogEntry.findMany({
      where: {
        roomId: room.id,
        ...(capabilities.canUseKPTools ? {} : { visibility: 'PUBLIC' }),
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    res.json({
      success: true,
      data: { entries: entries.map(serializeLogEntry) },
    });
  } catch (error) {
    next(error);
  }
}

export async function createManualInvestigationLog(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canUseKPTools');
    const payload = manualLogPayloadSchema.parse(req.body ?? {});

    const entry = await createInvestigationLogEntry(prisma, {
      roomId: room.id,
      eventType: payload.eventType,
      title: payload.title,
      content: payload.content ?? null,
      payload: payload.payload,
      visibility: payload.visibility,
      isPinned: payload.isPinned,
      createdById: req.userId ?? null,
    });

    res.status(201).json({
      success: true,
      data: { entry: serializeLogEntry(entry) },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_INVESTIGATION_LOG_PAYLOAD', '调查日志数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function updateInvestigationLogPin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, entryId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canUseKPTools');
    const payload = pinPayloadSchema.parse(req.body ?? {});

    const existing = await prisma.investigationLogEntry.findFirst({
      where: { id: entryId, roomId: room.id },
    });
    if (!existing) {
      throw new AppError('INVESTIGATION_LOG_NOT_FOUND', '调查日志不存在', 404);
    }

    const entry = await prisma.investigationLogEntry.update({
      where: { id: entryId },
      data: { isPinned: payload.isPinned },
    });

    res.json({
      success: true,
      data: { entry: serializeLogEntry(entry) },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_INVESTIGATION_LOG_PAYLOAD', '调查日志数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function archiveImportantRoomMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canUseKPTools');
    const payload = importantMessagePayloadSchema.parse(req.body ?? {});

    const entry = await createInvestigationLogEntry(prisma, {
      roomId: room.id,
      eventType: 'IMPORTANT_MESSAGE',
      title: payload.title ?? `重要消息：${payload.nickname ?? '房间消息'}`,
      content: payload.content,
      payload: {
        source: 'room_message_snapshot',
        messageId: payload.messageId ?? null,
        nickname: payload.nickname ?? null,
        timestamp: payload.timestamp ?? null,
      },
      visibility: payload.visibility,
      isPinned: payload.isPinned,
      createdById: req.userId ?? null,
    });

    res.status(201).json({
      success: true,
      data: { entry: serializeLogEntry(entry) },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_INVESTIGATION_LOG_PAYLOAD', '调查日志数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function archiveKeyDiceRoll(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canUseKPTools');
    const payload = keyDicePayloadSchema.parse(req.body ?? {});

    const storedRoll = payload.diceRollId
      ? await prisma.diceRoll.findFirst({
          where: { id: payload.diceRollId, roomId: room.id },
          include: { user: { select: { nickname: true } } },
        })
      : null;

    const rollType = storedRoll?.rollType ?? payload.rollType;
    const rollResult = storedRoll?.rollResult ?? payload.rollResult;
    if (!rollType || rollResult === undefined) {
      throw new AppError('INVALID_INVESTIGATION_LOG_PAYLOAD', '关键骰点缺少骰点结果', 400);
    }

    const targetName = storedRoll?.targetName ?? payload.targetName ?? null;
    const targetValue = storedRoll?.targetValue ?? payload.targetValue ?? null;
    const successLevel = storedRoll?.successLevel ?? payload.successLevel ?? null;
    const nickname = storedRoll?.user?.nickname ?? payload.nickname ?? null;
    const content = targetName
      ? `${targetName} 检定：${rollResult}/${targetValue ?? '?'} ${successLevel ?? ''}`.trim()
      : `${rollType}：${rollResult}`;

    const entry = await createInvestigationLogEntry(prisma, {
      roomId: room.id,
      eventType: 'DICE_KEY',
      title: payload.title ?? `关键骰点：${targetName ?? rollType}`,
      content,
      payload: {
        source: storedRoll ? 'dice_roll' : 'dice_snapshot',
        diceRollId: storedRoll?.id ?? payload.diceRollId ?? null,
        rollType,
        targetName,
        targetValue,
        rollResult,
        successLevel,
        nickname,
        timestamp: storedRoll?.createdAt.toISOString() ?? payload.timestamp ?? null,
      },
      visibility: payload.visibility,
      isPinned: payload.isPinned,
      createdById: req.userId ?? null,
    });

    res.status(201).json({
      success: true,
      data: { entry: serializeLogEntry(entry) },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_INVESTIGATION_LOG_PAYLOAD', '调查日志数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}
