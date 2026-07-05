import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { resolveAiModelForTask, type AiTaskType } from './ai-provider.service';
import { buildPlayerVisibleRoomAiContext } from './room-ai-context.service';
import { requireRoomCapability } from './room-auth';

const router = Router();

const modelProviderSchema = z.string().trim().min(1).max(64).optional();
const modelIdSchema = z.string().trim().min(1).max(128).optional();

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  textAssistantEnabled: z.boolean().optional(),
  imageWorkshopEnabled: z.boolean().optional(),
  defaultTextProvider: modelProviderSchema,
  defaultTextModelId: modelIdSchema,
  defaultCharacterProvider: modelProviderSchema,
  defaultCharacterModelId: modelIdSchema,
  defaultImageProvider: modelProviderSchema,
  defaultImageModelId: modelIdSchema,
  playerVisibleContextEnabled: z.boolean().optional(),
  monthlyCostLimitCents: z.number().int().min(0).max(100000).optional(),
});

const taskTypeSchema = z.enum([
  'CLUE_DRAFT',
  'NPC_DRAFT',
  'SCENE_DRAFT',
  'SESSION_RECAP_DRAFT',
  'CURRENT_OBJECTIVE_DRAFT',
  'OPEN_QUESTIONS_DRAFT',
  'CHARACTER_VOICE_DRAFT',
  'IMAGE_ASSET_DRAFT',
]);

const createJobSchema = z.object({
  taskType: taskTypeSchema,
  prompt: z.string().trim().max(4000).optional(),
  sourceIds: z.array(z.string().trim().min(1).max(128)).max(50).optional(),
  visibility: z.enum(['KP_ONLY', 'PLAYER_VISIBLE']).optional(),
  includeContextSnapshot: z.boolean().optional(),
});

const assetSchema = z.object({
  jobId: z.string().trim().min(1).max(128).optional(),
  assetType: z.enum(['IMAGE', 'TEXT', 'AUDIO_RESERVED']),
  purpose: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(120),
  prompt: z.string().trim().max(4000).optional(),
  url: z.string().trim().url().optional(),
  storagePath: z.string().trim().max(500).optional(),
  mimeType: z.string().trim().max(120).optional(),
  visibility: z.enum(['KP_ONLY', 'PLAYER_VISIBLE', 'PUBLIC']).optional(),
  linkedType: z.string().trim().max(64).optional(),
  linkedId: z.string().trim().max(128).optional(),
  approvalStatus: z.enum(['DRAFT', 'APPROVED', 'PUBLISHED', 'DISCARDED']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const assetPatchSchema = assetSchema.partial().extend({
  approvalStatus: z.enum(['DRAFT', 'APPROVED', 'PUBLISHED', 'DISCARDED']).optional(),
});

function getUserId(req: AuthRequest) {
  return req.userId || req.user?.userId;
}

function parseJsonObject(raw: string | null | undefined) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function mapSettings(settings: any) {
  if (!settings) {
    return {
      enabled: false,
      textAssistantEnabled: false,
      imageWorkshopEnabled: false,
      voiceReservedStatus: 'DISABLED_READ_ONLY',
      defaultTextProvider: null,
      defaultTextModelId: null,
      defaultCharacterProvider: null,
      defaultCharacterModelId: null,
      defaultImageProvider: null,
      defaultImageModelId: null,
      playerVisibleContextEnabled: true,
      kpPrivateContextEnabled: false,
      monthlyCostLimitCents: 0,
      updatedById: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    ...settings,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

function mapJob(job: any) {
  return {
    ...job,
    input: parseJsonObject(job.inputJson),
    output: parseJsonObject(job.outputJson),
    inputJson: undefined,
    outputJson: undefined,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

function mapLedger(entry: any) {
  return {
    ...entry,
    metadata: parseJsonObject(entry.metadataJson),
    metadataJson: undefined,
    createdAt: entry.createdAt.toISOString(),
  };
}

function mapAsset(asset: any) {
  return {
    ...asset,
    metadata: parseJsonObject(asset.metadataJson),
    metadataJson: undefined,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

router.get('/:roomId/ai-foundation/settings', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req);
    const { room } = await requireRoomCapability(req.params.roomId, userId, 'canViewPublicContent');
    const settings = await prisma.roomAiSettings.findUnique({ where: { roomId: room.id } });
    res.json({ settings: mapSettings(settings) });
  } catch (error) {
    next(error);
  }
});

router.put('/:roomId/ai-foundation/settings', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req);
    const { room } = await requireRoomCapability(req.params.roomId, userId, 'canUseKPTools');
    const payload = settingsSchema.parse(req.body);

    const settings = await prisma.roomAiSettings.upsert({
      where: { roomId: room.id },
      create: {
        roomId: room.id,
        enabled: payload.enabled ?? false,
        textAssistantEnabled: payload.textAssistantEnabled ?? false,
        imageWorkshopEnabled: payload.imageWorkshopEnabled ?? false,
        voiceReservedStatus: 'DISABLED_READ_ONLY',
        defaultTextProvider: payload.defaultTextProvider,
        defaultTextModelId: payload.defaultTextModelId,
        defaultCharacterProvider: payload.defaultCharacterProvider,
        defaultCharacterModelId: payload.defaultCharacterModelId,
        defaultImageProvider: payload.defaultImageProvider,
        defaultImageModelId: payload.defaultImageModelId,
        playerVisibleContextEnabled: payload.playerVisibleContextEnabled ?? true,
        kpPrivateContextEnabled: false,
        monthlyCostLimitCents: payload.monthlyCostLimitCents ?? 0,
        updatedById: userId,
      },
      update: {
        enabled: payload.enabled,
        textAssistantEnabled: payload.textAssistantEnabled,
        imageWorkshopEnabled: payload.imageWorkshopEnabled,
        voiceReservedStatus: 'DISABLED_READ_ONLY',
        defaultTextProvider: payload.defaultTextProvider,
        defaultTextModelId: payload.defaultTextModelId,
        defaultCharacterProvider: payload.defaultCharacterProvider,
        defaultCharacterModelId: payload.defaultCharacterModelId,
        defaultImageProvider: payload.defaultImageProvider,
        defaultImageModelId: payload.defaultImageModelId,
        playerVisibleContextEnabled: payload.playerVisibleContextEnabled,
        kpPrivateContextEnabled: false,
        monthlyCostLimitCents: payload.monthlyCostLimitCents,
        updatedById: userId,
      },
    });

    res.json({ settings: mapSettings(settings) });
  } catch (error) {
    next(error);
  }
});

router.get('/:roomId/ai-foundation/context-preview', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const context = await buildPlayerVisibleRoomAiContext(req.params.roomId, getUserId(req));
    res.json({ context });
  } catch (error) {
    next(error);
  }
});

router.get('/:roomId/ai-foundation/jobs', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req);
    const { room } = await requireRoomCapability(req.params.roomId, userId, 'canUseKPTools');
    const jobs = await prisma.aiJob.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ jobs: jobs.map(mapJob) });
  } catch (error) {
    next(error);
  }
});

router.post('/:roomId/ai-foundation/jobs', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req);
    const { room } = await requireRoomCapability(req.params.roomId, userId, 'canUseKPTools');
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);

    const payload = createJobSchema.parse(req.body);
    const settings = await prisma.roomAiSettings.findUnique({ where: { roomId: room.id } });
    const selection = resolveAiModelForTask(settings, payload.taskType as AiTaskType);
    const input = {
      prompt: payload.prompt ?? '',
      sourceIds: payload.sourceIds ?? [],
      executionMode: selection.executionMode,
      externalCallsDisabled: selection.externalCallsDisabled,
    };

    const job = await prisma.aiJob.create({
      data: {
        roomId: room.id,
        createdById: userId,
        taskType: payload.taskType,
        status: 'DRAFT',
        visibility: payload.visibility ?? 'KP_ONLY',
        contextScope: 'PLAYER_VISIBLE',
        provider: selection.provider,
        modelId: selection.modelId,
        inputJson: JSON.stringify(input),
      },
    });

    let contextSnapshot = null;
    if (payload.includeContextSnapshot ?? true) {
      const context = await buildPlayerVisibleRoomAiContext(req.params.roomId, userId);
      contextSnapshot = await prisma.aiContextSnapshot.create({
        data: {
          roomId: room.id,
          jobId: job.id,
          createdById: userId,
          contextScope: 'PLAYER_VISIBLE',
          sourceVersion: context.sourceVersion,
          snapshotJson: JSON.stringify(context),
        },
      });
    }

    res.status(201).json({
      job: mapJob(job),
      contextSnapshot: contextSnapshot
        ? {
            id: contextSnapshot.id,
            contextScope: contextSnapshot.contextScope,
            sourceVersion: contextSnapshot.sourceVersion,
            createdAt: contextSnapshot.createdAt.toISOString(),
          }
        : null,
      modelSelection: selection,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:roomId/ai-foundation/usage-ledger', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req);
    const { room } = await requireRoomCapability(req.params.roomId, userId, 'canUseKPTools');
    const ledger = await prisma.aiUsageLedger.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ ledger: ledger.map(mapLedger) });
  } catch (error) {
    next(error);
  }
});

router.get('/:roomId/ai-foundation/assets', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req);
    const { room } = await requireRoomCapability(req.params.roomId, userId, 'canUseKPTools');
    const assets = await prisma.aiAsset.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ assets: assets.map(mapAsset) });
  } catch (error) {
    next(error);
  }
});

router.post('/:roomId/ai-foundation/assets', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req);
    const { room } = await requireRoomCapability(req.params.roomId, userId, 'canUseKPTools');
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);

    const payload = assetSchema.parse(req.body);
    if (payload.jobId) {
      const job = await prisma.aiJob.findFirst({ where: { id: payload.jobId, roomId: room.id } });
      if (!job) throw new AppError('AI_JOB_NOT_FOUND', 'AI 草稿任务不存在', 404);
    }

    const settings = await prisma.roomAiSettings.findUnique({ where: { roomId: room.id } });
    const selection = payload.assetType === 'IMAGE'
      ? resolveAiModelForTask(settings, 'IMAGE_ASSET_DRAFT')
      : payload.assetType === 'AUDIO_RESERVED'
        ? { provider: 'reserved', modelId: 'voice-reserved', unitType: 'reserved_voice' }
        : resolveAiModelForTask(settings, 'CLUE_DRAFT');

    const asset = await prisma.aiAsset.create({
      data: {
        roomId: room.id,
        jobId: payload.jobId,
        createdById: userId,
        assetType: payload.assetType,
        purpose: payload.purpose,
        title: payload.title,
        prompt: payload.prompt ?? '',
        url: payload.url,
        storagePath: payload.storagePath,
        mimeType: payload.mimeType,
        visibility: payload.visibility ?? 'KP_ONLY',
        linkedType: payload.linkedType,
        linkedId: payload.linkedId,
        approvalStatus: payload.approvalStatus ?? 'DRAFT',
        provider: selection.provider,
        modelId: selection.modelId,
        metadataJson: JSON.stringify({
          ...(payload.metadata ?? {}),
          externalCallsDisabled: true,
        }),
      },
    });

    res.status(201).json({ asset: mapAsset(asset) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:roomId/ai-foundation/assets/:assetId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req);
    const { room } = await requireRoomCapability(req.params.roomId, userId, 'canUseKPTools');
    const payload = assetPatchSchema.parse(req.body);
    const existing = await prisma.aiAsset.findFirst({
      where: { id: req.params.assetId, roomId: room.id },
    });

    if (!existing) throw new AppError('AI_ASSET_NOT_FOUND', 'AI 素材草稿不存在', 404);

    const asset = await prisma.aiAsset.update({
      where: { id: existing.id },
      data: {
        assetType: payload.assetType,
        purpose: payload.purpose,
        title: payload.title,
        prompt: payload.prompt,
        url: payload.url,
        storagePath: payload.storagePath,
        mimeType: payload.mimeType,
        visibility: payload.visibility,
        linkedType: payload.linkedType,
        linkedId: payload.linkedId,
        approvalStatus: payload.approvalStatus,
        metadataJson: payload.metadata ? JSON.stringify({
          ...payload.metadata,
          externalCallsDisabled: true,
        }) : undefined,
      },
    });

    res.json({ asset: mapAsset(asset) });
  } catch (error) {
    next(error);
  }
});

export default router;
