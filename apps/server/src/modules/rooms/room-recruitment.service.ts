import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { capabilitiesFor, deriveLifecycle, deriveRoomRole, requireRoomCapability } from './room-auth';
import { createOrRestoreRoomMember } from './room-binding.service';
import {
  buildApplicationReviewNotification,
  buildRoomInvitationNotification,
  tryNotifyRoomUser,
} from './room-notifications.service';
import { buildRecruitmentStyleMatch } from './room-recruitment-match.service';

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

const invitationSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(['PLAYER', 'OBSERVER']).optional(),
  message: z.string().trim().max(1000).optional(),
});

const invitationResponseSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
  characterId: z.string().trim().optional(),
});

const approvedJoinSchema = z.object({
  characterId: z.string().trim().min(1),
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
}, roomStyleTags: string[] = []) {
  const preferredStyleTags = parseStringArray(application.preferredStyleTags);
  return {
    id: application.id,
    userId: application.userId,
    applicantName: application.applicant?.nickname || application.applicant?.email || '申请人',
    status: application.status,
    message: application.message,
    experienceNote: application.experienceNote,
    availabilityNote: application.availabilityNote,
    preferredStyleTags,
    styleMatch: buildRecruitmentStyleMatch(roomStyleTags, preferredStyleTags),
    reviewerId: application.reviewerId,
    reviewNote: application.reviewNote,
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

function mapInvitation(invitation: {
  id: string;
  inviteeId: string;
  inviterId: string;
  role: string;
  status: string;
  message: string;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  invitee?: { nickname: string | null; email: string };
  inviter?: { nickname: string | null; email: string };
}) {
  return {
    id: invitation.id,
    inviteeId: invitation.inviteeId,
    inviteeName: invitation.invitee?.nickname || invitation.invitee?.email || '受邀用户',
    inviteeEmail: invitation.invitee?.email ?? '',
    inviterId: invitation.inviterId,
    inviterName: invitation.inviter?.nickname || invitation.inviter?.email || '邀请人',
    role: invitation.role,
    status: invitation.status,
    message: invitation.message,
    respondedAt: invitation.respondedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
  };
}

function assertCanJoinByRecruitment(lifecycle: string, joinAs: 'PLAYER' | 'OBSERVER') {
  if (joinAs === 'PLAYER' && lifecycle !== 'PREPARING' && lifecycle !== 'READY') {
    throw new AppError('INVALID_ROOM_LIFECYCLE', '只有开团前可以加入玩家席位', 400);
  }
  if (joinAs === 'OBSERVER' && (lifecycle === 'FINISHED' || lifecycle === 'CANCELLED')) {
    throw new AppError('INVALID_ROOM_LIFECYCLE', '已结束或已取消的房间不能加入旁观', 400);
  }
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

    const [profile, applications, ownApplication, invitations, ownInvitation] = await Promise.all([
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
      canManageRecruitment
        ? prisma.roomInvitation.findMany({
            where: { roomId: auth.room.id },
            include: {
              invitee: { select: { nickname: true, email: true } },
              inviter: { select: { nickname: true, email: true } },
            },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          })
        : Promise.resolve([]),
      userId
        ? prisma.roomInvitation.findUnique({
            where: { roomId_inviteeId: { roomId: auth.room.id, inviteeId: userId } },
            include: {
              invitee: { select: { nickname: true, email: true } },
              inviter: { select: { nickname: true, email: true } },
            },
          })
        : Promise.resolve(null),
    ]);

    const roomStyleTags = profile ? parseStringArray(profile.styleTags) : [];

    res.json({
      profile: profile ? mapProfile(profile) : null,
      applications: applications.map(application => mapApplication(application, roomStyleTags)),
      ownApplication: ownApplication ? mapApplication(ownApplication, roomStyleTags) : null,
      invitations: invitations.map(mapInvitation),
      ownInvitation: ownInvitation ? mapInvitation(ownInvitation) : null,
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

    res.status(201).json({ application: mapApplication(application, parseStringArray(profile.styleTags)) });
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

    if (application.status !== 'PENDING') {
      const io = req.app.get('io') as import('socket.io').Server | undefined;
      await tryNotifyRoomUser({
        prisma,
        io,
        userId: application.userId,
        notification: buildApplicationReviewNotification({
          roomTitle: auth.room.name,
          roomId: auth.room.roomId,
          status: application.status,
          reviewNote: application.reviewNote,
        }),
      });
    }

    const profile = await prisma.roomRecruitmentProfile.findUnique({ where: { roomId: auth.room.id } });

    res.json({ application: mapApplication(application, profile ? parseStringArray(profile.styleTags) : []) });
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

export async function inviteRoomUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canManageMembers');
    const payload = invitationSchema.parse(req.body);
    const invitee = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true, email: true, nickname: true },
    });

    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);
    if (!invitee) throw new AppError('INVITEE_NOT_FOUND', '没有找到这个邮箱对应的用户', 404);
    if (invitee.id === userId) throw new AppError('CANNOT_INVITE_SELF', '不能邀请自己', 400);

    const activeMember = auth.room.members.find(member => member.userId === invitee.id && !member.leftAt);
    if (activeMember || auth.room.creatorId === invitee.id) {
      throw new AppError('ALREADY_ROOM_MEMBER', '该用户已经在房间中', 400);
    }

    const invitation = await prisma.roomInvitation.upsert({
      where: { roomId_inviteeId: { roomId: auth.room.id, inviteeId: invitee.id } },
      create: {
        roomId: auth.room.id,
        inviterId: userId,
        inviteeId: invitee.id,
        role: payload.role ?? 'PLAYER',
        status: 'PENDING',
        message: payload.message ?? '',
      },
      update: {
        inviterId: userId,
        role: payload.role ?? 'PLAYER',
        status: 'PENDING',
        message: payload.message ?? '',
        respondedAt: null,
      },
      include: {
        invitee: { select: { nickname: true, email: true } },
        inviter: { select: { nickname: true, email: true } },
      },
    });

    const io = req.app.get('io') as import('socket.io').Server | undefined;
    await tryNotifyRoomUser({
      prisma,
      io,
      userId: invitee.id,
      notification: buildRoomInvitationNotification({
        roomTitle: auth.room.name,
        roomId: auth.room.roomId,
        inviterName: invitation.inviter?.nickname || invitation.inviter?.email || 'KP',
        role: invitation.role,
        message: invitation.message,
      }),
    });

    res.status(201).json({ invitation: mapInvitation(invitation) });
  } catch (error) {
    next(error);
  }
}

export async function cancelRoomInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId, invitationId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canManageMembers');
    const existing = await prisma.roomInvitation.findFirst({
      where: { id: invitationId, roomId: auth.room.id },
    });

    if (!existing) throw new AppError('INVITATION_NOT_FOUND', '邀请不存在', 404);

    const invitation = await prisma.roomInvitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED', respondedAt: new Date() },
      include: {
        invitee: { select: { nickname: true, email: true } },
        inviter: { select: { nickname: true, email: true } },
      },
    });

    res.json({ invitation: mapInvitation(invitation) });
  } catch (error) {
    next(error);
  }
}

export async function respondRoomInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId, invitationId } = req.params;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);

    const auth = await getRecruitmentRoom(roomId, userId);
    if (auth.member || auth.role === 'OWNER_KP') {
      throw new AppError('ALREADY_ROOM_MEMBER', '你已经在这个房间中', 400);
    }

    const payload = invitationResponseSchema.parse(req.body);
    const existing = await prisma.roomInvitation.findFirst({
      where: { id: invitationId, roomId: auth.room.id },
    });

    if (!existing) throw new AppError('INVITATION_NOT_FOUND', '邀请不存在', 404);
    if (existing.inviteeId !== userId) throw new AppError('FORBIDDEN', '你不能处理其他人的邀请', 403);
    if (existing.status !== 'PENDING') throw new AppError('INVITATION_NOT_PENDING', '该邀请已经处理过', 400);

    let member = null;
    if (payload.status === 'ACCEPTED') {
      const joinAs = existing.role === 'OBSERVER' ? 'OBSERVER' : 'PLAYER';
      assertCanJoinByRecruitment(auth.lifecycle, joinAs);
      member = await createOrRestoreRoomMember({
        roomDbId: auth.room.id,
        userId,
        joinAs,
        characterId: joinAs === 'PLAYER' ? payload.characterId : undefined,
      });
    }

    const invitation = await prisma.roomInvitation.update({
      where: { id: invitationId },
      data: { status: payload.status, respondedAt: new Date() },
      include: {
        invitee: { select: { nickname: true, email: true } },
        inviter: { select: { nickname: true, email: true } },
      },
    });

    res.json({ invitation: mapInvitation(invitation), member });
  } catch (error) {
    next(error);
  }
}

export async function joinApprovedRoomApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId, applicationId } = req.params;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);

    const auth = await getRecruitmentRoom(roomId, userId);
    if (auth.member || auth.role === 'OWNER_KP') {
      throw new AppError('ALREADY_ROOM_MEMBER', '你已经在这个房间中', 400);
    }

    assertCanJoinByRecruitment(auth.lifecycle, 'PLAYER');
    const payload = approvedJoinSchema.parse(req.body);
    const existing = await prisma.roomJoinApplication.findFirst({
      where: { id: applicationId, roomId: auth.room.id },
    });

    if (!existing) throw new AppError('APPLICATION_NOT_FOUND', '申请不存在', 404);
    if (existing.userId !== userId) throw new AppError('FORBIDDEN', '你不能使用其他人的申请加入', 403);
    if (existing.status !== 'APPROVED') throw new AppError('APPLICATION_NOT_APPROVED', '申请通过后才能加入', 400);

    const member = await createOrRestoreRoomMember({
      roomDbId: auth.room.id,
      userId,
      joinAs: 'PLAYER',
      characterId: payload.characterId,
    });

    const application = await prisma.roomJoinApplication.update({
      where: { id: applicationId },
      data: { status: 'JOINED' },
      include: { applicant: { select: { nickname: true, email: true } } },
    });

    res.json({ application: mapApplication(application), member });
  } catch (error) {
    next(error);
  }
}
