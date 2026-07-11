import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';
import {
  buildCalendarFile,
  buildOptionSummaries,
  canManageSchedulePoll,
  collectPendingScheduleMemberIds,
  sortScheduleOptions,
  validateSchedulePollInput,
} from './room-schedule-poll.logic';
import {
  buildSchedulePollCancelledNotification,
  buildSchedulePollFinalizedNotification,
  buildSchedulePollReminderNotification,
  tryNotifyRoomMembers,
  tryNotifyRoomUser,
} from './room-notifications.service';

const optionSchema = z.object({
  id: z.string().trim().min(1).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

const pollSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  note: z.string().trim().max(2000).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  closesAt: z.string().datetime().nullable().optional(),
  options: z.array(optionSchema).min(2).max(8),
});

const voteSchema = z.object({
  votes: z.array(z.object({
    optionId: z.string().trim().min(1),
    status: z.enum(['AVAILABLE', 'TENTATIVE', 'UNAVAILABLE']),
    note: z.string().trim().max(500).optional(),
  })).min(1).max(8),
});

const finalizeSchema = z.object({ optionId: z.string().trim().min(1) });

async function requireScheduleManager(roomId: string, userId: string | undefined) {
  const auth = await requireRoomCapability(roomId, userId, 'canViewPublicContent');
  if (!canManageSchedulePoll(auth.capabilities)) {
    throw new AppError('FORBIDDEN', '你没有管理排期投票的权限', 403);
  }
  return auth;
}

function participantIds(room: { creatorId: string; members: Array<{ userId: string; leftAt: Date | null }> }) {
  return [...new Set([
    room.creatorId,
    ...room.members.filter(member => !member.leftAt).map(member => member.userId),
  ])];
}

function assertPollEditable(poll: { status: string; closesAt: Date | null }) {
  if (poll.status !== 'OPEN') {
    throw new AppError('SCHEDULE_POLL_NOT_OPEN', '该排期投票已结束', 409);
  }
  if (poll.closesAt && poll.closesAt <= new Date()) {
    throw new AppError('SCHEDULE_POLL_VOTING_CLOSED', '该排期投票已截止，不能通过普通编辑重新开放', 409);
  }
}

function isPrismaWriteConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
}

function scheduleWriteError(error: unknown) {
  return isPrismaWriteConflict(error)
    ? new AppError('SCHEDULE_POLL_CONFLICT', '排期投票正在被其他操作更新，请刷新后重试', 409)
    : error;
}

function normalizePollPayload(payload: z.infer<typeof pollSchema>) {
  try {
    return validateSchedulePollInput({
      title: payload.title,
      note: payload.note,
      timezone: payload.timezone,
      closesAt: payload.closesAt,
      options: payload.options,
    });
  } catch (error) {
    throw new AppError('INVALID_SCHEDULE_POLL', error instanceof Error ? error.message : '排期投票参数无效', 400);
  }
}

function mapPoll(poll: any, activeMemberIds: string[], currentUserId?: string) {
  const votes = poll.options.flatMap((option: any) => option.votes);
  const ranked = sortScheduleOptions(buildOptionSummaries(poll.options, votes, activeMemberIds));
  const byId = new Map(ranked.map(option => [option.id, {
    id: option.id,
    startsAt: option.startsAt,
    endsAt: option.endsAt,
    position: option.position,
    summary: option.summary,
    recommendationRank: option.recommendationRank,
    isRecommended: option.isRecommended,
  }]));
  return {
    id: poll.id,
    title: poll.title,
    note: poll.note,
    timezone: poll.timezone,
    status: poll.status,
    closesAt: poll.closesAt?.toISOString() ?? null,
    finalizedOptionId: poll.finalizedOptionId,
    createdById: poll.createdById,
    createdAt: poll.createdAt.toISOString(),
    updatedAt: poll.updatedAt.toISOString(),
    isVotingClosed: Boolean(poll.closesAt && poll.closesAt <= new Date()),
    options: poll.options.map((option: any) => ({
      ...byId.get(option.id),
      myVote: (() => {
        const vote = option.votes.find((entry: any) => entry.userId === currentUserId);
        return vote ? { status: vote.status, note: vote.note } : null;
      })(),
    })),
  };
}

const pollInclude = {
  options: {
    include: { votes: true },
    orderBy: { position: 'asc' as const },
  },
};

export async function getRoomSchedulePolls(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const auth = await requireRoomCapability(req.params.roomId, userId, 'canViewPublicContent');
    const [polls, nextSession] = await Promise.all([
      prisma.roomSchedulePoll.findMany({
        where: { roomId: auth.room.id },
        include: pollInclude,
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.roomNextSession.findUnique({
        where: { roomId: auth.room.id },
        select: { scheduledAt: true, status: true },
      }),
    ]);
    const members = participantIds(auth.room);
    res.json({
      polls: polls.map(poll => mapPoll(poll, members, userId)),
      canManageSchedulePoll: canManageSchedulePoll(auth.capabilities),
      hasDownloadableNextSession: Boolean(nextSession?.scheduledAt && nextSession.status !== 'CANCELLED'),
    });
  } catch (error) {
    next(error);
  }
}

export async function createRoomSchedulePoll(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);
    const auth = await requireScheduleManager(req.params.roomId, userId);
    const payload = pollSchema.parse(req.body);
    const normalized = normalizePollPayload(payload);

    const poll = await prisma.$transaction(async tx => {
      // A harmless room write serializes competing OPEN-poll creators on SQLite.
      await tx.room.update({ where: { id: auth.room.id }, data: { updatedAt: new Date() } });
      const existing = await tx.roomSchedulePoll.findFirst({
        where: { roomId: auth.room.id, status: 'OPEN' },
        select: { id: true },
      });
      if (existing) throw new AppError('SCHEDULE_POLL_OPEN_EXISTS', '当前房间已有进行中的排期投票', 409);
      return tx.roomSchedulePoll.create({
        data: {
          roomId: auth.room.id,
          title: normalized.title,
          note: normalized.note,
          timezone: normalized.timezone,
          closesAt: normalized.closesAt,
          createdById: userId,
          options: { create: normalized.options },
        },
        include: pollInclude,
      });
    });

    res.status(201).json({ poll: mapPoll(poll, participantIds(auth.room), userId) });
  } catch (error) {
    next(scheduleWriteError(error));
  }
}

export async function updateRoomSchedulePoll(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);
    const auth = await requireScheduleManager(req.params.roomId, userId);
    const payload = pollSchema.parse(req.body);
    const normalized = normalizePollPayload(payload);

    const poll = await prisma.$transaction(async tx => {
      const locked = await tx.roomSchedulePoll.updateMany({
        where: { id: req.params.pollId, roomId: auth.room.id, status: 'OPEN' },
        data: { updatedAt: new Date() },
      });
      if (locked.count !== 1) throw new AppError('SCHEDULE_POLL_NOT_OPEN', '排期投票不存在或已结束', 409);
      const existing = await tx.roomSchedulePoll.findFirst({
        where: { id: req.params.pollId, roomId: auth.room.id },
        include: pollInclude,
      });
      if (!existing) throw new AppError('SCHEDULE_POLL_NOT_FOUND', '排期投票不存在', 404);
      assertPollEditable(existing);

      const incomingIds = new Set(payload.options.flatMap(option => option.id ? [option.id] : []));
      if (incomingIds.size !== payload.options.filter(option => option.id).length) {
        throw new AppError('INVALID_SCHEDULE_POLL', '候选 ID 不能重复', 400);
      }
      if ([...incomingIds].some(id => !existing.options.some(option => option.id === id))) {
        throw new AppError('INVALID_SCHEDULE_POLL', '候选不属于该排期投票', 400);
      }

      for (const option of existing.options) {
        const incomingIndex = payload.options.findIndex(item => item.id === option.id);
        const incoming = incomingIndex >= 0 ? normalized.options[incomingIndex] : null;
        const changed = !incoming || option.startsAt.getTime() !== incoming.startsAt.getTime() || option.endsAt.getTime() !== incoming.endsAt.getTime();
        if (changed && option.votes.length > 0) {
          throw new AppError('SCHEDULE_OPTION_ALREADY_VOTED', '已有成员投票的候选不能修改或删除', 409);
        }
      }

      const removableIds = existing.options.filter(option => !incomingIds.has(option.id)).map(option => option.id);
      if (removableIds.length) await tx.roomScheduleOption.deleteMany({ where: { id: { in: removableIds } } });
      await Promise.all(payload.options.map((option, index) => {
        const normalizedOption = normalized.options[index];
        if (option.id) {
          return tx.roomScheduleOption.update({
            where: { id: option.id },
            data: { ...normalizedOption },
          });
        }
        return tx.roomScheduleOption.create({
          data: { pollId: existing.id, ...normalizedOption },
        });
      }));
      return tx.roomSchedulePoll.update({
        where: { id: existing.id },
        data: {
          title: normalized.title,
          note: normalized.note,
          timezone: normalized.timezone,
          closesAt: normalized.closesAt,
        },
        include: pollInclude,
      });
    });

    res.json({ poll: mapPoll(poll, participantIds(auth.room), userId) });
  } catch (error) {
    next(scheduleWriteError(error));
  }
}

export async function saveRoomScheduleVotes(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);
    const auth = await requireRoomCapability(req.params.roomId, userId, 'canViewPublicContent');
    const payload = voteSchema.parse(req.body);
    const saved = await prisma.$transaction(async tx => {
      const now = new Date();
      const locked = await tx.roomSchedulePoll.updateMany({
        where: {
          id: req.params.pollId,
          roomId: auth.room.id,
          status: 'OPEN',
          OR: [{ closesAt: null }, { closesAt: { gt: now } }],
        },
        data: { updatedAt: now },
      });
      if (locked.count !== 1) throw new AppError('SCHEDULE_POLL_VOTING_CLOSED', '排期投票不存在、已结束或已截止', 409);
      const poll = await tx.roomSchedulePoll.findUniqueOrThrow({ where: { id: req.params.pollId }, include: pollInclude });
      const optionIds = new Set(poll.options.map(option => option.id));
      if (payload.votes.some(vote => !optionIds.has(vote.optionId))) {
        throw new AppError('INVALID_SCHEDULE_OPTION', '候选不属于该排期投票', 400);
      }
      await Promise.all(payload.votes.map(vote => tx.roomScheduleVote.upsert({
        where: { optionId_userId: { optionId: vote.optionId, userId } },
        create: { optionId: vote.optionId, userId, status: vote.status, note: vote.note ?? '' },
        update: { status: vote.status, note: vote.note ?? '' },
      })));
      return tx.roomSchedulePoll.findUniqueOrThrow({ where: { id: poll.id }, include: pollInclude });
    });
    res.json({ poll: mapPoll(saved, participantIds(auth.room), userId) });
  } catch (error) {
    next(scheduleWriteError(error));
  }
}

export async function closeRoomSchedulePoll(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const auth = await requireScheduleManager(req.params.roomId, userId);
    const updated = await prisma.roomSchedulePoll.updateMany({
      where: { id: req.params.pollId, roomId: auth.room.id, status: 'OPEN' },
      data: { closesAt: new Date() },
    });
    if (updated.count !== 1) throw new AppError('SCHEDULE_POLL_NOT_OPEN', '排期投票不存在或已结束', 409);
    const poll = await prisma.roomSchedulePoll.findUniqueOrThrow({ where: { id: req.params.pollId }, include: pollInclude });
    res.json({ poll: mapPoll(poll, participantIds(auth.room), userId) });
  } catch (error) {
    next(error);
  }
}

export async function cancelRoomSchedulePoll(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const auth = await requireScheduleManager(req.params.roomId, userId);
    const updated = await prisma.roomSchedulePoll.updateMany({
      where: { id: req.params.pollId, roomId: auth.room.id, status: 'OPEN' },
      data: { status: 'CANCELLED' },
    });
    if (updated.count !== 1) throw new AppError('SCHEDULE_POLL_NOT_OPEN', '排期投票不存在或已结束', 409);
    const poll = await prisma.roomSchedulePoll.findUniqueOrThrow({ where: { id: req.params.pollId }, include: pollInclude });
    await tryNotifyRoomMembers({
      prisma,
      io: req.app.get('io'),
      room: auth.room,
      actorId: userId,
      notification: buildSchedulePollCancelledNotification({
        roomTitle: auth.room.name,
        roomId: auth.room.roomId,
        pollTitle: poll.title,
      }),
    });
    res.json({ poll: mapPoll(poll, participantIds(auth.room), userId) });
  } catch (error) {
    next(error);
  }
}

export async function finalizeRoomSchedulePoll(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);
    const auth = await requireScheduleManager(req.params.roomId, userId);
    const payload = finalizeSchema.parse(req.body);
    const members = participantIds(auth.room);

    const result = await prisma.$transaction(async tx => {
      const now = new Date();
      const locked = await tx.roomSchedulePoll.updateMany({
        where: { id: req.params.pollId, roomId: auth.room.id, status: 'OPEN' },
        data: { updatedAt: now },
      });
      if (locked.count !== 1) throw new AppError('SCHEDULE_POLL_ALREADY_FINALIZED', '该排期投票不存在、已结束或已被其他操作收口', 409);
      const poll = await tx.roomSchedulePoll.findFirst({
        where: { id: req.params.pollId, roomId: auth.room.id },
        include: pollInclude,
      });
      if (!poll) throw new AppError('SCHEDULE_POLL_NOT_FOUND', '排期投票不存在', 404);
      const option = poll.options.find(item => item.id === payload.optionId);
      if (!option) throw new AppError('INVALID_SCHEDULE_OPTION', '候选不属于该排期投票', 400);
      if (option.startsAt <= now) throw new AppError('SCHEDULE_OPTION_IN_PAST', '不能将已经开始或过去的候选设为正式场次', 409);
      await tx.roomSchedulePoll.update({
        where: { id: poll.id },
        data: { status: 'FINALIZED', finalizedOptionId: option.id },
      });

      const previous = await tx.roomNextSession.findUnique({ where: { roomId: auth.room.id } });
      const nextSession = await tx.roomNextSession.upsert({
        where: { roomId: auth.room.id },
        create: {
          roomId: auth.room.id,
          scheduledAt: option.startsAt,
          timezone: poll.timezone,
          title: poll.title,
          note: poll.note,
          status: 'SCHEDULED',
          updatedById: userId,
        },
        update: {
          scheduledAt: option.startsAt,
          timezone: poll.timezone,
          title: poll.title,
          note: poll.note,
          status: 'SCHEDULED',
          updatedById: userId,
        },
      });
      await tx.roomAttendanceConfirmation.deleteMany({ where: { roomId: auth.room.id } });
      await tx.roomAttendanceConfirmation.createMany({
        data: members.map(memberId => ({ roomId: auth.room.id, userId: memberId, status: 'PENDING', note: '' })),
      });
      return {
        poll,
        option,
        nextSession,
        wasRescheduled: Boolean(previous?.scheduledAt && previous.scheduledAt.getTime() !== option.startsAt.getTime()),
      };
    });

    await tryNotifyRoomMembers({
      prisma,
      io: req.app.get('io'),
      room: auth.room,
      actorId: userId,
      notification: buildSchedulePollFinalizedNotification({
        roomTitle: auth.room.name,
        roomId: auth.room.roomId,
        pollTitle: result.poll.title,
        startsAt: result.option.startsAt,
        timezone: result.poll.timezone,
        isReschedule: result.wasRescheduled,
      }),
    });
    res.json({
      pollId: result.poll.id,
      finalizedOptionId: result.option.id,
      nextSession: {
        ...result.nextSession,
        scheduledAt: result.nextSession.scheduledAt?.toISOString() ?? null,
      },
      attendanceResetCount: members.length,
      wasRescheduled: result.wasRescheduled,
    });
  } catch (error) {
    next(scheduleWriteError(error));
  }
}

export async function remindRoomSchedulePollPendingMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const auth = await requireScheduleManager(req.params.roomId, userId);
    const poll = await prisma.roomSchedulePoll.findFirst({
      where: { id: req.params.pollId, roomId: auth.room.id },
      include: pollInclude,
    });
    if (!poll) throw new AppError('SCHEDULE_POLL_NOT_FOUND', '排期投票不存在', 404);
    assertPollEditable(poll);
    if (poll.closesAt && poll.closesAt <= new Date()) {
      throw new AppError('SCHEDULE_POLL_VOTING_CLOSED', '该排期投票已截止，不能再提醒成员回复', 409);
    }
    const pending = collectPendingScheduleMemberIds(
      participantIds(auth.room),
      poll.options.map(option => option.id),
      poll.options.flatMap(option => option.votes as any)
    ).filter(memberId => memberId !== userId);
    const notification = buildSchedulePollReminderNotification({
      roomTitle: auth.room.name,
      roomId: auth.room.roomId,
      pollTitle: poll.title,
      closesAt: poll.closesAt,
      timezone: poll.timezone,
    });
    await Promise.all(pending.map(memberId => tryNotifyRoomUser({
      prisma,
      io: req.app.get('io'),
      userId: memberId,
      notification,
    })));
    res.json({ remindedCount: pending.length });
  } catch (error) {
    next(error);
  }
}

export async function downloadRoomNextSessionCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = await requireRoomCapability(req.params.roomId, req.user?.userId, 'canViewPublicContent');
    const [session, finalizedPoll] = await Promise.all([
      prisma.roomNextSession.findUnique({ where: { roomId: auth.room.id } }),
      prisma.roomSchedulePoll.findFirst({
        where: { roomId: auth.room.id, status: 'FINALIZED' },
        include: { finalizedOption: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    if (!session?.scheduledAt || session.status === 'CANCELLED') {
      throw new AppError('NEXT_SESSION_NOT_SCHEDULED', '当前没有可下载的正式场次', 404);
    }
    const matchingOption = finalizedPoll?.finalizedOption?.startsAt.getTime() === session.scheduledAt.getTime()
      ? finalizedPoll.finalizedOption
      : null;
    const calendar = buildCalendarFile({
      uid: `${auth.room.roomId}-${session.updatedAt.getTime()}@sunken-city`,
      title: session.title || auth.room.name,
      description: session.note || `沉没之城房间：${auth.room.name}`,
      startsAt: session.scheduledAt,
      endsAt: matchingOption?.endsAt ?? new Date(session.scheduledAt.getTime() + 4 * 60 * 60 * 1000),
      url: `${req.protocol}://${req.get('host')}/rooms/${auth.room.roomId}`,
    });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="room-${auth.room.roomId}.ics"`);
    res.send(calendar);
  } catch (error) {
    next(error);
  }
}
