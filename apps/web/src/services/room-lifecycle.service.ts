import { apiFetch, handleApiResponse } from '../lib/api';
import type { RoomLifecycleActionResult } from '../types/room-contract';

export function startRoom(roomId: string): Promise<RoomLifecycleActionResult> {
  return apiFetch(`/rooms/${roomId}/lifecycle/start`, {
    method: 'POST',
  }).then((res) => handleApiResponse<RoomLifecycleActionResult>(res));
}

export function pauseRoom(roomId: string): Promise<RoomLifecycleActionResult> {
  return apiFetch(`/rooms/${roomId}/lifecycle/pause`, {
    method: 'POST',
  }).then((res) => handleApiResponse<RoomLifecycleActionResult>(res));
}

export function resumeRoom(roomId: string): Promise<RoomLifecycleActionResult> {
  return apiFetch(`/rooms/${roomId}/lifecycle/resume`, {
    method: 'POST',
  }).then((res) => handleApiResponse<RoomLifecycleActionResult>(res));
}

export function enterFinishing(roomId: string): Promise<RoomLifecycleActionResult> {
  return apiFetch(`/rooms/${roomId}/lifecycle/finishing`, {
    method: 'POST',
  }).then((res) => handleApiResponse<RoomLifecycleActionResult>(res));
}

export function finalizeRoom(roomId: string, payload: unknown): Promise<RoomLifecycleActionResult> {
  return apiFetch(`/rooms/${roomId}/lifecycle/finalize`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => handleApiResponse<RoomLifecycleActionResult>(res));
}

export function cancelRoom(roomId: string): Promise<RoomLifecycleActionResult> {
  return apiFetch(`/rooms/${roomId}/lifecycle/cancel`, {
    method: 'POST',
  }).then((res) => handleApiResponse<RoomLifecycleActionResult>(res));
}
