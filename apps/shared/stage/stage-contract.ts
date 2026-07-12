export const STAGE_CONTRACT_VERSION = 'stage.d1a.v1' as const;

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

export type StageChannelKind = 'MAIN_ROOM' | 'SUB_ROOM' | 'PRIVATE_THREAD';
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

export interface StageCommandEnvelope<TPayload = unknown> {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  commandId: string;
  channelId: string;
  expectedRevision: number;
  commandType: StageCommandType;
  payload: TPayload;
  messageDraft?: {
    content: string;
    targetUserId?: string;
    mode: 'PUBLIC' | 'PRIVATE';
  };
}

export interface StageCommandAck {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  commandId: string;
  channelId: string;
  accepted: boolean;
  revision: number;
  error?: {
    code: StageErrorCode;
    message: string;
    latestRevision?: number;
  };
}

export interface StageEventSource {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  eventId: string;
  channelId: string;
  commandId: string;
  eventType: StageCommandType;
  beforeRevision: number;
  afterRevision: number;
  operatorUserId?: string;
  roomMessageId?: string;
  visibility: StageVisibility;
  targetUserIds: string[];
  payload: unknown;
  createdAt: string;
}

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
