import { apiFetch, handleApiResponse } from '../lib/api';

export interface RoomVoiceStatus {
  status: 'READY' | 'MISSING_CONFIG';
  serverUrl: string | null;
  missing: string[];
  observerCanSpeak: boolean;
  maxParticipants: number;
  permissions: {
    canJoinVoice: boolean;
    canManageVoice: boolean;
  };
}

export interface RoomVoiceToken {
  serverUrl: string;
  token: string;
  roomName: string;
  identity: string;
  expiresInSeconds: number;
  permissions: {
    canPublishAudio: boolean;
    canSubscribeAudio: boolean;
    canManageVoice: boolean;
  };
}

export function getRoomVoiceStatus(roomId: string): Promise<RoomVoiceStatus> {
  return apiFetch(`/rooms/${roomId}/voice/status`).then((res) => handleApiResponse(res));
}

export function getRoomVoiceToken(roomId: string): Promise<RoomVoiceToken> {
  return apiFetch(`/rooms/${roomId}/voice/token`).then((res) => handleApiResponse(res));
}
