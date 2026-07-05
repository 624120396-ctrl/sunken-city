import { apiFetch, handleApiResponse } from '@lib/api';
import type {
  RoomAiContextPreview,
  RoomAiJobView,
  RoomAiSettingsPayload,
  RoomAiSettingsView,
  RoomAiTaskType,
  RoomAiUsageLedgerView,
} from '@/types/room-ai-contract';

export function getRoomAiSettings(roomId: string): Promise<RoomAiSettingsView> {
  return apiFetch(`/rooms/${roomId}/ai-foundation/settings`)
    .then(res => handleApiResponse<{ settings: RoomAiSettingsView }>(res))
    .then(data => data.settings);
}

export function saveRoomAiSettings(
  roomId: string,
  payload: RoomAiSettingsPayload
): Promise<RoomAiSettingsView> {
  return apiFetch(`/rooms/${roomId}/ai-foundation/settings`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
    .then(res => handleApiResponse<{ settings: RoomAiSettingsView }>(res))
    .then(data => data.settings);
}

export function getRoomAiContextPreview(roomId: string): Promise<RoomAiContextPreview> {
  return apiFetch(`/rooms/${roomId}/ai-foundation/context-preview`)
    .then(res => handleApiResponse<{ context: RoomAiContextPreview }>(res))
    .then(data => data.context);
}

export function getRoomAiJobs(roomId: string): Promise<RoomAiJobView[]> {
  return apiFetch(`/rooms/${roomId}/ai-foundation/jobs`)
    .then(res => handleApiResponse<{ jobs: RoomAiJobView[] }>(res))
    .then(data => data.jobs);
}

export function createRoomAiJob(
  roomId: string,
  payload: {
    taskType: RoomAiTaskType;
    prompt?: string;
    visibility?: 'KP_ONLY' | 'PLAYER_VISIBLE';
    includeContextSnapshot?: boolean;
  }
): Promise<RoomAiJobView> {
  return apiFetch(`/rooms/${roomId}/ai-foundation/jobs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
    .then(res => handleApiResponse<{ job: RoomAiJobView }>(res))
    .then(data => data.job);
}

export function getRoomAiUsageLedger(roomId: string): Promise<RoomAiUsageLedgerView[]> {
  return apiFetch(`/rooms/${roomId}/ai-foundation/usage-ledger`)
    .then(res => handleApiResponse<{ ledger: RoomAiUsageLedgerView[] }>(res))
    .then(data => data.ledger);
}
