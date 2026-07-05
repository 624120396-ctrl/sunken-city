import { apiFetch, handleApiResponse } from '@lib/api';
import type {
  RoomAnnouncementPayload,
  RoomAnnouncementView,
  RoomAttendancePayload,
  RoomAttendanceView,
  RoomCoordinationView,
  RoomNextSessionPayload,
  RoomNextSessionView,
} from '@/types/room-coordination-contract';

export async function getRoomCoordination(roomId: string): Promise<RoomCoordinationView> {
  return apiFetch(`/rooms/${roomId}/coordination`).then(
    res => handleApiResponse<RoomCoordinationView>(res)
  );
}

export async function saveRoomNextSession(
  roomId: string,
  payload: RoomNextSessionPayload
): Promise<RoomNextSessionView> {
  const data = await apiFetch(`/rooms/${roomId}/coordination/next-session`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ nextSession: RoomNextSessionView }>(res));
  return data.nextSession;
}

export async function saveMyRoomAttendance(
  roomId: string,
  payload: RoomAttendancePayload
): Promise<RoomAttendanceView> {
  const data = await apiFetch(`/rooms/${roomId}/coordination/my-attendance`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ attendance: RoomAttendanceView }>(res));
  return data.attendance;
}

export async function createRoomAnnouncement(
  roomId: string,
  payload: RoomAnnouncementPayload
): Promise<RoomAnnouncementView> {
  const data = await apiFetch(`/rooms/${roomId}/coordination/announcements`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ announcement: RoomAnnouncementView }>(res));
  return data.announcement;
}

export async function deleteRoomAnnouncement(roomId: string, announcementId: string): Promise<void> {
  await apiFetch(`/rooms/${roomId}/coordination/announcements/${announcementId}`, {
    method: 'DELETE',
  }).then(res => handleApiResponse(res));
}
