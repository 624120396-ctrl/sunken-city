export type StageCommandResult =
  | { contractVersion: 'stage.d1a.v1.1'; accepted: true; outcome: 'APPLIED' | 'REPLAYED'; commandId: string; channelId: string; revision: number }
  | { contractVersion: 'stage.d1a.v1.1'; accepted: false; outcome: 'REJECTED'; commandId: string; channelId: string; revision: number; error: { code: string; message: string } };

export function nextStageRevision(input: { currentRevision: number; expectedRevision: number }) {
  if (input.expectedRevision !== input.currentRevision) {
    return {
      ok: false as const,
      code: 'STAGE_REVISION_CONFLICT' as const,
      latestRevision: input.currentRevision,
    };
  }
  return { ok: true as const, beforeRevision: input.currentRevision, afterRevision: input.currentRevision + 1 };
}

export function buildStageEventPayload(input: {
  commandId: string;
  commandType: string;
  operatorUserId: string;
  beforeRevision: number;
  afterRevision: number;
  payload: unknown;
}) {
  return {
    commandId: input.commandId,
    eventType: input.commandType,
    operatorUserId: input.operatorUserId,
    beforeRevision: input.beforeRevision,
    afterRevision: input.afterRevision,
    payload: input.payload,
  };
}

export function buildStageCommandDisabledResult(input: {
  commandId: string;
  channelId: string;
  revision: number;
}): StageCommandResult {
  return {
    contractVersion: 'stage.d1a.v1.1',
    accepted: false,
    outcome: 'REJECTED',
    commandId: input.commandId,
    channelId: input.channelId,
    revision: input.revision,
    error: {
      code: 'STAGE_DISABLED',
      message: '舞台当前未启用',
    },
  };
}

export function buildStageMessageMeta(input: {
  commandId: string;
  channelId: string;
  targetUserId?: string;
  participantUserIds?: string[];
}) {
  return {
    stageCommandId: input.commandId,
    stageChannelId: input.channelId,
    ...(input.targetUserId ? { targetUserId: input.targetUserId } : {}),
    ...(input.participantUserIds ? { participantUserIds: input.participantUserIds } : {}),
  };
}

/** PRIVATE_TARGETS events are delivered only to their recipient and operator. */
export function buildStageEventTargetUserIds(input: { operatorUserId: string; targetUserId?: string }) {
  return [...new Set([input.operatorUserId, input.targetUserId].filter((userId): userId is string => Boolean(userId)))];
}

export function buildStageEventAudience(input: {
  visibility: 'PUBLIC' | 'KP_ONLY' | 'PRIVATE_TARGETS';
  targetUserIds: string[];
  kpUserIds: string[];
}) {
  if (input.visibility === 'PUBLIC') return { visibility: 'PUBLIC' as const, targetUserIds: [] };
  if (input.visibility === 'KP_ONLY') return { visibility: 'KP_ONLY' as const, targetUserIds: [...new Set(input.kpUserIds)] };
  return { visibility: 'PRIVATE_TARGETS' as const, targetUserIds: [...new Set([...input.targetUserIds, ...input.kpUserIds])] };
}

export function canExecuteStageChannelCommand(input: {
  status: 'ACTIVE' | 'DISABLED';
  commandType: string;
  canManageStage: boolean;
}) {
  return input.status === 'ACTIVE' || (input.commandType === 'CHANNEL_ENABLE' && input.canManageStage);
}

export async function appendStageEvent(input: {
  tx: {
    stageEvent: {
      findUnique(args: unknown): Promise<{ id: string; afterRevision: number; payload: string } | null>;
      create(args: unknown): Promise<{ id: string; afterRevision: number }>;
    };
    stageChannel: {
      update(args: unknown): Promise<{ id: string; revision: number }>;
    };
  };
  channelId: string;
  roomId: string;
  commandId: string;
  eventType: string;
  contractVersion: string;
  operatorUserId: string;
  visibility: string;
  beforeRevision: number;
  afterRevision: number;
  payload: unknown;
}) {
  const existing = await input.tx.stageEvent.findUnique({
    where: { channelId_commandId: { channelId: input.channelId, commandId: input.commandId } },
  });
  if (existing) return { replayed: true as const, event: existing };

  const event = await input.tx.stageEvent.create({
    data: {
      channelId: input.channelId,
      roomId: input.roomId,
      commandId: input.commandId,
      eventType: input.eventType,
      contractVersion: input.contractVersion,
      operatorUserId: input.operatorUserId,
      visibility: input.visibility,
      beforeRevision: input.beforeRevision,
      afterRevision: input.afterRevision,
      payload: JSON.stringify(input.payload),
    },
  });
  await input.tx.stageChannel.update({
    where: { id: input.channelId },
    data: { revision: input.afterRevision },
  });
  return { replayed: false as const, event };
}
