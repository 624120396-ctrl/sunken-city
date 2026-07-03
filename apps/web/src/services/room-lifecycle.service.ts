import { apiFetch, handleApiResponse } from '../lib/api';

export function startRoom(roomId: string) {
  return apiFetch(`/rooms/${roomId}/lifecycle/start`, {
    method: 'POST',
  }).then((res) => handleApiResponse(res));
}

export function pauseRoom(roomId: string) {
  return apiFetch(`/rooms/${roomId}/lifecycle/pause`, {
    method: 'POST',
  }).then((res) => handleApiResponse(res));
}

export function resumeRoom(roomId: string) {
  return apiFetch(`/rooms/${roomId}/lifecycle/resume`, {
    method: 'POST',
  }).then((res) => handleApiResponse(res));
}

export function enterFinishing(roomId: string) {
  return apiFetch(`/rooms/${roomId}/lifecycle/finishing`, {
    method: 'POST',
  }).then((res) => handleApiResponse(res));
}

export function finalizeRoom(roomId: string, payload: unknown) {
  return apiFetch(`/rooms/${roomId}/lifecycle/finalize`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => handleApiResponse(res));
}

export function cancelRoom(roomId: string) {
  return apiFetch(`/rooms/${roomId}/lifecycle/cancel`, {
    method: 'POST',
  }).then((res) => handleApiResponse(res));
}
