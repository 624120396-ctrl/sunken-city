export type StageCommandResult =
  | { accepted: true; commandId: string; channelId: string; revision: number }
  | { accepted: false; commandId: string; channelId: string; revision: number; code: string; latestRevision?: number };

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
    accepted: false,
    commandId: input.commandId,
    channelId: input.channelId,
    revision: input.revision,
    code: 'STAGE_DISABLED',
  };
}

export function buildStageMessageMeta(input: {
  commandId: string;
  channelId: string;
  targetUserId?: string;
}) {
  return {
    stageCommandId: input.commandId,
    stageChannelId: input.channelId,
    ...(input.targetUserId ? { targetUserId: input.targetUserId } : {}),
  };
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
