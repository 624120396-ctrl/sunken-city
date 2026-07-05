import { apiFetch, handleApiResponse } from '@lib/api';
import type {
  RoomJoinApplicationPayload,
  RoomJoinApplicationReviewPayload,
  RoomJoinApplicationView,
  RoomInvitationPayload,
  RoomInvitationView,
  RoomRecruitmentProfilePayload,
  RoomRecruitmentProfileView,
  RoomRecruitmentView,
} from '@/types/room-recruitment-contract';
import type { RoomJoinResult } from '@/types/room-contract';

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

export async function joinApprovedRoomApplication(
  roomId: string,
  applicationId: string,
  characterId: string
): Promise<{ application: RoomJoinApplicationView; member: RoomJoinResult['member'] }> {
  return apiFetch(`/rooms/${roomId}/recruitment/applications/${applicationId}/join`, {
    method: 'POST',
    body: JSON.stringify({ characterId }),
  }).then(res => handleApiResponse<{ application: RoomJoinApplicationView; member: RoomJoinResult['member'] }>(res));
}

export async function inviteRoomUser(
  roomId: string,
  payload: RoomInvitationPayload
): Promise<RoomInvitationView> {
  const data = await apiFetch(`/rooms/${roomId}/recruitment/invitations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ invitation: RoomInvitationView }>(res));
  return data.invitation;
}

export async function cancelRoomInvitation(
  roomId: string,
  invitationId: string
): Promise<RoomInvitationView> {
  const data = await apiFetch(`/rooms/${roomId}/recruitment/invitations/${invitationId}/cancel`, {
    method: 'POST',
  }).then(res => handleApiResponse<{ invitation: RoomInvitationView }>(res));
  return data.invitation;
}

export async function respondRoomInvitation(
  roomId: string,
  invitationId: string,
  payload: { status: 'ACCEPTED' | 'DECLINED'; characterId?: string }
): Promise<{ invitation: RoomInvitationView; member: RoomJoinResult['member'] | null }> {
  return apiFetch(`/rooms/${roomId}/recruitment/invitations/${invitationId}/respond`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ invitation: RoomInvitationView; member: RoomJoinResult['member'] | null }>(res));
}
