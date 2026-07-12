import { prisma } from '../../../config/database';
import { AppError } from '../../../middleware/error';
import { requireRoomCapability } from '../room-auth';
import { buildStageStatus, canAcceptStageCommands, stageGlobalEnabled, STAGE_CONTRACT_VERSION } from './stage-flags';
import { buildStageCommandDisabledResult, buildStageMessageMeta, nextStageRevision } from './stage-events';
import { buildStageAssetProxyUrl } from './stage-assets';

export type StageCommandEnvelope = {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  commandId: string;
  channelId: string;
  expectedRevision: number;
  commandType: string;
  payload: unknown;
  messageDraft?: {
    content: string;
    targetUserId?: string;
    mode: 'PUBLIC' | 'PRIVATE';
  };
};

function getUserId(input: { userId?: string; user?: { userId: string } }) {
  return input.userId || input.user?.userId;
}

export async function getStageStatus(input: {
  roomId: string;
  userId?: string;
}) {
  const auth = await requireRoomCapability(input.roomId, input.userId, 'canViewPublicContent');
  return buildStageStatus({
    globalEnabled: stageGlobalEnabled(),
    roomStageEnabled: Boolean((auth.room as any).stageEnabled),
    canUseStage: auth.capabilities.canUseStage,
    canManageStage: auth.capabilities.canManageStage,
  });
}

async function ensureMainStageChannel(roomId: string, publicRoomId: string) {
  const existing = await (prisma as any).stageChannel.findFirst({
    where: { roomId, kind: 'MAIN_ROOM' },
  });
  if (existing) return existing;

  return (prisma as any).stageChannel.create({
    data: {
      roomId,
      kind: 'MAIN_ROOM',
      status: 'ACTIVE',
      revision: 0,
      updatedAt: new Date(),
      snapshots: {
        create: {
          roomId,
          revision: 0,
          contractVersion: STAGE_CONTRACT_VERSION,
          projectionJson: JSON.stringify({
            contractVersion: STAGE_CONTRACT_VERSION,
            channel: { id: 'pending', kind: 'MAIN_ROOM', roomId: publicRoomId },
            revision: 0,
            serverTime: new Date().toISOString(),
            viewer: { userId: 'system', kind: 'KP', roomRole: 'OWNER_KP' },
            capabilities: {
              canUseStage: true,
              canControlOwnStageActor: false,
              canManageStage: true,
              canManageStageAssets: true,
              canExportStageReplay: true,
            },
            scene: { title: '共享舞台' },
            actors: [],
            assetRefs: [],
          }),
          updatedAt: new Date(),
        },
      },
    },
  });
}

export async function enableStageForRoom(input: {
  roomId: string;
  userId?: string;
}) {
  const auth = await requireRoomCapability(input.roomId, input.userId, 'canManageStage');
  const updated = await prisma.room.update({
    where: { id: auth.room.id },
    data: { stageEnabled: true } as any,
  });
  await ensureMainStageChannel(auth.room.id, auth.room.roomId);
  return { roomId: updated.roomId, stageEnabled: true };
}

export async function disableStageForRoom(input: {
  roomId: string;
  userId?: string;
}) {
  const auth = await requireRoomCapability(input.roomId, input.userId, 'canManageStage');
  const updated = await prisma.room.update({
    where: { id: auth.room.id },
    data: { stageEnabled: false } as any,
  });
  await (prisma as any).stageChannel.updateMany({
    where: { roomId: auth.room.id },
    data: { status: 'DISABLED' },
  });
  return { roomId: updated.roomId, stageEnabled: false };
}

export async function getStageSnapshot(input: {
  roomId: string;
  channelId: string;
  userId?: string;
}) {
  await requireRoomCapability(input.roomId, input.userId, 'canUseStage');
  const snapshot = await (prisma as any).stageSnapshot.findFirst({
    where: { channelId: input.channelId },
    orderBy: { revision: 'desc' },
  });
  if (!snapshot) throw new AppError('STAGE_CHANNEL_NOT_FOUND', '舞台轨道不存在', 404);
  return JSON.parse(snapshot.projectionJson);
}

export async function getStageAssetProxy(input: {
  roomId: string;
  assetId: string;
  userId?: string;
}) {
  const auth = await requireRoomCapability(input.roomId, input.userId, 'canUseStage');
  const asset = await (prisma as any).stageAsset.findFirst({
    where: { id: input.assetId, roomId: auth.room.id, deletedAt: null },
  });
  if (!asset) throw new AppError('STAGE_ASSET_FORBIDDEN', '素材不存在或无权访问', 404);
  return {
    assetId: asset.id,
    kind: asset.kind,
    version: asset.version,
    proxyUrl: buildStageAssetProxyUrl({ publicRoomId: auth.room.roomId, assetId: asset.id, version: asset.version }),
  };
}

export async function handleStageCommand(input: {
  roomId: string;
  userId: string;
  nickname: string;
  envelope: StageCommandEnvelope;
}) {
  if (input.envelope.contractVersion !== STAGE_CONTRACT_VERSION) {
    throw new AppError('STAGE_INVALID_PAYLOAD', '舞台契约版本不匹配', 400);
  }

  const auth = await requireRoomCapability(input.roomId, input.userId, 'canUseStage');
  const channel = await (prisma as any).stageChannel.findFirst({
    where: { id: input.envelope.channelId, roomId: auth.room.id },
  });
  if (!channel) throw new AppError('STAGE_CHANNEL_NOT_FOUND', '舞台轨道不存在', 404);

  if (!canAcceptStageCommands({ globalEnabled: stageGlobalEnabled(), roomStageEnabled: Boolean((auth.room as any).stageEnabled) })) {
    return buildStageCommandDisabledResult({
      commandId: input.envelope.commandId,
      channelId: input.envelope.channelId,
      revision: channel.revision,
    });
  }

  const revision = nextStageRevision({
    currentRevision: channel.revision,
    expectedRevision: input.envelope.expectedRevision,
  });
  if (!revision.ok) {
    return {
      accepted: false as const,
      commandId: input.envelope.commandId,
      channelId: input.envelope.channelId,
      revision: channel.revision,
      code: revision.code,
      latestRevision: revision.latestRevision,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await (tx as any).stageEvent.findUnique({
      where: { channelId_commandId: { channelId: input.envelope.channelId, commandId: input.envelope.commandId } },
    });
    if (existing) {
      return {
        accepted: true as const,
        commandId: input.envelope.commandId,
        channelId: input.envelope.channelId,
        revision: existing.afterRevision,
      };
    }

    const savedMessage = input.envelope.messageDraft
      ? await tx.roomMessage.create({
          data: {
            roomId: auth.room.id,
            userId: input.userId,
            nickname: input.nickname,
            content: input.envelope.messageDraft.content,
            type: input.envelope.messageDraft.mode === 'PRIVATE' ? 'private' : 'text',
            meta: JSON.stringify(buildStageMessageMeta({
              commandId: input.envelope.commandId,
              channelId: input.envelope.channelId,
              targetUserId: input.envelope.messageDraft.targetUserId,
            })),
          },
        })
      : null;

    await (tx as any).stageEvent.create({
      data: {
        channelId: input.envelope.channelId,
        roomId: auth.room.id,
        commandId: input.envelope.commandId,
        eventType: input.envelope.commandType,
        contractVersion: STAGE_CONTRACT_VERSION,
        roomMessageId: savedMessage?.id,
        operatorUserId: input.userId,
        visibility: input.envelope.messageDraft?.mode === 'PRIVATE' ? 'PRIVATE_TARGETS' : 'PUBLIC',
        beforeRevision: revision.beforeRevision,
        afterRevision: revision.afterRevision,
        payload: JSON.stringify(input.envelope.payload),
      },
    });

    await (tx as any).stageChannel.update({
      where: { id: input.envelope.channelId },
      data: { revision: revision.afterRevision },
    });

    return {
      accepted: true as const,
      commandId: input.envelope.commandId,
      channelId: input.envelope.channelId,
      revision: revision.afterRevision,
    };
  });

  return result;
}

export function getStageUserId(req: { userId?: string; user?: { userId: string } }) {
  return getUserId(req);
}
