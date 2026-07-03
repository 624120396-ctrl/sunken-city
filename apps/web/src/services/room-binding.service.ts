import { apiFetch, handleApiResponse } from '../lib/api';
import type { RoomJoinResult } from '../types/room-contract';

export type JoinMode = 'PLAYER' | 'OBSERVER';

export interface JoinRoomPayload {
  joinAs?: JoinMode;
  characterId?: string;
}

export function joinRoom(roomId: string, payload: JoinRoomPayload): Promise<RoomJoinResult> {
  return apiFetch(`/rooms/${roomId}/join`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => handleApiResponse<RoomJoinResult>(res));
}

export function joinRoomAsObserver(roomId: string): Promise<RoomJoinResult> {
  return joinRoom(roomId, { joinAs: 'OBSERVER' });
}

export function joinRoomAsPlayer(roomId: string, characterId: string): Promise<RoomJoinResult> {
  return joinRoom(roomId, { joinAs: 'PLAYER', characterId });
}
