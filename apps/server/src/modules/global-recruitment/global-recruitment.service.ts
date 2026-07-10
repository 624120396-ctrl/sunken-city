import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { createNotification } from '../notifications/notifications.service';
import {
  canManageGlobalRecruitmentPost,
  canViewGlobalRecruitmentContact,
  getEffectiveGlobalRecruitmentStatus,
  normalizeGlobalRecruitmentTags,
} from './global-recruitment.policy';

const postSchema = z.object({
  title: z.string().trim().min(2).max(120),
  sourceType: z.enum(['INTERNAL_ROOM', 'EXTERNAL_EVENT']).optional(),
  roomPublicId: z.string().trim().max(32).optional().or(z.literal('')),
  systemOrTheme: z.string().trim().min(1).max(80),
  playFormat: z.string().trim().min(1).max(80),
  locationOrPlatform: z.string().trim().min(1).max(120),
  scheduleText: z.string().trim().min(1).max(160),
  playerCountMin: z.number().int().min(1).max(20).optional(),
  playerCountMax: z.number().int().min(1).max(20).optional(),
  experienceRequirement: z.string().trim().max(300).optional(),
  contactMethod: z.string().trim().min(1).max(300),
  contactVisibility: z.enum(['PUBLIC', 'LOGGED_IN', 'RESPONDERS']).optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  description: z.string().trim().max(3000).optional(),
  safetyNote: z.string().trim().max(600).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

const postPatchSchema = postSchema.partial().extend({
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

const responseSchema = z.object({
  message: z.string().trim().max(1200).optional(),
  contactNote: z.string().trim().max(500).optional(),
});

const responseReviewSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN']),
});

const reportSchema = z.object({
  reason: z.enum(['HARASSMENT', 'SPAM', 'MISLEADING', 'UNSAFE', 'OTHER']),
  note: z.string().trim().max(800).optional(),
});

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function resolveRoomDbId(roomPublicId?: string | null) {
  if (!roomPublicId) return null;
  const room = await prisma.room.findUnique({
    where: { roomId: roomPublicId },
    select: { id: true, roomId: true, name: true },
  });
  if (!room) throw new AppError('ROOM_NOT_FOUND', '绑定的房间不存在', 404);
  return room.id;
}

function mapPost(post: any, viewerId?: string | null) {
  const ownResponse = post.responses?.find((response: any) => response.userId === viewerId) ?? null;
  const responseCount = post._count?.responses ?? post.responses?.length ?? 0;
  const reportCount = post._count?.reports ?? 0;
  const canManage = canManageGlobalRecruitmentPost(post.authorId, viewerId);
  const effectiveStatus = getEffectiveGlobalRecruitmentStatus(post.status, post.expiresAt);
  const canViewContact = canViewGlobalRecruitmentContact({
    authorId: post.authorId,
    visibility: post.contactVisibility,
    viewerId,
    hasOwnResponse: Boolean(ownResponse),
  });

  return {
    id: post.id,
    title: post.title,
    authorId: post.authorId,
    authorName: post.author?.nickname || post.author?.email || '发起人',
    roomId: post.room?.roomId ?? null,
    roomTitle: post.room?.name ?? null,
    sourceType: post.sourceType,
    systemOrTheme: post.systemOrTheme,
    playFormat: post.playFormat,
    locationOrPlatform: post.locationOrPlatform,
    scheduleText: post.scheduleText,
    playerCountMin: post.playerCountMin,
    playerCountMax: post.playerCountMax,
    experienceRequirement: post.experienceRequirement,
    contactMethod: canViewContact ? post.contactMethod : '',
    contactVisibility: post.contactVisibility,
    contactLocked: !canViewContact,
    status: effectiveStatus,
    rawStatus: post.status,
    description: post.description,
    safetyNote: post.safetyNote,
    tags: parseTags(post.tags),
    expiresAt: post.expiresAt?.toISOString() ?? null,
    closedAt: post.closedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    responseCount,
    reportCount: canManage ? reportCount : undefined,
    canManage,
    ownResponse: ownResponse ? mapResponse(ownResponse) : null,
    responses: canManage ? (post.responses ?? []).map(mapResponse) : [],
  };
}

function mapResponse(response: any) {
  return {
    id: response.id,
    userId: response.userId,
    responderName: response.user?.nickname || response.user?.email || '报名者',
    status: response.status,
    message: response.message,
    contactNote: response.contactNote,
    createdAt: response.createdAt.toISOString(),
    updatedAt: response.updatedAt.toISOString(),
  };
}

function buildPostInclude(viewerId?: string | null) {
  return {
    author: { select: { nickname: true, email: true } },
    room: { select: { roomId: true, name: true } },
    responses: {
      where: viewerId ? { OR: [{ userId: viewerId }, { post: { authorId: viewerId } }] } : { id: '__none__' },
      include: { user: { select: { nickname: true, email: true } } },
      orderBy: { createdAt: 'desc' as const },
    },
    _count: { select: { responses: true, reports: true } },
  };
}

export async function listGlobalRecruitments(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const status = typeof req.query.status === 'string' ? req.query.status : 'OPEN';
    const sourceType = typeof req.query.sourceType === 'string' ? req.query.sourceType : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const includeMine = req.query.mine === '1';
    const now = new Date();

    const posts = await prisma.globalRecruitmentPost.findMany({
      where: {
        ...(includeMine && userId ? { authorId: userId } : {}),
        ...(sourceType && sourceType !== 'ALL' ? { sourceType } : {}),
        ...(status === 'OPEN'
          ? { status: 'OPEN', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
          : status === 'CLOSED'
          ? { status: 'CLOSED' }
          : status === 'EXPIRED'
          ? { status: 'OPEN', expiresAt: { lte: now } }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { systemOrTheme: { contains: q } },
                { playFormat: { contains: q } },
                { locationOrPlatform: { contains: q } },
                { description: { contains: q } },
              ],
            }
          : {}),
      },
      include: buildPostInclude(userId),
      orderBy: [{ updatedAt: 'desc' }],
      take: 80,
    });

    res.json({ success: true, data: { posts: posts.map(post => mapPost(post, userId)) } });
  } catch (error) {
    next(error);
  }
}

export async function getGlobalRecruitment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const post = await prisma.globalRecruitmentPost.findUnique({
      where: { id: req.params.postId },
      include: buildPostInclude(userId),
    });
    if (!post) throw new AppError('GLOBAL_RECRUITMENT_NOT_FOUND', '招募不存在', 404);

    res.json({ success: true, data: { post: mapPost(post, userId) } });
  } catch (error) {
    next(error);
  }
}

export async function createGlobalRecruitment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);
    const payload = postSchema.parse(req.body);
    const minPlayers = payload.playerCountMin ?? 3;
    const maxPlayers = payload.playerCountMax ?? 4;
    if (minPlayers > maxPlayers) throw new AppError('INVALID_PLAYER_COUNT', '最少人数不能大于最多人数', 400);

    const roomDbId = payload.sourceType === 'INTERNAL_ROOM'
      ? await resolveRoomDbId(payload.roomPublicId)
      : null;

    const post = await prisma.globalRecruitmentPost.create({
      data: {
        authorId: userId,
        roomId: roomDbId,
        sourceType: payload.sourceType ?? (roomDbId ? 'INTERNAL_ROOM' : 'EXTERNAL_EVENT'),
        title: payload.title,
        systemOrTheme: payload.systemOrTheme,
        playFormat: payload.playFormat,
        locationOrPlatform: payload.locationOrPlatform,
        scheduleText: payload.scheduleText,
        playerCountMin: minPlayers,
        playerCountMax: maxPlayers,
        experienceRequirement: payload.experienceRequirement ?? '',
        contactMethod: payload.contactMethod,
        contactVisibility: payload.contactVisibility ?? 'RESPONDERS',
        status: payload.status ?? 'OPEN',
        description: payload.description ?? '',
        safetyNote: payload.safetyNote ?? '',
        tags: JSON.stringify(normalizeGlobalRecruitmentTags(payload.tags)),
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
        closedAt: payload.status === 'CLOSED' ? new Date() : null,
      },
      include: buildPostInclude(userId),
    });

    res.status(201).json({ success: true, data: { post: mapPost(post, userId) } });
  } catch (error) {
    next(error);
  }
}

export async function updateGlobalRecruitment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const existing = await prisma.globalRecruitmentPost.findUnique({ where: { id: req.params.postId } });
    if (!existing) throw new AppError('GLOBAL_RECRUITMENT_NOT_FOUND', '招募不存在', 404);
    if (!canManageGlobalRecruitmentPost(existing.authorId, userId)) {
      throw new AppError('FORBIDDEN', '只有作者可以管理这条招募', 403);
    }

    const payload = postPatchSchema.parse(req.body);
    const nextMin = payload.playerCountMin ?? existing.playerCountMin;
    const nextMax = payload.playerCountMax ?? existing.playerCountMax;
    if (nextMin > nextMax) throw new AppError('INVALID_PLAYER_COUNT', '最少人数不能大于最多人数', 400);

    const roomDbId = payload.sourceType === 'INTERNAL_ROOM'
      ? await resolveRoomDbId(payload.roomPublicId)
      : payload.sourceType === 'EXTERNAL_EVENT'
      ? null
      : undefined;

    const post = await prisma.globalRecruitmentPost.update({
      where: { id: existing.id },
      data: {
        roomId: roomDbId,
        sourceType: payload.sourceType,
        title: payload.title,
        systemOrTheme: payload.systemOrTheme,
        playFormat: payload.playFormat,
        locationOrPlatform: payload.locationOrPlatform,
        scheduleText: payload.scheduleText,
        playerCountMin: payload.playerCountMin,
        playerCountMax: payload.playerCountMax,
        experienceRequirement: payload.experienceRequirement,
        contactMethod: payload.contactMethod,
        contactVisibility: payload.contactVisibility,
        status: payload.status,
        description: payload.description,
        safetyNote: payload.safetyNote,
        tags: payload.tags ? JSON.stringify(normalizeGlobalRecruitmentTags(payload.tags)) : undefined,
        expiresAt: payload.expiresAt === undefined ? undefined : payload.expiresAt ? new Date(payload.expiresAt) : null,
        closedAt: payload.status === 'CLOSED' ? new Date() : payload.status === 'OPEN' ? null : undefined,
      },
      include: buildPostInclude(userId),
    });

    res.json({ success: true, data: { post: mapPost(post, userId) } });
  } catch (error) {
    next(error);
  }
}

export async function respondGlobalRecruitment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);
    const payload = responseSchema.parse(req.body);
    const post = await prisma.globalRecruitmentPost.findUnique({ where: { id: req.params.postId } });
    if (!post) throw new AppError('GLOBAL_RECRUITMENT_NOT_FOUND', '招募不存在', 404);
    if (post.authorId === userId) throw new AppError('CANNOT_RESPOND_SELF', '不能报名自己的招募', 400);
    if (getEffectiveGlobalRecruitmentStatus(post.status, post.expiresAt) !== 'OPEN') {
      throw new AppError('GLOBAL_RECRUITMENT_CLOSED', '这条招募已经关闭或过期', 400);
    }

    const response = await prisma.globalRecruitmentResponse.upsert({
      where: { postId_userId: { postId: post.id, userId } },
      create: {
        postId: post.id,
        userId,
        status: 'PENDING',
        message: payload.message ?? '',
        contactNote: payload.contactNote ?? '',
      },
      update: {
        status: 'PENDING',
        message: payload.message ?? '',
        contactNote: payload.contactNote ?? '',
      },
      include: { user: { select: { nickname: true, email: true } } },
    });

    const io = req.app.get('io') as import('socket.io').Server | undefined;
    await createNotification(prisma, io, {
      userId: post.authorId,
      type: 'global_recruitment_response',
      title: `招募板：${post.title} 收到新的报名`,
      content: response.message || '有人通过招募板联系了你。',
      link: '/recruitments',
    });

    res.status(201).json({ success: true, data: { response: mapResponse(response) } });
  } catch (error) {
    next(error);
  }
}

export async function updateGlobalRecruitmentResponse(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);
    const payload = responseReviewSchema.parse(req.body);
    const response = await prisma.globalRecruitmentResponse.findUnique({
      where: { id: req.params.responseId },
      include: { post: true },
    });
    if (!response || response.postId !== req.params.postId) {
      throw new AppError('GLOBAL_RECRUITMENT_RESPONSE_NOT_FOUND', '报名记录不存在', 404);
    }

    const isAuthor = response.post.authorId === userId;
    const isResponder = response.userId === userId;
    if (!isAuthor && !isResponder) throw new AppError('FORBIDDEN', '你不能处理这条报名记录', 403);
    if (!isAuthor && payload.status !== 'WITHDRAWN') {
      throw new AppError('FORBIDDEN', '报名者只能撤回自己的报名', 403);
    }

    const saved = await prisma.globalRecruitmentResponse.update({
      where: { id: response.id },
      data: { status: payload.status },
      include: { user: { select: { nickname: true, email: true } } },
    });

    res.json({ success: true, data: { response: mapResponse(saved) } });
  } catch (error) {
    next(error);
  }
}

export async function reportGlobalRecruitment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);
    const payload = reportSchema.parse(req.body);
    const post = await prisma.globalRecruitmentPost.findUnique({ where: { id: req.params.postId } });
    if (!post) throw new AppError('GLOBAL_RECRUITMENT_NOT_FOUND', '招募不存在', 404);

    const report = await prisma.globalRecruitmentReport.create({
      data: {
        postId: post.id,
        reporterId: userId,
        reason: payload.reason,
        note: payload.note ?? '',
      },
    });

    res.status(201).json({ success: true, data: { reportId: report.id } });
  } catch (error) {
    next(error);
  }
}
