import { apiFetch, handleApiResponse } from '@lib/api';
import type {
  RoomAnnouncementPayload,
  RoomAnnouncementView,
  RoomAttendancePayload,
  RoomAttendanceView,
  RoomCoordinationView,
  RoomNextSessionPayload,
  RoomNextSessionView,
  RoomSchedulePollListView,
  RoomSchedulePollPayload,
  RoomSchedulePollView,
  RoomScheduleVoteStatus,
} from '@/types/room-coordination-contract';

export async function getRoomCoordination(roomId: string): Promise<RoomCoordinationView> {
  return apiFetch(`/rooms/${roomId}/coordination`).then(
    res => handleApiResponse<RoomCoordinationView>(res)
  );
}

export async function getRoomSchedulePolls(roomId: string): Promise<RoomSchedulePollListView> {
  return apiFetch(`/rooms/${roomId}/coordination/schedule-polls`).then(
    res => handleApiResponse<RoomSchedulePollListView>(res)
  );
}

export async function createRoomSchedulePoll(roomId: string, payload: RoomSchedulePollPayload): Promise<RoomSchedulePollView> {
  const data = await apiFetch(`/rooms/${roomId}/coordination/schedule-polls`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ poll: RoomSchedulePollView }>(res));
  return data.poll;
}

export async function updateRoomSchedulePoll(roomId: string, pollId: string, payload: RoomSchedulePollPayload): Promise<RoomSchedulePollView> {
  const data = await apiFetch(`/rooms/${roomId}/coordination/schedule-polls/${pollId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ poll: RoomSchedulePollView }>(res));
  return data.poll;
}

export async function saveRoomScheduleVotes(
  roomId: string,
  pollId: string,
  votes: Array<{ optionId: string; status: RoomScheduleVoteStatus; note?: string }>
): Promise<RoomSchedulePollView> {
  const data = await apiFetch(`/rooms/${roomId}/coordination/schedule-polls/${pollId}/my-votes`, {
    method: 'PUT',
    body: JSON.stringify({ votes }),
  }).then(res => handleApiResponse<{ poll: RoomSchedulePollView }>(res));
  return data.poll;
}

async function postPollAction<T>(roomId: string, pollId: string, action: string, body?: unknown): Promise<T> {
  return apiFetch(`/rooms/${roomId}/coordination/schedule-polls/${pollId}/${action}`, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then(res => handleApiResponse<T>(res));
}

export function closeRoomSchedulePoll(roomId: string, pollId: string) {
  return postPollAction<{ poll: RoomSchedulePollView }>(roomId, pollId, 'close');
}

export function cancelRoomSchedulePoll(roomId: string, pollId: string) {
  return postPollAction<{ poll: RoomSchedulePollView }>(roomId, pollId, 'cancel');
}

export function finalizeRoomSchedulePoll(roomId: string, pollId: string, optionId: string) {
  return postPollAction(roomId, pollId, 'finalize', { optionId });
}

export function remindRoomSchedulePollPending(roomId: string, pollId: string) {
  return postPollAction<{ remindedCount: number }>(roomId, pollId, 'remind-pending');
}

export async function downloadRoomNextSessionCalendar(roomId: string): Promise<Blob> {
  const response = await apiFetch(`/rooms/${roomId}/coordination/next-session.ics`, {
    headers: { Accept: 'text/calendar' },
  });
  if (!response.ok) {
    await handleApiResponse(response);
    throw new Error('日历下载失败');
  }
  return response.blob();
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
