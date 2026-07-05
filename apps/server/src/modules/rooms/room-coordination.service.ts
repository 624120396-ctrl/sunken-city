import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';

const attendanceStatuses = ['PENDING', 'AVAILABLE', 'LEAVE', 'TENTATIVE'] as const;

const nextSessionSchema = z.object({
  scheduledAt: z.string().datetime().nullable().optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  title: z.string().trim().max(120).optional(),
  note: z.string().trim().max(2000).optional(),
  status: z.enum(['SCHEDULED', 'RESCHEDULED', 'CANCELLED']).optional(),
});

const attendanceSchema = z.object({
  status: z.enum(attendanceStatuses),
  note: z.string().trim().max(500).optional(),
});

const announcementSchema = z.object({
  title: z.string().trim().max(120).optional(),
  content: z.string().trim().min(1).max(3000),
  isPinned: z.boolean().optional(),
});

function mapNextSession(session: {
  id: string;
  scheduledAt: Date | null;
  timezone: string;
  title: string;
  note: string;
  status: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...session,
    scheduledAt: session.scheduledAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function mapAttendance(entry: {
  id: string;
  userId: string;
  status: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
  user?: { nickname: string | null; email: string };
}) {
  return {
    id: entry.id,
    userId: entry.userId,
    userNickname: entry.user?.nickname || entry.user?.email || '未知成员',
    status: entry.status,
    note: entry.note,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function mapAnnouncement(announcement: {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { nickname: string | null; email: string };
}) {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    isPinned: announcement.isPinned,
    createdById: announcement.createdById,
    createdByName: announcement.createdBy?.nickname || announcement.createdBy?.email || 'KP',
    createdAt: announcement.createdAt.toISOString(),
    updatedAt: announcement.updatedAt.toISOString(),
  };
}

export async function getRoomCoordination(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canViewPublicContent');

    const [nextSession, attendance, announcements, activeMembers] = await Promise.all([
      prisma.roomNextSession.findUnique({ where: { roomId: auth.room.id } }),
      prisma.roomAttendanceConfirmation.findMany({
        where: { roomId: auth.room.id },
        include: { user: { select: { nickname: true, email: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.roomAnnouncement.findMany({
        where: { roomId: auth.room.id },
        include: { createdBy: { select: { nickname: true, email: true } } },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        take: 10,
      }),
      prisma.roomMember.findMany({
        where: { roomId: auth.room.id, leftAt: null },
        include: { user: { select: { nickname: true, email: true } } },
        orderBy: { joinedAt: 'asc' },
      }),
    ]);

    const attendanceByUser = new Map(attendance.map(entry => [entry.userId, entry]));
    const attendanceViews = activeMembers.map(member => {
      const entry = attendanceByUser.get(member.userId);
      if (entry) return mapAttendance(entry);
      return {
        id: null,
        userId: member.userId,
        userNickname: member.user.nickname || member.user.email || '未知成员',
        status: 'PENDING',
        note: '',
        createdAt: member.joinedAt.toISOString(),
        updatedAt: member.joinedAt.toISOString(),
      };
    });

    res.json({
      nextSession: nextSession ? mapNextSession(nextSession) : null,
      attendance: attendanceViews,
      announcements: announcements.map(mapAnnouncement),
      myAttendance: attendanceViews.find(entry => entry.userId === userId) ?? null,
      canManageCoordination: auth.capabilities.canUseKPTools,
    });
  } catch (error) {
    next(error);
  }
}

export async function saveRoomNextSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canUseKPTools');
    const payload = nextSessionSchema.parse(req.body);

    const saved = await prisma.roomNextSession.upsert({
      where: { roomId: auth.room.id },
      create: {
        roomId: auth.room.id,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        timezone: payload.timezone ?? 'Asia/Shanghai',
        title: payload.title ?? '',
        note: payload.note ?? '',
        status: payload.status ?? 'SCHEDULED',
        updatedById: userId,
      },
      update: {
        scheduledAt: payload.scheduledAt === undefined ? undefined : payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        timezone: payload.timezone,
        title: payload.title,
        note: payload.note,
        status: payload.status,
        updatedById: userId,
      },
    });

    res.json({ nextSession: mapNextSession(saved) });
  } catch (error) {
    next(error);
  }
}

export async function saveMyAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);

    const auth = await requireRoomCapability(roomId, userId, 'canViewPublicContent');
    const payload = attendanceSchema.parse(req.body);

    const saved = await prisma.roomAttendanceConfirmation.upsert({
      where: { roomId_userId: { roomId: auth.room.id, userId } },
      create: {
        roomId: auth.room.id,
        userId,
        status: payload.status,
        note: payload.note ?? '',
      },
      update: {
        status: payload.status,
        note: payload.note ?? '',
      },
      include: { user: { select: { nickname: true, email: true } } },
    });

    res.json({ attendance: mapAttendance(saved) });
  } catch (error) {
    next(error);
  }
}

export async function createRoomAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);

    const auth = await requireRoomCapability(roomId, userId, 'canUseKPTools');
    const payload = announcementSchema.parse(req.body);

    const announcement = await prisma.roomAnnouncement.create({
      data: {
        roomId: auth.room.id,
        title: payload.title ?? '',
        content: payload.content,
        isPinned: payload.isPinned ?? true,
        createdById: userId,
      },
      include: { createdBy: { select: { nickname: true, email: true } } },
    });

    res.status(201).json({ announcement: mapAnnouncement(announcement) });
  } catch (error) {
    next(error);
  }
}

export async function deleteRoomAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId, announcementId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canUseKPTools');

    const existing = await prisma.roomAnnouncement.findFirst({
      where: { id: announcementId, roomId: auth.room.id },
    });

    if (!existing) {
      throw new AppError('ANNOUNCEMENT_NOT_FOUND', '房间公告不存在', 404);
    }

    await prisma.roomAnnouncement.delete({ where: { id: announcementId } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
