import { apiFetch, handleApiResponse } from '../lib/api';
import type {
  RoomSettlementListResponse,
  RoomSettlementSavePayload,
  RoomSettlementView,
} from '../types/room-contract';

export function getRoomSettlements(roomId: string): Promise<RoomSettlementListResponse> {
  return apiFetch(`/rooms/${roomId}/settlements`)
    .then((res) => handleApiResponse<RoomSettlementListResponse>(res));
}

export function saveRoomSettlement(
  roomId: string,
  characterId: string,
  payload: RoomSettlementSavePayload
): Promise<{ settlement: RoomSettlementView }> {
  return apiFetch(`/rooms/${roomId}/settlements/${characterId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => handleApiResponse<{ settlement: RoomSettlementView }>(res));
}
