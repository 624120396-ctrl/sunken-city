export type RoomQueueKind = 'SPEAK' | 'ACTION' | 'CHECK_IN';
export type RoomQueueStatus = 'WAITING' | 'ACTIVE' | 'DONE' | 'CANCELLED';

export interface RoomCommunicationStateView {
  id: string;
  currentTopic: string;
  spotlightUserId: string | null;
  keeperPrompt: string;
  environmentChecklist: string[];
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomCommunicationStatePayload {
  currentTopic?: string;
  spotlightUserId?: string | null;
  keeperPrompt?: string;
  environmentChecklist?: string[];
}

export interface RoomActionQueueItemView {
  id: string;
  kind: RoomQueueKind;
  status: RoomQueueStatus;
  label: string;
  note: string;
  requesterUserId: string | null;
  requesterName: string | null;
  targetUserId: string | null;
  targetName: string | null;
  createdById: string;
  resolvedById: string | null;
  sortOrder: number;
  canCancel: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomActionQueueCreatePayload {
  kind?: RoomQueueKind;
  label: string;
  note?: string;
  targetUserId?: string | null;
}

export interface RoomActionQueueUpdatePayload {
  status?: RoomQueueStatus;
  label?: string;
  note?: string;
  sortOrder?: number;
}

export interface RoomCommunicationMemberView {
  userId: string;
  name: string;
  role: string;
}

export interface RoomCommunicationView {
  state: RoomCommunicationStateView | null;
  queue: RoomActionQueueItemView[];
  members: RoomCommunicationMemberView[];
  canManageCommunication: boolean;
}
