import { apiFetch, handleApiResponse } from '@lib/api';
import type { RoomOperationsOverview } from '@/types/room-overview-contract';

export function getRoomOperationsOverview(roomId: string): Promise<RoomOperationsOverview> {
  return apiFetch(`/rooms/${roomId}/overview`)
    .then(res => handleApiResponse<RoomOperationsOverview>(res));
}
