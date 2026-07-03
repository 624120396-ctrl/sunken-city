import { apiFetch, handleApiResponse } from '../lib/api';

export type JoinMode = 'PLAYER' | 'OBSERVER';

export interface JoinRoomPayload {
  joinAs?: JoinMode;
  characterId?: string;
}

export function joinRoom(roomId: string, payload: JoinRoomPayload) {
  return apiFetch(`/rooms/${roomId}/join`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => handleApiResponse(res));
}

export function joinRoomAsObserver(roomId: string) {
  return joinRoom(roomId, { joinAs: 'OBSERVER' });
}

export function joinRoomAsPlayer(roomId: string, characterId: string) {
  return joinRoom(roomId, { joinAs: 'PLAYER', characterId });
}
