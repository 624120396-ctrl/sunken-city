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

export default router;
