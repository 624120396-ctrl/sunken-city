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
