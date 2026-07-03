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

export interface RoomListItem {
  id: string;
  roomId: string;
  name: string;
  description?: string | null;
  memberCount: number;
  activeMemberCount?: number;
  playerCount?: number;
  observerCount?: number;
  isCreator?: boolean;
  lifecycle: RoomLifecycle;
  myRole: RoomRoleView;
  myCapabilities: RoomCapabilities;
  myBinding: RoomBindingView;
}

export const roomLifecycleLabels: Record<RoomLifecycle, string> = {
  PREPARING: '准备中',
  READY: '待开场',
  IN_PROGRESS: '进行中',
  PAUSED: '暂停中',
  FINISHING: '结算中',
  FINISHED: '已结团',
  CANCELLED: '已取消',
};

export const roomRoleLabels: Record<RoomRoleView, string> = {
  OWNER_KP: 'KP',
  ASSISTANT_KP: '助理 KP',
  PLAYER: 'PL',
  OBSERVER: '观察者',
  NON_MEMBER: '未加入',
};

export function isRoomHost(role: RoomRoleView) {
  return role === 'OWNER_KP' || role === 'ASSISTANT_KP';
}

export function isRoomParticipant(role: RoomRoleView) {
  return role === 'PLAYER';
}

export function isRoomObserver(role: RoomRoleView) {
  return role === 'OBSERVER';
}

export function isPreparingLifecycle(lifecycle: RoomLifecycle) {
  return lifecycle === 'PREPARING' || lifecycle === 'READY';
}

export function isActiveLifecycle(lifecycle: RoomLifecycle) {
  return lifecycle === 'IN_PROGRESS' || lifecycle === 'PAUSED' || lifecycle === 'FINISHING';
}

export function isClosedLifecycle(lifecycle: RoomLifecycle) {
  return lifecycle === 'FINISHED' || lifecycle === 'CANCELLED';
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
