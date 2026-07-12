import { AccessToken, RoomServiceClient, TrackSource, type VideoGrant } from 'livekit-server-sdk';
import type { RoomCapabilities, RoomRoleView } from './room-auth';

const DEFAULT_TOKEN_TTL_SECONDS = 15 * 60;
const DEFAULT_MAX_PARTICIPANTS = 10;
const VOICE_ENABLED_LIFECYCLES = new Set(['PREPARING', 'READY', 'IN_PROGRESS', 'PAUSED']);

export interface RoomVoiceRuntimeConfig {
  enabled: boolean;
  serverUrl: string | null;
  missing: string[];
  tokenTtlSeconds: number;
  maxParticipants: number;
}

export interface RoomVoiceParticipantInput {
  roomId: string;
  userId: string;
  nickname?: string | null;
  role: RoomRoleView;
  roomMemberId?: string | null;
}

export interface RoomVoiceParticipant {
  identity: string;
  name: string;
  metadata: {
    roomId: string;
    role: RoomRoleView;
    roomMemberId: string | null;
    voiceVersion: 'v1';
  };
}

export function buildRoomVoiceRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RoomVoiceRuntimeConfig {
  const serverUrl = env.LIVEKIT_URL?.trim() || null;
  const apiKey = env.LIVEKIT_API_KEY?.trim();
  const apiSecret = env.LIVEKIT_API_SECRET?.trim();
  const missing = [
    !serverUrl ? 'LIVEKIT_URL' : null,
    !apiKey ? 'LIVEKIT_API_KEY' : null,
    !apiSecret ? 'LIVEKIT_API_SECRET' : null,
  ].filter((name): name is string => Boolean(name));

  const tokenTtlSeconds = Number(env.LIVEKIT_TOKEN_TTL_SECONDS || DEFAULT_TOKEN_TTL_SECONDS);
  const maxParticipants = Number(env.ROOM_VOICE_MAX_PARTICIPANTS || DEFAULT_MAX_PARTICIPANTS);

  return {
    enabled: missing.length === 0,
    serverUrl,
    missing,
    tokenTtlSeconds: Number.isFinite(tokenTtlSeconds) && tokenTtlSeconds > 0
      ? Math.min(tokenTtlSeconds, 60 * 60)
      : DEFAULT_TOKEN_TTL_SECONDS,
    maxParticipants: Number.isFinite(maxParticipants) && maxParticipants > 0
      ? Math.min(maxParticipants, DEFAULT_MAX_PARTICIPANTS)
      : DEFAULT_MAX_PARTICIPANTS,
  };
}

export function roomVoiceConfigStatus(config = buildRoomVoiceRuntimeConfig()) {
  return config.enabled ? 'READY' : 'MISSING_CONFIG';
}

export interface RoomVoiceParticipantClient {
  listParticipants(room: string): Promise<unknown[]>;
}

export class RoomVoiceCapacityError extends Error {
  constructor(
    readonly code: 'VOICE_ROOM_FULL' | 'VOICE_CAPACITY_CHECK_FAILED',
    readonly statusCode: 409 | 503,
    message: string,
  ) {
    super(message);
    this.name = 'RoomVoiceCapacityError';
  }
}

export function isRoomVoiceLifecycleAllowed(lifecycle: string) {
  return VOICE_ENABLED_LIFECYCLES.has(lifecycle);
}

export function buildLiveKitRoomName(roomId: string) {
  return `sunken-room-${roomId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)}`;
}

export function buildLiveKitServiceUrl(serverUrl: string) {
  const endpoint = new URL(serverUrl);
  if (endpoint.protocol === 'wss:') endpoint.protocol = 'https:';
  if (endpoint.protocol === 'ws:') endpoint.protocol = 'http:';
  endpoint.pathname = '';
  endpoint.search = '';
  endpoint.hash = '';
  return endpoint.toString();
}

export async function assertRoomVoiceCapacity(input: {
  config?: RoomVoiceRuntimeConfig;
  env?: NodeJS.ProcessEnv;
  roomName: string;
  client?: RoomVoiceParticipantClient;
}) {
  const env = input.env ?? process.env;
  const config = input.config ?? buildRoomVoiceRuntimeConfig(env);
  if (!config.enabled || !config.serverUrl) {
    throw new RoomVoiceCapacityError('VOICE_CAPACITY_CHECK_FAILED', 503, '无法确认房间语音容量，请稍后重试');
  }

  let participants: unknown[];
  try {
    const client = input.client ?? new RoomServiceClient(
      buildLiveKitServiceUrl(config.serverUrl),
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET,
    );
    participants = await client.listParticipants(input.roomName);
  } catch {
    throw new RoomVoiceCapacityError('VOICE_CAPACITY_CHECK_FAILED', 503, '无法确认房间语音容量，请稍后重试');
  }

  if (participants.length >= config.maxParticipants) {
    throw new RoomVoiceCapacityError('VOICE_ROOM_FULL', 409, `房间语音已达到 ${config.maxParticipants} 人上限`);
  }

  return {
    participantCount: participants.length,
    maxParticipants: config.maxParticipants,
  };
}

export function canPublishRoomVoice(
  role: RoomRoleView,
  capabilities: RoomCapabilities,
  observerCanSpeak: boolean
) {
  if (!capabilities.canViewPublicContent) return false;
  if (role === 'OWNER_KP' || role === 'ASSISTANT_KP' || role === 'PLAYER') {
    return capabilities.canSendPublicMessage;
  }
  if (role === 'OBSERVER') return observerCanSpeak;
  return false;
}

export function buildRoomVoiceGrant(input: {
  roomName: string;
  role: RoomRoleView;
  capabilities: RoomCapabilities;
  observerCanSpeak: boolean;
}): VideoGrant {
  const canPublish = canPublishRoomVoice(input.role, input.capabilities, input.observerCanSpeak);

  return {
    room: input.roomName,
    roomJoin: true,
    roomAdmin: input.capabilities.canUseKPTools,
    canSubscribe: true,
    canPublish,
    canPublishData: false,
    canUpdateOwnMetadata: true,
    ...(canPublish ? { canPublishSources: [TrackSource.MICROPHONE] } : {}),
  };
}

export function buildRoomVoiceParticipant(input: RoomVoiceParticipantInput): RoomVoiceParticipant {
  return {
    identity: `room:${input.roomId}:user:${input.userId}`,
    name: input.nickname?.trim() || input.role,
    metadata: {
      roomId: input.roomId,
      role: input.role,
      roomMemberId: input.roomMemberId ?? null,
      voiceVersion: 'v1',
    },
  };
}

export async function createRoomVoiceToken(input: {
  env?: NodeJS.ProcessEnv;
  roomId: string;
  userId: string;
  nickname?: string | null;
  role: RoomRoleView;
  roomMemberId?: string | null;
  capabilities: RoomCapabilities;
  observerCanSpeak: boolean;
}) {
  const env = input.env ?? process.env;
  const config = buildRoomVoiceRuntimeConfig(env);
  if (!config.enabled) {
    throw new Error(`LiveKit config missing: ${config.missing.join(', ')}`);
  }

  const roomName = buildLiveKitRoomName(input.roomId);
  const participant = buildRoomVoiceParticipant(input);
  const grant = buildRoomVoiceGrant({
    roomName,
    role: input.role,
    capabilities: input.capabilities,
    observerCanSpeak: input.observerCanSpeak,
  });
  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: participant.identity,
    name: participant.name,
    metadata: JSON.stringify(participant.metadata),
    ttl: config.tokenTtlSeconds,
  });
  token.addGrant(grant);

  return {
    token: await token.toJwt(),
    serverUrl: config.serverUrl!,
    roomName,
    identity: participant.identity,
    participant,
    grant,
    expiresInSeconds: config.tokenTtlSeconds,
  };
}
