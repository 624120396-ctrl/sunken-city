import { apiFetch, handleApiResponse } from '@lib/api';
import type {
  InvestigationCluePayload,
  InvestigationClueView,
  ImportantMessageArchivePayload,
  InvestigationLogEntryView,
  InvestigationLogPayload,
  InvestigationNpcPayload,
  InvestigationNpcView,
  InvestigationScenePayload,
  InvestigationSceneView,
  KeyDiceArchivePayload,
  KpPrivateNotePayload,
  KpPrivateNoteView,
  RoomCharacterSyncStatus,
  RoomCurrentFocusPayload,
  RoomCurrentFocusView,
  RoomSessionPrepPayload,
  RoomSessionPrepView,
} from '@/types/investigation-contract';

export async function getInvestigationClues(roomId: string): Promise<InvestigationClueView[]> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/clues`).then(
    res => handleApiResponse<{ clues: InvestigationClueView[] }>(res)
  );
  return data.clues;
}

export async function saveInvestigationClue(
  roomId: string,
  payload: InvestigationCluePayload,
  clueId?: string
): Promise<InvestigationClueView> {
  const data = await apiFetch(
    clueId ? `/rooms/${roomId}/investigation/clues/${clueId}` : `/rooms/${roomId}/investigation/clues`,
    {
      method: clueId ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    }
  ).then(res => handleApiResponse<{ clue: InvestigationClueView }>(res));
  return data.clue;
}

export async function revealInvestigationClue(roomId: string, clueId: string): Promise<InvestigationClueView> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/clues/${clueId}/reveal`, {
    method: 'POST',
  }).then(res => handleApiResponse<{ clue: InvestigationClueView }>(res));
  return data.clue;
}

export async function deleteInvestigationClue(roomId: string, clueId: string): Promise<void> {
  await apiFetch(`/rooms/${roomId}/investigation/clues/${clueId}`, {
    method: 'DELETE',
  }).then(res => handleApiResponse(res));
}

export async function getInvestigationNpcs(roomId: string): Promise<InvestigationNpcView[]> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/npcs`).then(
    res => handleApiResponse<{ npcs: InvestigationNpcView[] }>(res)
  );
  return data.npcs;
}

export async function saveInvestigationNpc(
  roomId: string,
  payload: InvestigationNpcPayload,
  npcId?: string
): Promise<InvestigationNpcView> {
  const data = await apiFetch(
    npcId ? `/rooms/${roomId}/investigation/npcs/${npcId}` : `/rooms/${roomId}/investigation/npcs`,
    {
      method: npcId ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    }
  ).then(res => handleApiResponse<{ npc: InvestigationNpcView }>(res));
  return data.npc;
}

export async function revealInvestigationNpc(roomId: string, npcId: string): Promise<InvestigationNpcView> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/npcs/${npcId}/reveal`, {
    method: 'POST',
  }).then(res => handleApiResponse<{ npc: InvestigationNpcView }>(res));
  return data.npc;
}

export async function deleteInvestigationNpc(roomId: string, npcId: string): Promise<void> {
  await apiFetch(`/rooms/${roomId}/investigation/npcs/${npcId}`, {
    method: 'DELETE',
  }).then(res => handleApiResponse(res));
}

export async function getInvestigationScenes(roomId: string): Promise<InvestigationSceneView[]> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/scenes`).then(
    res => handleApiResponse<{ scenes: InvestigationSceneView[] }>(res)
  );
  return data.scenes;
}

export async function saveInvestigationScene(
  roomId: string,
  payload: InvestigationScenePayload,
  sceneId?: string
): Promise<InvestigationSceneView> {
  const data = await apiFetch(
    sceneId ? `/rooms/${roomId}/investigation/scenes/${sceneId}` : `/rooms/${roomId}/investigation/scenes`,
    {
      method: sceneId ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    }
  ).then(res => handleApiResponse<{ scene: InvestigationSceneView }>(res));
  return data.scene;
}

export async function setCurrentInvestigationScene(roomId: string, sceneId: string): Promise<InvestigationSceneView> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/scenes/${sceneId}/current`, {
    method: 'POST',
  }).then(res => handleApiResponse<{ scene: InvestigationSceneView }>(res));
  return data.scene;
}

export async function deleteInvestigationScene(roomId: string, sceneId: string): Promise<void> {
  await apiFetch(`/rooms/${roomId}/investigation/scenes/${sceneId}`, {
    method: 'DELETE',
  }).then(res => handleApiResponse(res));
}

export async function getInvestigationTimeline(roomId: string): Promise<InvestigationLogEntryView[]> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/timeline`).then(
    res => handleApiResponse<{ entries: InvestigationLogEntryView[] }>(res)
  );
  return data.entries;
}

export async function createInvestigationLogEntry(
  roomId: string,
  payload: InvestigationLogPayload
): Promise<InvestigationLogEntryView> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/timeline`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ entry: InvestigationLogEntryView }>(res));
  return data.entry;
}

export async function setInvestigationLogPinned(
  roomId: string,
  entryId: string,
  isPinned: boolean
): Promise<InvestigationLogEntryView> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/timeline/${entryId}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ isPinned }),
  }).then(res => handleApiResponse<{ entry: InvestigationLogEntryView }>(res));
  return data.entry;
}

export async function archiveImportantMessage(
  roomId: string,
  payload: ImportantMessageArchivePayload
): Promise<InvestigationLogEntryView> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/timeline/important-message`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ entry: InvestigationLogEntryView }>(res));
  return data.entry;
}

export async function archiveKeyDice(
  roomId: string,
  payload: KeyDiceArchivePayload
): Promise<InvestigationLogEntryView> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/timeline/key-dice`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ entry: InvestigationLogEntryView }>(res));
  return data.entry;
}

export async function getKpPrivateNotes(roomId: string): Promise<KpPrivateNoteView[]> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/kp-notes`).then(
    res => handleApiResponse<{ notes: KpPrivateNoteView[] }>(res)
  );
  return data.notes;
}

export async function saveKpPrivateNote(
  roomId: string,
  payload: KpPrivateNotePayload,
  noteId?: string
): Promise<KpPrivateNoteView> {
  const data = await apiFetch(
    noteId ? `/rooms/${roomId}/investigation/kp-notes/${noteId}` : `/rooms/${roomId}/investigation/kp-notes`,
    {
      method: noteId ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    }
  ).then(res => handleApiResponse<{ note: KpPrivateNoteView }>(res));
  return data.note;
}

export async function deleteKpPrivateNote(roomId: string, noteId: string): Promise<void> {
  await apiFetch(`/rooms/${roomId}/investigation/kp-notes/${noteId}`, {
    method: 'DELETE',
  }).then(res => handleApiResponse(res));
}

export async function getSessionPrep(roomId: string): Promise<RoomSessionPrepView | null> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/session-prep`).then(
    res => handleApiResponse<{ prep: RoomSessionPrepView | null }>(res)
  );
  return data.prep;
}

export async function saveSessionPrep(
  roomId: string,
  payload: RoomSessionPrepPayload
): Promise<RoomSessionPrepView> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/session-prep`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ prep: RoomSessionPrepView }>(res));
  return data.prep;
}

export async function getCharacterSyncStatus(roomId: string): Promise<RoomCharacterSyncStatus> {
  return apiFetch(`/rooms/${roomId}/investigation/character-sync`).then(
    res => handleApiResponse<RoomCharacterSyncStatus>(res)
  );
}

export async function getCurrentFocus(roomId: string): Promise<RoomCurrentFocusView | null> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/current-focus`).then(
    res => handleApiResponse<{ focus: RoomCurrentFocusView | null }>(res)
  );
  return data.focus;
}

export async function saveCurrentFocus(
  roomId: string,
  payload: RoomCurrentFocusPayload
): Promise<RoomCurrentFocusView> {
  const data = await apiFetch(`/rooms/${roomId}/investigation/current-focus`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ focus: RoomCurrentFocusView }>(res));
  return data.focus;
}
