import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { capabilitiesFor, deriveLifecycle, deriveRoomRole, requireRoomCapability } from './room-auth';

const profileSchema = z.object({
  status: z.enum(['CLOSED', 'OPEN', 'PAUSED']).optional(),
  headline: z.string().trim().max(120).optional(),
  pitch: z.string().trim().max(3000).optional(),
  styleTags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
  scheduleText: z.string().trim().max(1000).optional(),
  requirements: z.string().trim().max(2000).optional(),
  safetyTools: z.string().trim().max(1000).optional(),
  playerCountMin: z.number().int().min(1).max(8).optional(),
  playerCountMax: z.number().int().min(1).max(8).optional(),
  newcomerFriendly: z.boolean().optional(),
  plGuide: z.string().trim().max(3000).optional(),
  kpChecklist: z.string().trim().max(3000).optional(),
});

const applicationSchema = z.object({
  message: z.string().trim().max(2000).optional(),
  experienceNote: z.string().trim().max(1000).optional(),
  availabilityNote: z.string().trim().max(1000).optional(),
  preferredStyleTags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
});

const applicationReviewSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'DECLINED']),
  reviewNote: z.string().trim().max(1000).optional(),
});

function parseStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function mapProfile(profile: {
  id: string;
  status: string;
  headline: string;
  pitch: string;
  styleTags: string;
  scheduleText: string;
  requirements: string;
  safetyTools: string;
  playerCountMin: number;
  playerCountMax: number;
  newcomerFriendly: boolean;
  plGuide: string;
  kpChecklist: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...profile,
    styleTags: parseStringArray(profile.styleTags),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function mapApplication(application: {
  id: string;
  userId: string;
  status: string;
  message: string;
  experienceNote: string;
  availabilityNote: string;
  preferredStyleTags: string;
  reviewerId: string | null;
  reviewNote: string;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  applicant?: { nickname: string | null; email: string };
}) {
  return {
    id: application.id,
    userId: application.userId,
    applicantName: application.applicant?.nickname || application.applicant?.email || '申请人',
    status: application.status,
    message: application.message,
    experienceNote: application.experienceNote,
    availabilityNote: application.availabilityNote,
    preferredStyleTags: parseStringArray(application.preferredStyleTags),
    reviewerId: application.reviewerId,
    reviewNote: application.reviewNote,
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

async function getRecruitmentRoom(roomId: string, userId?: string) {
  const room = await prisma.room.findUnique({
    where: { roomId },
    include: {
      members: true,
      roomRun: true,
    },
  });

  if (!room) {
    throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
  }

  const member = room.members.find(entry => entry.userId === userId && !entry.leftAt) || null;
  const lifecycle = deriveLifecycle(room.status, room.roomRun?.lifecycle);
  const role = deriveRoomRole({ creatorId: room.creatorId, userId, member });
  const capabilities = capabilitiesFor(role, lifecycle);

  return { room, member, role, lifecycle, capabilities };
}

export async function getRoomRecruitment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    const auth = await getRecruitmentRoom(roomId, userId);
    const canManageRecruitment = auth.capabilities.canManageMembers;

    const [profile, applications, ownApplication] = await Promise.all([
      prisma.roomRecruitmentProfile.findUnique({ where: { roomId: auth.room.id } }),
      canManageRecruitment
        ? prisma.roomJoinApplication.findMany({
            where: { roomId: auth.room.id },
            include: { applicant: { select: { nickname: true, email: true } } },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          })
        : Promise.resolve([]),
      userId
        ? prisma.roomJoinApplication.findUnique({
            where: { roomId_userId: { roomId: auth.room.id, userId } },
            include: { applicant: { select: { nickname: true, email: true } } },
          })
        : Promise.resolve(null),
    ]);

    res.json({
      profile: profile ? mapProfile(profile) : null,
      applications: applications.map(mapApplication),
      ownApplication: ownApplication ? mapApplication(ownApplication) : null,
      canManageRecruitment,
      isRoomMember: Boolean(auth.member) || auth.role === 'OWNER_KP',
    });
  } catch (error) {
    next(error);
  }
}

export async function saveRoomRecruitmentProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canManageMembers');
    const payload = profileSchema.parse(req.body);
    const minPlayers = payload.playerCountMin ?? 3;
    const maxPlayers = payload.playerCountMax ?? 4;

    if (minPlayers > maxPlayers) {
      throw new AppError('INVALID_PLAYER_COUNT', '最少人数不能大于最多人数', 400);
    }

    const saved = await prisma.roomRecruitmentProfile.upsert({
      where: { roomId: auth.room.id },
      create: {
        roomId: auth.room.id,
        status: payload.status ?? 'CLOSED',
        headline: payload.headline ?? '',
        pitch: payload.pitch ?? '',
        styleTags: JSON.stringify(payload.styleTags ?? []),
        scheduleText: payload.scheduleText ?? '',
        requirements: payload.requirements ?? '',
        safetyTools: payload.safetyTools ?? '',
        playerCountMin: minPlayers,
        playerCountMax: maxPlayers,
        newcomerFriendly: payload.newcomerFriendly ?? true,
        plGuide: payload.plGuide ?? '',
        kpChecklist: payload.kpChecklist ?? '',
        updatedById: userId,
      },
      update: {
        status: payload.status,
        headline: payload.headline,
        pitch: payload.pitch,
        styleTags: payload.styleTags ? JSON.stringify(payload.styleTags) : undefined,
        scheduleText: payload.scheduleText,
        requirements: payload.requirements,
        safetyTools: payload.safetyTools,
        playerCountMin: payload.playerCountMin,
        playerCountMax: payload.playerCountMax,
        newcomerFriendly: payload.newcomerFriendly,
        plGuide: payload.plGuide,
        kpChecklist: payload.kpChecklist,
        updatedById: userId,
      },
    });

    res.json({ profile: mapProfile(saved) });
  } catch (error) {
    next(error);
  }
}

export async function submitRoomJoinApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);

    const auth = await getRecruitmentRoom(roomId, userId);
    if (auth.member || auth.role === 'OWNER_KP') {
      throw new AppError('ALREADY_ROOM_MEMBER', '你已经在这个房间中', 400);
    }

    const profile = await prisma.roomRecruitmentProfile.findUnique({ where: { roomId: auth.room.id } });
    if (!profile || profile.status !== 'OPEN') {
      throw new AppError('RECRUITMENT_CLOSED', '该房间暂未开放招募', 400);
    }

    const payload = applicationSchema.parse(req.body);
    const application = await prisma.roomJoinApplication.upsert({
      where: { roomId_userId: { roomId: auth.room.id, userId } },
      create: {
        roomId: auth.room.id,
        userId,
        status: 'PENDING',
        message: payload.message ?? '',
        experienceNote: payload.experienceNote ?? '',
        availabilityNote: payload.availabilityNote ?? '',
        preferredStyleTags: JSON.stringify(payload.preferredStyleTags ?? []),
      },
      update: {
        status: 'PENDING',
        message: payload.message ?? '',
        experienceNote: payload.experienceNote ?? '',
        availabilityNote: payload.availabilityNote ?? '',
        preferredStyleTags: JSON.stringify(payload.preferredStyleTags ?? []),
        reviewerId: null,
        reviewNote: '',
        reviewedAt: null,
      },
      include: { applicant: { select: { nickname: true, email: true } } },
    });

    res.status(201).json({ application: mapApplication(application) });
  } catch (error) {
    next(error);
  }
}

export async function reviewRoomJoinApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId, applicationId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canManageMembers');
    const payload = applicationReviewSchema.parse(req.body);

    const existing = await prisma.roomJoinApplication.findFirst({
      where: { id: applicationId, roomId: auth.room.id },
    });

    if (!existing) {
      throw new AppError('APPLICATION_NOT_FOUND', '申请不存在', 404);
    }

    const application = await prisma.roomJoinApplication.update({
      where: { id: applicationId },
      data: {
        status: payload.status,
        reviewerId: userId,
        reviewNote: payload.reviewNote ?? '',
        reviewedAt: new Date(),
      },
      include: { applicant: { select: { nickname: true, email: true } } },
    });

    res.json({ application: mapApplication(application) });
  } catch (error) {
    next(error);
  }
}

export async function withdrawRoomJoinApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId, applicationId } = req.params;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);

    const auth = await getRecruitmentRoom(roomId, userId);
    const existing = await prisma.roomJoinApplication.findFirst({
      where: { id: applicationId, roomId: auth.room.id },
    });

    if (!existing) {
      throw new AppError('APPLICATION_NOT_FOUND', '申请不存在', 404);
    }
    if (existing.userId !== userId) {
      throw new AppError('FORBIDDEN', '你不能撤回其他人的申请', 403);
    }

    const application = await prisma.roomJoinApplication.update({
      where: { id: applicationId },
      data: { status: 'WITHDRAWN' },
      include: { applicant: { select: { nickname: true, email: true } } },
    });

    res.json({ application: mapApplication(application) });
  } catch (error) {
    next(error);
  }
}
