import { prisma } from '../../../config/database';
import { AppError } from '../../../middleware/error';
import { requireRoomCapability } from '../room-auth';
import { authorizeStageActorCommand, authorizeStageChannelAccess } from './stage-auth';
import { buildStageStatus, canAcceptStageCommands, stageGlobalEnabled, STAGE_CONTRACT_VERSION } from './stage-flags';
import { buildStageEventAudience, buildStageEventTargetUserIds, buildStageMessageMeta, canExecuteStageChannelCommand, nextStageRevision } from './stage-events';
import { authorizeStageAssetRead, issueStageAssetDeliveryUrl } from './stage-assets';
import { applyStageCommandToProjection, canViewerSeeActor, trimStageAssetRefs } from './stage-projection';
import { validateStageCommandEnvelope } from './stage-validation';

type StageChannelRecord = {
  id: string;
  kind: 'MAIN_ROOM' | 'SUB_ROOM' | 'PRIVATE_THREAD';
  subRoomId: string | null;
  privateThreadId: string | null;
  scopeKey: string;
  parentChannelId: string | null;
  participantUserIds?: string;
  status: 'ACTIVE' | 'DISABLED';
  revision: number;
};

function getUserId(input: { userId?: string; user?: { userId: string } }) {
  return input.userId || input.user?.userId;
}

function stageViewer(input: { userId?: string; role: string }) {
  return {
    userId: input.userId ?? '',
    kind: input.role === 'OWNER_KP' || input.role === 'ASSISTANT_KP' ? 'KP' as const : input.role === 'PLAYER' ? 'PLAYER' as const : 'OBSERVER' as const,
    roomRole: input.role,
  };
}

function parseUserIds(value?: string) {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}

function parseTargetUserIds(value?: string) {
  try {
    const parsed = JSON.parse(value ?? '{}');
    const candidates = Array.isArray(parsed) ? parsed : parsed.targetUserIds;
    return Array.isArray(candidates) && candidates.every((item) => typeof item === 'string') ? candidates : [];
  } catch {
    return [];
  }
}

function channelRef(channel: StageChannelRecord, publicRoomId: string) {
  return {
    id: channel.id,
    kind: channel.kind,
    roomId: publicRoomId,
    ...(channel.subRoomId ? { subRoomId: channel.subRoomId } : {}),
    ...(channel.privateThreadId ? { privateThreadId: channel.privateThreadId } : {}),
    ...(channel.parentChannelId ? { parentChannelId: channel.parentChannelId } : {}),
  };
}

async function memberSubRoomIds(userId: string | undefined, roomId: string) {
  if (!userId) return new Set<string>();
  const memberships = await (prisma as any).subRoomMember.findMany({
    where: { userId, leftAt: null, subRoom: { parentRoomId: roomId } },
    select: { subRoomId: true },
  });
  return new Set<string>(memberships.map((membership: { subRoomId: string }) => membership.subRoomId));
}

async function accessibleStageChannels(input: {
  roomId: string;
  publicRoomId: string;
  userId?: string;
  role: string;
  capabilities: { canUseStage: boolean; canManageStage: boolean };
}) {
  const channels = await (prisma as any).stageChannel.findMany({
    where: { roomId: input.roomId },
    orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
  }) as StageChannelRecord[];
  const memberSubRooms = await memberSubRoomIds(input.userId, input.roomId);
  const subRooms = await (prisma as any).subRoom.findMany({
    where: { parentRoomId: input.roomId },
    select: { id: true, name: true, description: true },
  });
  const subRoomById = new Map<string, { id: string; name: string; description?: string | null }>(
    subRooms.map((subRoom: { id: string; name: string; description?: string | null }) => [subRoom.id, subRoom]),
  );

  return channels.filter((channel) => channel.kind !== 'MAIN_ROOM' || channel.scopeKey === 'main').flatMap((channel) => {
    const channelInput = channel.kind === 'MAIN_ROOM'
      ? { kind: 'MAIN_ROOM' as const, roomId: input.roomId }
      : channel.kind === 'SUB_ROOM' && channel.subRoomId
        ? { kind: 'SUB_ROOM' as const, roomId: input.roomId, subRoomId: channel.subRoomId }
        : channel.privateThreadId
          ? { kind: 'PRIVATE_THREAD' as const, roomId: input.roomId, privateThreadId: channel.privateThreadId, participantUserIds: parseUserIds(channel.participantUserIds) }
          : null;
    if (!channelInput) return [];
    const access = authorizeStageChannelAccess({
      channel: channelInput,
      userId: input.userId ?? '',
      role: input.role as any,
      capabilities: input.capabilities,
      subRoomMemberUserIds: [...memberSubRooms],
    });
    if (!access.allowed) return [];
    const subRoom = channel.subRoomId ? subRoomById.get(channel.subRoomId) : undefined;
    return [{
      channel: channelRef(channel, input.publicRoomId),
      status: channel.status,
      revision: channel.revision,
      scope: channel.kind === 'MAIN_ROOM'
        ? { type: 'ROOM' as const }
        : channel.kind === 'SUB_ROOM'
          ? { type: 'SUB_ROOM' as const, subRoomId: channel.subRoomId! }
          : { type: 'PRIVATE_THREAD' as const, privateThreadId: channel.privateThreadId! },
      display: channel.kind === 'MAIN_ROOM'
        ? { label: '主舞台', description: '房间全体可见的公开舞台' }
        : channel.kind === 'SUB_ROOM'
          ? { label: subRoom?.name ?? '子房间舞台', ...(subRoom?.description ? { description: subRoom.description } : {}) }
          : { label: '私密舞台', description: '仅限私密参与者与 KP' },
    }];
  });
}

async function requireStageChannelAccess(input: {
  roomId: string;
  publicRoomId: string;
  userId?: string;
  role: string;
  capabilities: { canUseStage: boolean; canManageStage: boolean };
  channelId: string;
}) {
  const channel = await (prisma as any).stageChannel.findFirst({
    where: { id: input.channelId, roomId: input.roomId },
  }) as StageChannelRecord | null;
  if (!channel) throw new AppError('STAGE_CHANNEL_NOT_FOUND', '舞台轨道不存在', 404);
  const subRoomMembers = channel.subRoomId ? [...await memberSubRoomIds(input.userId, input.roomId)] : [];
  const channelInput = channel.kind === 'MAIN_ROOM'
    ? { kind: 'MAIN_ROOM' as const, roomId: input.roomId }
    : channel.kind === 'SUB_ROOM' && channel.subRoomId
      ? { kind: 'SUB_ROOM' as const, roomId: input.roomId, subRoomId: channel.subRoomId }
      : channel.privateThreadId
        ? { kind: 'PRIVATE_THREAD' as const, roomId: input.roomId, privateThreadId: channel.privateThreadId, participantUserIds: parseUserIds(channel.participantUserIds) }
        : null;
  if (!channelInput || !authorizeStageChannelAccess({
    channel: channelInput,
    userId: input.userId ?? '',
    role: input.role as any,
    capabilities: input.capabilities,
    subRoomMemberUserIds: subRoomMembers,
  }).allowed) {
    throw new AppError('STAGE_FORBIDDEN', '你无权访问此舞台轨道', 403);
  }
  return channel;
}

export async function getStageStatus(input: { roomId: string; userId?: string }) {
  const auth = await requireRoomCapability(input.roomId, input.userId, 'canViewPublicContent');
  const channels = await accessibleStageChannels({
    roomId: auth.room.id,
    publicRoomId: auth.room.roomId,
    userId: input.userId,
    role: auth.role,
    capabilities: auth.capabilities,
  });
  return buildStageStatus({
    globalEnabled: stageGlobalEnabled(),
    roomStageEnabled: Boolean((auth.room as any).stageEnabled),
    canUseStage: auth.capabilities.canUseStage,
    canControlOwnStageActor: auth.capabilities.canControlOwnStageActor,
    canManageStage: auth.capabilities.canManageStage,
    canManageStageAssets: auth.capabilities.canManageStageAssets,
    canExportStageReplay: auth.capabilities.canExportStageReplay,
    viewer: stageViewer({ userId: input.userId, role: auth.role }),
    channels,
  });
}

async function ensureMainStageChannel(roomId: string, publicRoomId: string) {
  const existing = await (prisma as any).stageChannel.findFirst({ where: { roomId, scopeKey: 'main' } });
  if (existing) return existing;
  return (prisma as any).stageChannel.create({
    data: {
      roomId, kind: 'MAIN_ROOM', scopeKey: 'main', status: 'ACTIVE', revision: 0, updatedAt: new Date(),
      snapshots: { create: { roomId, revision: 0, contractVersion: STAGE_CONTRACT_VERSION, projectionJson: JSON.stringify({
        contractVersion: STAGE_CONTRACT_VERSION,
        channel: { id: 'pending', kind: 'MAIN_ROOM', roomId: publicRoomId }, revision: 0, serverTime: new Date().toISOString(),
        viewer: { userId: 'system', kind: 'KP', roomRole: 'OWNER_KP' },
        capabilities: { canUseStage: true, canControlOwnStageActor: false, canManageStage: true, canManageStageAssets: true, canExportStageReplay: true },
        scene: { title: '共享舞台' }, actors: [], assetRefs: [],
      }), updatedAt: new Date() } },
    },
  });
}

export async function enableStageForRoom(input: { roomId: string; userId?: string }) {
  const auth = await requireRoomCapability(input.roomId, input.userId, 'canManageStage');
  await prisma.room.update({ where: { id: auth.room.id }, data: { stageEnabled: true } as any });
  await ensureMainStageChannel(auth.room.id, auth.room.roomId);
  await (prisma as any).stageChannel.updateMany({ where: { roomId: auth.room.id }, data: { status: 'ACTIVE' } });
  return getStageStatus(input);
}

export async function disableStageForRoom(input: { roomId: string; userId?: string }) {
  const auth = await requireRoomCapability(input.roomId, input.userId, 'canManageStage');
  await prisma.room.update({ where: { id: auth.room.id }, data: { stageEnabled: false } as any });
  await (prisma as any).stageChannel.updateMany({ where: { roomId: auth.room.id }, data: { status: 'DISABLED' } });
  return getStageStatus(input);
}

export async function getStageSnapshot(input: { roomId: string; channelId: string; userId?: string }) {
  const auth = await requireRoomCapability(input.roomId, input.userId, 'canUseStage');
  const channel = await requireStageChannelAccess({ roomId: auth.room.id, publicRoomId: auth.room.roomId, userId: input.userId, role: auth.role, capabilities: auth.capabilities, channelId: input.channelId });
  const snapshot = await (prisma as any).stageSnapshot.findFirst({ where: { channelId: channel.id }, orderBy: { revision: 'desc' } });
  if (!snapshot) throw new AppError('STAGE_CHANNEL_NOT_FOUND', '舞台轨道不存在', 404);
  const parsed = JSON.parse(snapshot.projectionJson);
  const viewer = stageViewer({ userId: input.userId, role: auth.role });
  const referencedAssetIds = [...new Set([
    ...(parsed.assetRefs ?? []).map((asset: { assetId?: string }) => asset.assetId),
    parsed.scene?.backgroundAssetId, parsed.scene?.bgmAssetId, parsed.scene?.ambienceAssetId,
  ].filter((assetId): assetId is string => typeof assetId === 'string'))];
  const assets = referencedAssetIds.length ? await (prisma as any).stageAsset.findMany({
    where: { id: { in: referencedAssetIds }, roomId: auth.room.id, deletedAt: null },
  }) : [];
  const visibleAssets = trimStageAssetRefs({
    viewerUserId: input.userId ?? '',
    viewerCanManageStage: auth.capabilities.canManageStage,
    roomUserIds: auth.room.members.filter((member: { leftAt: Date | null }) => !member.leftAt).map((member: { userId: string }) => member.userId),
    assets: assets.map((asset: any) => ({
      assetId: asset.id, kind: asset.kind, version: asset.version, visibility: asset.visibility,
      allowedUserIds: parseTargetUserIds(asset.metadataJson),
      proxyUrl: issueStageAssetDeliveryUrl({ assetId: asset.id, version: asset.version, viewerUserId: input.userId ?? '' }) ?? '',
      width: asset.width ?? undefined, height: asset.height ?? undefined, durationMs: asset.durationMs ?? undefined,
      hash: asset.hash, storageKey: asset.storageKey,
    })),
  }).filter((asset: { proxyUrl: string }) => Boolean(asset.proxyUrl)).map(({ visibility: _visibility, ...asset }: any) => asset);
  const visibleAssetIds = new Set(visibleAssets.map((asset: { assetId: string }) => asset.assetId));
  const safeActors = (parsed.actors ?? []).filter((actor: any) => canViewerSeeActor({
    visibility: actor.visibility, viewerUserId: input.userId ?? '', viewerCanManageStage: auth.capabilities.canManageStage,
    targetUserIds: parseTargetUserIds(JSON.stringify(actor.targetUserIds ?? [])),
  })).map(({ targetUserIds: _targetUserIds, ...actor }: any) => actor);
  const safeScene = { ...(parsed.scene ?? { title: '共享舞台' }) };
  for (const field of ['backgroundAssetId', 'bgmAssetId', 'ambienceAssetId'] as const) {
    if (safeScene[field] && !visibleAssetIds.has(safeScene[field])) delete safeScene[field];
  }
  if (!auth.capabilities.canManageStageAssets) delete safeScene.themePackId;
  return {
    contractVersion: STAGE_CONTRACT_VERSION,
    channel: channelRef(channel, auth.room.roomId),
    revision: snapshot.revision,
    projection: {
      ...parsed,
      contractVersion: STAGE_CONTRACT_VERSION,
      channel: channelRef(channel, auth.room.roomId),
      revision: snapshot.revision,
      viewer,
      capabilities: {
        canUseStage: auth.capabilities.canUseStage,
        canControlOwnStageActor: auth.capabilities.canControlOwnStageActor,
        canManageStage: auth.capabilities.canManageStage,
        canManageStageAssets: auth.capabilities.canManageStageAssets,
        canExportStageReplay: auth.capabilities.canExportStageReplay,
      },
      scene: safeScene,
      actors: safeActors,
      assetRefs: visibleAssets,
    },
  };
}

export async function getStageAssetProxy(input: { roomId: string; assetId: string; userId?: string }) {
  const auth = await requireRoomCapability(input.roomId, input.userId, 'canUseStage');
  const asset = await (prisma as any).stageAsset.findFirst({ where: { id: input.assetId, roomId: auth.room.id, deletedAt: null } });
  if (!asset) throw new AppError('STAGE_ASSET_FORBIDDEN', '素材不存在或无权访问', 404);
  const allowed = authorizeStageAssetRead({
    visibility: asset.visibility,
    viewerUserId: input.userId ?? '',
    roomUserIds: auth.room.members.filter((member: { leftAt: Date | null }) => !member.leftAt).map((member: { userId: string }) => member.userId),
    targetUserIds: parseTargetUserIds(asset.metadataJson),
    canManageStage: auth.capabilities.canManageStage,
  });
  if (!allowed) throw new AppError('STAGE_ASSET_FORBIDDEN', '素材不存在或无权访问', 403);
  const proxyUrl = issueStageAssetDeliveryUrl({ assetId: asset.id, version: asset.version, viewerUserId: input.userId ?? '' });
  if (!proxyUrl) throw new AppError('STAGE_INTERNAL_ERROR', '私有素材投递服务未配置', 503);
  return { assetId: asset.id, kind: asset.kind, version: asset.version, proxyUrl };
}

function rejectedAck(input: { commandId: string; channelId: string; revision: number; code: string; message: string }) {
  return { contractVersion: STAGE_CONTRACT_VERSION, accepted: false as const, outcome: 'REJECTED' as const, commandId: input.commandId, channelId: input.channelId, revision: input.revision, error: { code: input.code, message: input.message } };
}

export async function handleStageCommand(input: { roomId: string; userId: string; nickname: string; envelope: unknown }) {
  const validated = validateStageCommandEnvelope(input.envelope);
  if (!validated.ok) throw new AppError('STAGE_INVALID_PAYLOAD', validated.message, 400);
  const envelope = validated.envelope as any;
  const auth = await requireRoomCapability(input.roomId, input.userId, 'canUseStage');
  const channel = await requireStageChannelAccess({ roomId: auth.room.id, publicRoomId: auth.room.roomId, userId: input.userId, role: auth.role, capabilities: auth.capabilities, channelId: envelope.channelId });
  if (['SCENE_SET', 'SCENE_CLEAR', 'CHANNEL_ENABLE', 'CHANNEL_DISABLE'].includes(envelope.commandType) && !auth.capabilities.canManageStage) {
    throw new AppError('STAGE_FORBIDDEN', '只有 KP 可以调整场景或轨道状态', 403);
  }
  if (envelope.messageDraft?.mode === 'PRIVATE' && !parseUserIds(channel.participantUserIds).includes(envelope.messageDraft.targetUserId)) {
    throw new AppError('STAGE_FORBIDDEN', '私密消息接收者不属于当前舞台轨道', 403);
  }
  return prisma.$transaction(async (tx) => {
    const replayed = await (tx as any).stageEvent.findUnique({ where: { channelId_commandId: { channelId: envelope.channelId, commandId: envelope.commandId } } });
    if (replayed) return { contractVersion: STAGE_CONTRACT_VERSION, accepted: true as const, outcome: 'REPLAYED' as const, commandId: envelope.commandId, channelId: envelope.channelId, revision: replayed.afterRevision };
    const currentChannel = await (tx as any).stageChannel.findUnique({ where: { id: channel.id } }) as StageChannelRecord | null;
    if (!currentChannel) throw new AppError('STAGE_CHANNEL_NOT_FOUND', '舞台轨道不存在', 404);
    if (!canExecuteStageChannelCommand({ status: currentChannel.status, commandType: envelope.commandType, canManageStage: auth.capabilities.canManageStage }) || !canAcceptStageCommands({ globalEnabled: stageGlobalEnabled(), roomStageEnabled: Boolean((auth.room as any).stageEnabled) })) {
      return rejectedAck({ commandId: envelope.commandId, channelId: envelope.channelId, revision: currentChannel.revision, code: 'STAGE_DISABLED', message: '舞台当前未启用' });
    }
    const revision = nextStageRevision({ currentRevision: currentChannel.revision, expectedRevision: envelope.expectedRevision });
    if (!revision.ok) return {
      contractVersion: STAGE_CONTRACT_VERSION, accepted: false as const, outcome: 'CONFLICT' as const,
      commandId: envelope.commandId, channelId: envelope.channelId, revision: currentChannel.revision,
      error: { code: revision.code, message: '舞台版本已更新，请恢复最新状态', latestRevision: revision.latestRevision },
      recovery: { type: 'REFETCH_SNAPSHOT' as const, snapshotUrl: `/api/rooms/${auth.room.roomId}/stage/channels/${channel.id}/snapshot` },
    };
    const latestSnapshot = await (tx as any).stageSnapshot.findFirst({ where: { channelId: envelope.channelId }, orderBy: { revision: 'desc' } });
    const previousProjection = latestSnapshot ? JSON.parse(latestSnapshot.projectionJson) : {
      contractVersion: STAGE_CONTRACT_VERSION, channel: channelRef(currentChannel, auth.room.roomId), revision: revision.beforeRevision,
      serverTime: new Date().toISOString(), viewer: stageViewer({ userId: input.userId, role: auth.role }),
      capabilities: auth.capabilities, scene: { title: '共享舞台' }, actors: [], assetRefs: [],
    };
    const kpUserIds = [...new Set([
      auth.room.creatorId,
      ...auth.room.members.filter((member: { leftAt: Date | null; role: string }) => !member.leftAt && member.role === 'KP').map((member: { userId: string }) => member.userId),
    ])];
    let eventAudience = envelope.messageDraft?.mode === 'PRIVATE'
      ? buildStageEventAudience({ visibility: 'PRIVATE_TARGETS', targetUserIds: buildStageEventTargetUserIds({ operatorUserId: input.userId, targetUserId: envelope.messageDraft.targetUserId }), kpUserIds })
      : buildStageEventAudience({ visibility: 'PUBLIC', targetUserIds: [], kpUserIds: [] });
    if (envelope.commandType.startsWith('ACTOR_')) {
      const actor = previousProjection.actors?.find((item: { actorId: string }) => item.actorId === envelope.payload.actorId);
      const actorAccess = actor && authorizeStageActorCommand({ actorKind: actor.actorKind, ownerUserId: actor.ownerUserId, userId: input.userId, capabilities: auth.capabilities });
      if (!actorAccess?.allowed) throw new AppError('STAGE_ACTOR_FORBIDDEN', '演员不存在或无权操作', 403);
      eventAudience = buildStageEventAudience({
        visibility: actor.visibility,
        targetUserIds: parseTargetUserIds(JSON.stringify(actor.targetUserIds ?? [])),
        kpUserIds,
      });
    }
    const updated = await (tx as any).stageChannel.updateMany({
      where: { id: currentChannel.id, revision: envelope.expectedRevision },
      data: {
        revision: revision.afterRevision,
        ...(envelope.commandType === 'CHANNEL_ENABLE' ? { status: 'ACTIVE' } : {}),
        ...(envelope.commandType === 'CHANNEL_DISABLE' ? { status: 'DISABLED' } : {}),
      },
    });
    if (updated.count !== 1) {
      const latest = await (tx as any).stageChannel.findUnique({ where: { id: currentChannel.id } });
      return {
        contractVersion: STAGE_CONTRACT_VERSION, accepted: false as const, outcome: 'CONFLICT' as const,
        commandId: envelope.commandId, channelId: envelope.channelId, revision: latest?.revision ?? currentChannel.revision,
        error: { code: 'STAGE_REVISION_CONFLICT' as const, message: '舞台版本已更新，请恢复最新状态', latestRevision: latest?.revision ?? currentChannel.revision },
        recovery: { type: 'REFETCH_SNAPSHOT' as const, snapshotUrl: `/api/rooms/${auth.room.roomId}/stage/channels/${channel.id}/snapshot` },
      };
    }
    const savedMessage = envelope.messageDraft ? await tx.roomMessage.create({ data: {
      roomId: auth.room.id, userId: input.userId, nickname: input.nickname, content: envelope.messageDraft.content,
      type: envelope.messageDraft.mode === 'PRIVATE' ? 'private' : 'text',
      meta: JSON.stringify(buildStageMessageMeta({ commandId: envelope.commandId, channelId: envelope.channelId, targetUserId: envelope.messageDraft.targetUserId, participantUserIds: parseUserIds(currentChannel.participantUserIds) })),
    } }) : null;
    await (tx as any).stageEvent.create({ data: {
      channelId: envelope.channelId, roomId: auth.room.id, commandId: envelope.commandId, eventType: envelope.commandType, contractVersion: STAGE_CONTRACT_VERSION,
      roomMessageId: savedMessage?.id, operatorUserId: input.userId, visibility: eventAudience.visibility,
      targetUserIds: JSON.stringify(eventAudience.targetUserIds),
      beforeRevision: revision.beforeRevision, afterRevision: revision.afterRevision, payload: JSON.stringify(envelope.payload),
    } });
    await (tx as any).stageSnapshot.create({ data: {
      channelId: envelope.channelId,
      roomId: auth.room.id,
      revision: revision.afterRevision,
      contractVersion: STAGE_CONTRACT_VERSION,
      projectionJson: JSON.stringify(applyStageCommandToProjection({
        projection: previousProjection,
        revision: revision.afterRevision,
        commandType: envelope.commandType,
        payload: envelope.payload,
      })),
      updatedAt: new Date(),
    } });
    return { contractVersion: STAGE_CONTRACT_VERSION, accepted: true as const, outcome: 'APPLIED' as const, commandId: envelope.commandId, channelId: envelope.channelId, revision: revision.afterRevision };
  });
}

export async function getStageEventForCommand(input: { channelId: string; commandId: string }) {
  const event = await (prisma as any).stageEvent.findUnique({
    where: { channelId_commandId: { channelId: input.channelId, commandId: input.commandId } },
  });
  if (!event) return null;
  return {
    contractVersion: STAGE_CONTRACT_VERSION,
    eventId: event.id,
    channelId: event.channelId,
    commandId: event.commandId,
    eventType: event.eventType,
    beforeRevision: event.beforeRevision,
    afterRevision: event.afterRevision,
    ...(event.operatorUserId ? { operatorUserId: event.operatorUserId } : {}),
    ...(event.roomMessageId ? { roomMessageId: event.roomMessageId } : {}),
    visibility: event.visibility,
    targetUserIds: parseUserIds(event.targetUserIds),
    payload: JSON.parse(event.payload),
    createdAt: event.createdAt.toISOString(),
  };
}

export function getStageUserId(req: { userId?: string; user?: { userId: string } }) {
  return getUserId(req);
}
