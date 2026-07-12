/**
 * Shared Stage D1-A public contract.
 *
 * This file is the only D1-B integration surface.  It intentionally contains
 * no Prisma model, room service, or untrimmed room-state types.
 */
export const STAGE_CONTRACT_VERSION = 'stage.d1a.v1.1' as const;

export const STAGE_SOCKET_EVENTS = {
  JOIN_CHANNEL: 'stage:channel:join',
  LEAVE_CHANNEL: 'stage:channel:leave',
  COMMAND: 'stage:command',
  COMMAND_ACK: 'stage:command:ack',
  SNAPSHOT: 'stage:snapshot',
  EVENT: 'stage:event',
  ERROR: 'stage:error',
} as const;

export const STAGE_REST_ENDPOINTS = {
  STATUS: 'GET /api/rooms/:roomId/stage/status',
  SNAPSHOT: 'GET /api/rooms/:roomId/stage/channels/:channelId/snapshot',
  ENABLE: 'POST /api/rooms/:roomId/stage/enable',
  DISABLE: 'POST /api/rooms/:roomId/stage/disable',
  ASSET_PROXY: 'GET /api/rooms/:roomId/stage/assets/:assetId/proxy',
} as const;

/** Validation limits are public so clients can prevent invalid submissions. */
export const STAGE_COMMAND_LIMITS = {
  ID_MAX_LENGTH: 128,
  SCENE_TITLE_MAX_LENGTH: 120,
  SCENE_DESCRIPTION_MAX_LENGTH: 2_000,
  ACTION_MAX_LENGTH: 80,
  EXPRESSION_MAX_LENGTH: 80,
  MESSAGE_DRAFT_MAX_LENGTH: 2_000,
} as const;

export type StageChannelKind = 'MAIN_ROOM' | 'SUB_ROOM' | 'PRIVATE_THREAD';
export type StageChannelStatus = 'ACTIVE' | 'DISABLED';
export type StageViewerKind = 'KP' | 'PLAYER' | 'OBSERVER';
export type StageActorKind = 'PLAYER_CHARACTER' | 'NPC' | 'TEMPORARY';
export type StageVisibility = 'PUBLIC' | 'KP_ONLY' | 'PRIVATE_TARGETS';
export type StageZone = 'far-left' | 'left' | 'center' | 'right' | 'far-right' | 'backstage';
export type StageAssetKind = 'PORTRAIT' | 'BACKGROUND' | 'BGM' | 'AMBIENCE' | 'THEME';

export type StageCommandType =
  | 'ACTOR_ENTER'
  | 'ACTOR_EXIT'
  | 'ACTOR_PERFORM'
  | 'SCENE_SET'
  | 'SCENE_CLEAR'
  | 'CHANNEL_ENABLE'
  | 'CHANNEL_DISABLE';

export type StageErrorCode =
  | 'STAGE_DISABLED'
  | 'STAGE_CHANNEL_NOT_FOUND'
  | 'STAGE_FORBIDDEN'
  | 'STAGE_ACTOR_FORBIDDEN'
  | 'STAGE_ASSET_FORBIDDEN'
  | 'STAGE_REVISION_CONFLICT'
  | 'STAGE_COMMAND_REPLAYED'
  | 'STAGE_INVALID_PAYLOAD'
  | 'STAGE_INTERNAL_ERROR';

export const STAGE_ERROR_CODES: Record<StageErrorCode, StageErrorCode> = {
  STAGE_DISABLED: 'STAGE_DISABLED',
  STAGE_CHANNEL_NOT_FOUND: 'STAGE_CHANNEL_NOT_FOUND',
  STAGE_FORBIDDEN: 'STAGE_FORBIDDEN',
  STAGE_ACTOR_FORBIDDEN: 'STAGE_ACTOR_FORBIDDEN',
  STAGE_ASSET_FORBIDDEN: 'STAGE_ASSET_FORBIDDEN',
  STAGE_REVISION_CONFLICT: 'STAGE_REVISION_CONFLICT',
  STAGE_COMMAND_REPLAYED: 'STAGE_COMMAND_REPLAYED',
  STAGE_INVALID_PAYLOAD: 'STAGE_INVALID_PAYLOAD',
  STAGE_INTERNAL_ERROR: 'STAGE_INTERNAL_ERROR',
};

export interface StageChannelRef {
  id: string;
  kind: StageChannelKind;
  roomId: string;
  subRoomId?: string;
  privateThreadId?: string;
  parentChannelId?: string;
}

export type StageChannelScope =
  | { type: 'ROOM' }
  | { type: 'SUB_ROOM'; subRoomId: string }
  | { type: 'PRIVATE_THREAD'; privateThreadId: string };

export interface StageChannelDisplay {
  label: string;
  description?: string;
}

/** A channel already access-filtered for the current member. */
export interface StageChannelProjection {
  channel: StageChannelRef;
  status: StageChannelStatus;
  revision: number;
  scope: StageChannelScope;
  display: StageChannelDisplay;
}

export interface StageViewerProjection {
  userId: string;
  kind: StageViewerKind;
  roomRole: string;
}

export interface StageCapabilitiesProjection {
  canUseStage: boolean;
  canControlOwnStageActor: boolean;
  canManageStage: boolean;
  canManageStageAssets: boolean;
  canExportStageReplay: boolean;
}

/** Complete status payload returned by the stage status endpoint. */
export interface StageStatusProjection {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  /** Whether the room/global feature switches permit stage traffic. */
  stageEnabled: boolean;
  /** Compatibility read-model: stageEnabled plus the member's canUseStage. */
  enabled: boolean;
  roomStageEnabled: boolean;
  globalEnabled: boolean;
  viewer: StageViewerProjection;
  capabilities: StageCapabilitiesProjection;
  channels: StageChannelProjection[];
}

export interface StageAssetRef {
  assetId: string;
  kind: StageAssetKind;
  version: number;
  proxyUrl: string;
  width?: number;
  height?: number;
  durationMs?: number;
  hash?: string;
}

export interface StageActorProjection {
  actorId: string;
  actorKind: StageActorKind;
  ownerUserId?: string;
  characterId?: string;
  name: string;
  zone: StageZone;
  entered: boolean;
  expression?: string;
  action?: string;
  portraitAssetId?: string;
  visibility: StageVisibility;
}

export interface StageSceneProjection {
  title: string;
  description?: string;
  backgroundAssetId?: string;
  bgmAssetId?: string;
  ambienceAssetId?: string;
  themePackId?: string;
}

export interface StageProjection {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  channel: StageChannelRef;
  revision: number;
  serverTime: string;
  viewer: StageViewerProjection;
  capabilities: StageCapabilitiesProjection;
  scene: StageSceneProjection;
  actors: StageActorProjection[];
  assetRefs: StageAssetRef[];
}

export interface StageSnapshot {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  channel: StageChannelRef;
  revision: number;
  projection: StageProjection;
}

export interface StageActorEnterPayload {
  actorId: string;
  zone: StageZone;
  expression?: string;
  action?: string;
}

export interface StageActorExitPayload {
  actorId: string;
}

export interface StageActorPerformPayload {
  actorId: string;
  action: string;
  expression?: string;
}

export interface StageSceneSetPayload {
  title: string;
  description?: string;
  backgroundAssetId?: string;
  bgmAssetId?: string;
  ambienceAssetId?: string;
  themePackId?: string;
}

export interface StageSceneClearPayload {
  clear: 'SCENE';
}

/** Channel transitions are deliberate no-payload commands. */
export type StageChannelEnablePayload = Record<never, never>;
export type StageChannelDisablePayload = Record<never, never>;

export interface StageMessageDraft {
  content: string;
  targetUserId?: string;
  mode: 'PUBLIC' | 'PRIVATE';
}

interface StageCommandBase<TType extends StageCommandType, TPayload> {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  commandId: string;
  channelId: string;
  expectedRevision: number;
  commandType: TType;
  payload: TPayload;
  messageDraft?: StageMessageDraft;
}

export type StageCommandEnvelope =
  | StageCommandBase<'ACTOR_ENTER', StageActorEnterPayload>
  | StageCommandBase<'ACTOR_EXIT', StageActorExitPayload>
  | StageCommandBase<'ACTOR_PERFORM', StageActorPerformPayload>
  | StageCommandBase<'SCENE_SET', StageSceneSetPayload>
  | StageCommandBase<'SCENE_CLEAR', StageSceneClearPayload>
  | StageCommandBase<'CHANNEL_ENABLE', StageChannelEnablePayload>
  | StageCommandBase<'CHANNEL_DISABLE', StageChannelDisablePayload>;

export type StageEvent = {
  eventId: string;
  channelId: string;
  commandId: string;
  beforeRevision: number;
  afterRevision: number;
  operatorUserId?: string;
  roomMessageId?: string;
  visibility: StageVisibility;
  targetUserIds: string[];
  createdAt: string;
} & ({ eventType: 'ACTOR_ENTER'; payload: StageActorEnterPayload }
  | { eventType: 'ACTOR_EXIT'; payload: StageActorExitPayload }
  | { eventType: 'ACTOR_PERFORM'; payload: StageActorPerformPayload }
  | { eventType: 'SCENE_SET'; payload: StageSceneSetPayload }
  | { eventType: 'SCENE_CLEAR'; payload: StageSceneClearPayload }
  | { eventType: 'CHANNEL_ENABLE'; payload: StageChannelEnablePayload }
  | { eventType: 'CHANNEL_DISABLE'; payload: StageChannelDisablePayload });

export type StageEventSource = StageEvent & {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
};

export type StageCommandRecovery = {
  type: 'AUTHORITATIVE_SNAPSHOT';
  snapshot: StageSnapshot;
} | {
  type: 'REFETCH_SNAPSHOT';
  snapshotUrl: string;
};

export type StageCommandAck =
  | {
      contractVersion: typeof STAGE_CONTRACT_VERSION;
      accepted: true;
      outcome: 'APPLIED';
      commandId: string;
      channelId: string;
      revision: number;
    }
  | {
      contractVersion: typeof STAGE_CONTRACT_VERSION;
      accepted: true;
      outcome: 'REPLAYED';
      commandId: string;
      channelId: string;
      revision: number;
    }
  | {
      contractVersion: typeof STAGE_CONTRACT_VERSION;
      accepted: false;
      outcome: 'REJECTED';
      commandId: string;
      channelId: string;
      revision: number;
      error: StageErrorPayload;
    }
  | {
      contractVersion: typeof STAGE_CONTRACT_VERSION;
      accepted: false;
      outcome: 'CONFLICT';
      commandId: string;
      channelId: string;
      revision: number;
      error: StageErrorPayload & { code: 'STAGE_REVISION_CONFLICT'; latestRevision: number };
      recovery: StageCommandRecovery;
    };

export interface StageErrorPayload {
  code: StageErrorCode;
  message: string;
  latestRevision?: number;
}

export type StageRestResponse<TData> = { success: true; data: TData };
export type StageRestErrorResponse = { success: false; error: StageErrorPayload };
export type StageRestPayload<TData> = StageRestResponse<TData> | StageRestErrorResponse;

export type StageStatusResponse = StageRestPayload<StageStatusProjection>;
export type StageSnapshotResponse = StageRestPayload<StageSnapshot>;
export type StageSwitchResponse = StageRestPayload<Pick<StageStatusProjection, 'contractVersion' | 'stageEnabled' | 'roomStageEnabled' | 'globalEnabled' | 'capabilities' | 'channels'>>;
export type StageAssetProxyResponse = StageRestPayload<StageAssetRef>;

export interface StageSocketJoinChannelPayload {
  roomId: string;
  channelId: string;
}

export interface StageSocketLeaveChannelPayload {
  channelId: string;
}

export interface StageSocketCommandPayload {
  roomId: string;
  envelope: StageCommandEnvelope;
}

export type StageSocketSnapshotPayload = StageSnapshot;
export type StageSocketEventPayload = StageEventSource;
export type StageSocketErrorPayload = StageErrorPayload;

export interface StageReplaySource {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  projectVersion: 'stage-replay.d1a.source.v1';
  roomId: string;
  channelIds: string[];
  exportedAt: string;
  sourceEvents: StageEventSource[];
  initialSnapshots: StageSnapshot[];
  assetRefs: StageAssetRef[];
}
