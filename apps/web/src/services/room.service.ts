import { apiFetch, handleApiResponse } from '../lib/api';

export interface RoomScenePayload {
  atmosphere?: string;
  sceneDesc?: string;
  sceneImageUrl?: string;
  sceneMusicUrl?: string;
}

export function updateRoomScene(roomId: string, payload: RoomScenePayload) {
  return apiFetch(`/rooms/${roomId}/atmosphere`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => handleApiResponse(res));
}

export interface RoomClue {
  id: string;
  roomId: string;
  title: string;
  content: string;
  imageUrl?: string;
  discoveredBy: string;
  isHidden: boolean;
  requiresSkill?: string | null;
  requiresValue?: number | null;
  createdAt: string;
}

export function getRoomClues(roomId: string): Promise<RoomClue[]> {
  return apiFetch(`/rooms/${roomId}/clues`)
    .then((res) => handleApiResponse(res));
}

export function createRoomClue(roomId: string, payload: Omit<RoomClue, 'id' | 'roomId' | 'createdAt'>) {
  return apiFetch(`/rooms/${roomId}/clues`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => handleApiResponse(res));
}

export function updateRoomClue(roomId: string, clueId: string, payload: Partial<Omit<RoomClue, 'id' | 'roomId' | 'createdAt'>>) {
  return apiFetch(`/rooms/${roomId}/clues/${clueId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => handleApiResponse(res));
}

export function deleteRoomClue(roomId: string, clueId: string) {
  return apiFetch(`/rooms/${roomId}/clues/${clueId}`, {
    method: 'DELETE',
  }).then((res) => handleApiResponse(res));
}

export interface RoomNpc {
  id: string;
  roomId: string;
  name: string;
  avatarUrl?: string;
  description?: string;
  statsJson: string;
  isActive: boolean;
  createdAt: string;
}

export function getRoomNpcs(roomId: string): Promise<RoomNpc[]> {
  return apiFetch(`/rooms/${roomId}/npcs`)
    .then((res) => handleApiResponse(res));
}

export function createRoomNpc(roomId: string, payload: { name: string; avatarUrl?: string; description?: string; statsJson?: any }) {
  return apiFetch(`/rooms/${roomId}/npcs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => handleApiResponse(res));
}

export function updateRoomNpc(roomId: string, npcId: string, payload: Partial<{ name: string; avatarUrl?: string; description?: string; statsJson?: any; isActive?: boolean }>) {
  return apiFetch(`/rooms/${roomId}/npcs/${npcId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => handleApiResponse(res));
}

export function deleteRoomNpc(roomId: string, npcId: string) {
  return apiFetch(`/rooms/${roomId}/npcs/${npcId}`, {
    method: 'DELETE',
  }).then((res) => handleApiResponse(res));
}
