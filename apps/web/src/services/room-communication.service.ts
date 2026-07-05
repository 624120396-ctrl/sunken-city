import { apiFetch, handleApiResponse } from '@lib/api';
import type {
  RoomActionQueueCreatePayload,
  RoomActionQueueItemView,
  RoomActionQueueUpdatePayload,
  RoomCommunicationStatePayload,
  RoomCommunicationStateView,
  RoomCommunicationView,
} from '@/types/room-communication-contract';

export async function getRoomCommunication(roomId: string): Promise<RoomCommunicationView> {
  return apiFetch(`/rooms/${roomId}/communication`).then(
    res => handleApiResponse<RoomCommunicationView>(res)
  );
}

export async function saveRoomCommunicationState(
  roomId: string,
  payload: RoomCommunicationStatePayload
): Promise<RoomCommunicationStateView> {
  const data = await apiFetch(`/rooms/${roomId}/communication/state`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ state: RoomCommunicationStateView }>(res));
  return data.state;
}

export async function createRoomActionQueueItem(
  roomId: string,
  payload: RoomActionQueueCreatePayload
): Promise<RoomActionQueueItemView> {
  const data = await apiFetch(`/rooms/${roomId}/communication/queue`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ item: RoomActionQueueItemView }>(res));
  return data.item;
}

export async function updateRoomActionQueueItem(
  roomId: string,
  itemId: string,
  payload: RoomActionQueueUpdatePayload
): Promise<RoomActionQueueItemView> {
  const data = await apiFetch(`/rooms/${roomId}/communication/queue/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ item: RoomActionQueueItemView }>(res));
  return data.item;
}

export async function deleteRoomActionQueueItem(roomId: string, itemId: string): Promise<void> {
  await apiFetch(`/rooms/${roomId}/communication/queue/${itemId}`, {
    method: 'DELETE',
  }).then(res => handleApiResponse(res));
}
