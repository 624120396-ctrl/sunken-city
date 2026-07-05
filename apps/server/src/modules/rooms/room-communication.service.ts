import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';

const queueKinds = ['SPEAK', 'ACTION', 'CHECK_IN'] as const;
const queueStatuses = ['WAITING', 'ACTIVE', 'DONE', 'CANCELLED'] as const;

const stateSchema = z.object({
  currentTopic: z.string().trim().max(240).optional(),
  spotlightUserId: z.string().nullable().optional(),
  keeperPrompt: z.string().trim().max(500).optional(),
  environmentChecklist: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
});

const queueCreateSchema = z.object({
  kind: z.enum(queueKinds).optional(),
  label: z.string().trim().min(1).max(120),
  note: z.string().trim().max(500).optional(),
  targetUserId: z.string().nullable().optional(),
});

const queueUpdateSchema = z.object({
  status: z.enum(queueStatuses).optional(),
  label: z.string().trim().min(1).max(120).optional(),
  note: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

function parseChecklist(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function mapState(state: {
  id: string;
  currentTopic: string;
  spotlightUserId: string | null;
  keeperPrompt: string;
  environmentChecklist: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...state,
    environmentChecklist: parseChecklist(state.environmentChecklist),
    createdAt: state.createdAt.toISOString(),
    updatedAt: state.updatedAt.toISOString(),
  };
}

function mapQueueItem(item: {
  id: string;
  kind: string;
  status: string;
  label: string;
  note: string;
  requesterUserId: string | null;
  targetUserId: string | null;
  createdById: string;
  resolvedById: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function memberNameByUserId(members: Array<{ userId: string; user: { nickname: string | null; email: string } }>) {
  return new Map(members.map(member => [
    member.userId,
    member.user.nickname || member.user.email || '未知成员',
  ]));
}

export async function getRoomCommunication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canViewPublicContent');

    const [state, queue, members] = await Promise.all([
      prisma.roomCommunicationState.findUnique({ where: { roomId: auth.room.id } }),
      prisma.roomActionQueueItem.findMany({
        where: { roomId: auth.room.id, status: { in: ['WAITING', 'ACTIVE'] } },
        orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.roomMember.findMany({
        where: { roomId: auth.room.id, leftAt: null },
        include: { user: { select: { nickname: true, email: true } } },
        orderBy: { joinedAt: 'asc' },
      }),
    ]);

    const names = memberNameByUserId(members);
    const queueViews = queue.map(item => ({
      ...mapQueueItem(item),
      requesterName: item.requesterUserId ? names.get(item.requesterUserId) ?? '未知成员' : null,
      targetName: item.targetUserId ? names.get(item.targetUserId) ?? '未知成员' : null,
      canCancel: auth.capabilities.canUseKPTools || item.createdById === userId,
    }));

    res.json({
      state: state ? mapState(state) : null,
      queue: queueViews,
      members: members.map(member => ({
        userId: member.userId,
        name: names.get(member.userId) ?? '未知成员',
        role: member.role,
      })),
      canManageCommunication: auth.capabilities.canUseKPTools,
    });
  } catch (error) {
    next(error);
  }
}

export async function saveRoomCommunicationState(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canUseKPTools');
    const payload = stateSchema.parse(req.body);

    const saved = await prisma.roomCommunicationState.upsert({
      where: { roomId: auth.room.id },
      create: {
        roomId: auth.room.id,
        currentTopic: payload.currentTopic ?? '',
        spotlightUserId: payload.spotlightUserId ?? null,
        keeperPrompt: payload.keeperPrompt ?? '',
        environmentChecklist: JSON.stringify(payload.environmentChecklist ?? []),
        updatedById: userId,
      },
      update: {
        currentTopic: payload.currentTopic,
        spotlightUserId: payload.spotlightUserId === undefined ? undefined : payload.spotlightUserId,
        keeperPrompt: payload.keeperPrompt,
        environmentChecklist: payload.environmentChecklist ? JSON.stringify(payload.environmentChecklist) : undefined,
        updatedById: userId,
      },
    });

    res.json({ state: mapState(saved) });
  } catch (error) {
    next(error);
  }
}

export async function createRoomQueueItem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);

    const auth = await requireRoomCapability(roomId, userId, 'canViewPublicContent');
    const payload = queueCreateSchema.parse(req.body);
    const isKpManaged = payload.kind === 'CHECK_IN' || Boolean(payload.targetUserId);

    if (isKpManaged && !auth.capabilities.canUseKPTools) {
      throw new AppError('FORBIDDEN', '只有 KP 可以点名或创建提醒', 403);
    }

    const count = await prisma.roomActionQueueItem.count({
      where: { roomId: auth.room.id, status: { in: ['WAITING', 'ACTIVE'] } },
    });

    const item = await prisma.roomActionQueueItem.create({
      data: {
        roomId: auth.room.id,
        kind: payload.kind ?? 'SPEAK',
        status: 'WAITING',
        label: payload.label,
        note: payload.note ?? '',
        requesterUserId: isKpManaged ? null : userId,
        targetUserId: payload.targetUserId ?? null,
        createdById: userId,
        sortOrder: count + 1,
      },
    });

    res.status(201).json({ item: mapQueueItem(item) });
  } catch (error) {
    next(error);
  }
}

export async function updateRoomQueueItem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId, itemId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canViewPublicContent');
    const payload = queueUpdateSchema.parse(req.body);

    const existing = await prisma.roomActionQueueItem.findFirst({
      where: { id: itemId, roomId: auth.room.id },
    });

    if (!existing) {
      throw new AppError('QUEUE_ITEM_NOT_FOUND', '轮候项不存在', 404);
    }

    const selfCancelling = payload.status === 'CANCELLED' && existing.createdById === userId;
    if (!auth.capabilities.canUseKPTools && !selfCancelling) {
      throw new AppError('FORBIDDEN', '只有 KP 可以管理轮候队列', 403);
    }

    if (payload.status === 'ACTIVE') {
      await prisma.roomActionQueueItem.updateMany({
        where: { roomId: auth.room.id, status: 'ACTIVE', id: { not: itemId } },
        data: { status: 'WAITING', resolvedById: null },
      });
    }

    const item = await prisma.roomActionQueueItem.update({
      where: { id: itemId },
      data: {
        status: payload.status,
        label: payload.label,
        note: payload.note,
        sortOrder: payload.sortOrder,
        resolvedById: payload.status === 'DONE' || payload.status === 'CANCELLED' ? userId : undefined,
      },
    });

    res.json({ item: mapQueueItem(item) });
  } catch (error) {
    next(error);
  }
}

export async function deleteRoomQueueItem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId, itemId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canViewPublicContent');

    const existing = await prisma.roomActionQueueItem.findFirst({
      where: { id: itemId, roomId: auth.room.id },
    });

    if (!existing) {
      throw new AppError('QUEUE_ITEM_NOT_FOUND', '轮候项不存在', 404);
    }

    if (!auth.capabilities.canUseKPTools && existing.createdById !== userId) {
      throw new AppError('FORBIDDEN', '你不能删除其他人的轮候项', 403);
    }

    await prisma.roomActionQueueItem.delete({ where: { id: itemId } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
