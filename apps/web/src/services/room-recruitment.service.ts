import { apiFetch, handleApiResponse } from '@lib/api';
import type {
  RoomJoinApplicationPayload,
  RoomJoinApplicationReviewPayload,
  RoomJoinApplicationView,
  RoomRecruitmentProfilePayload,
  RoomRecruitmentProfileView,
  RoomRecruitmentView,
} from '@/types/room-recruitment-contract';

export async function getRoomRecruitment(roomId: string): Promise<RoomRecruitmentView> {
  return apiFetch(`/rooms/${roomId}/recruitment`).then(
    res => handleApiResponse<RoomRecruitmentView>(res)
  );
}

export async function saveRoomRecruitmentProfile(
  roomId: string,
  payload: RoomRecruitmentProfilePayload
): Promise<RoomRecruitmentProfileView> {
  const data = await apiFetch(`/rooms/${roomId}/recruitment/profile`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ profile: RoomRecruitmentProfileView }>(res));
  return data.profile;
}

export async function submitRoomJoinApplication(
  roomId: string,
  payload: RoomJoinApplicationPayload
): Promise<RoomJoinApplicationView> {
  const data = await apiFetch(`/rooms/${roomId}/recruitment/applications`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ application: RoomJoinApplicationView }>(res));
  return data.application;
}

export async function reviewRoomJoinApplication(
  roomId: string,
  applicationId: string,
  payload: RoomJoinApplicationReviewPayload
): Promise<RoomJoinApplicationView> {
  const data = await apiFetch(`/rooms/${roomId}/recruitment/applications/${applicationId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ application: RoomJoinApplicationView }>(res));
  return data.application;
}

export async function withdrawRoomJoinApplication(
  roomId: string,
  applicationId: string
): Promise<RoomJoinApplicationView> {
  const data = await apiFetch(`/rooms/${roomId}/recruitment/applications/${applicationId}/withdraw`, {
    method: 'POST',
  }).then(res => handleApiResponse<{ application: RoomJoinApplicationView }>(res));
  return data.application;
}
