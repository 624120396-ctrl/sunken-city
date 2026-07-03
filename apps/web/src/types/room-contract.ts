export type RoomRoleView =
  | 'OWNER_KP'
  | 'ASSISTANT_KP'
  | 'PLAYER'
  | 'OBSERVER'
  | 'NON_MEMBER';

export type RoomLifecycle =
  | 'PREPARING'
  | 'READY'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'FINISHING'
  | 'FINISHED'
  | 'CANCELLED';

export interface RoomCapabilities {
  canEnterRoom: boolean;
  canJoinAsPlayer: boolean;
  canJoinAsObserver: boolean;
  canChangeCharacter: boolean;
  canRequestCharacterChange: boolean;
  canStartRoom: boolean;
  canPauseRoom: boolean;
  canResumeRoom: boolean;
  canEnterFinishing: boolean;
  canFinalizeRoom: boolean;
  canCancelRoom: boolean;
  canCloseRoom: boolean;
  canUseKPTools: boolean;
  canManageMembers: boolean;
  canManageScene: boolean;
  canManageClues: boolean;
  canManageNpcs: boolean;
  canManageCombat: boolean;
  canSendPublicMessage: boolean;
  canSendPrivateMessage: boolean;
  canRollPublicDice: boolean;
  canRollSecretDice: boolean;
  canViewSecretEvents: boolean;
  canViewPublicContent: boolean;
}

export interface RoomBindingView {
  roomMemberId: string | null;
  characterId: string | null;
  joinMode: 'KP' | 'PLAYER' | 'OBSERVER' | 'NONE';
}

export interface RoomAuthView {
  role: RoomRoleView;
  capabilities: RoomCapabilities;
  binding: RoomBindingView;
}

export interface RoomLifecycleResponse {
  lifecycle: RoomLifecycle;
  auth?: RoomAuthView;
}

export type RoomJsonValue =
  | string
  | number
  | boolean
  | null
  | RoomJsonValue[]
  | { [key: string]: RoomJsonValue };

export interface RoomRunView {
  id: string;
  roomId: string;
  lifecycle: RoomLifecycle;
  startedAt: string | null;
  pausedAt: string | null;
  finishingAt: string | null;
  finishedAt: string | null;
  cancelledAt: string | null;
  finalizedById: string | null;
  startSnapshot: string;
  finishSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomLifecycleActionResult {
  roomRun: RoomRunView;
  lifecycle?: RoomLifecycle;
  message?: string;
  appliedSettlementCount?: number;
}

export interface RoomMemberView {
  id: string;
  roomId: string;
  userId: string;
  characterId: string | null;
  displayedCharacterId: string | null;
  role: 'OWNER' | 'KP' | 'ASSISTANT_KP' | 'PLAYER' | 'OBSERVER' | string;
  joinedAt: string;
  leftAt: string | null;
  statusTags: string;
  currentRound: number;
}

export interface RoomJoinSnapshot {
  hp?: number | null;
  mp?: number | null;
  san?: number | null;
  statusTags?: RoomJsonValue;
  createdAt?: string;
}

export interface RoomJoinResult {
  member: RoomMemberView;
  snapshot?: RoomJoinSnapshot | null;
  lifecycle?: RoomLifecycle;
  binding?: RoomBindingView;
}
