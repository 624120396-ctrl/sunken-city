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

export type RoomListItemResponse = Omit<RoomListItem, 'lifecycle' | 'myRole' | 'myCapabilities' | 'myBinding'> &
  Partial<Pick<RoomListItem, 'lifecycle' | 'myRole' | 'myCapabilities' | 'myBinding'>>;

export const roomLifecycleLabels: Record<RoomLifecycle, string> = {
  PREPARING: '准备中',
  READY: '待开场',
  IN_PROGRESS: '进行中',
  PAUSED: '暂停中',
  FINISHING: '结算中',
  FINISHED: '已结团',
  CANCELLED: '已取消',
};

export const roomRoleCompactLabels: Record<RoomRoleView, string> = {
  OWNER_KP: 'KP',
  ASSISTANT_KP: '助理 KP',
  PLAYER: 'PL',
  OBSERVER: '观察者',
  NON_MEMBER: '未加入',
};

export const roomRoleFullLabels: Record<RoomRoleView, string> = {
  OWNER_KP: '主持人',
  ASSISTANT_KP: '助理 KP',
  PLAYER: '调查员',
  OBSERVER: '观察者',
  NON_MEMBER: '未加入',
};

export const roomRoleLabels = roomRoleFullLabels;

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

function fallbackRoomCapabilities(role: RoomRoleView, lifecycle: RoomLifecycle): RoomCapabilities {
  const isKp = isRoomHost(role);
  const isPlayer = isRoomParticipant(role);
  const isObserver = isRoomObserver(role);
  const isMember = isKp || isPlayer || isObserver;
  const beforeStart = isPreparingLifecycle(lifecycle);
  const active = lifecycle === 'IN_PROGRESS' || lifecycle === 'PAUSED';
  const finishing = lifecycle === 'FINISHING';
  const closed = isClosedLifecycle(lifecycle);
  const canMutate = !closed;

  return {
    canEnterRoom: isMember,
    canJoinAsPlayer: role === 'NON_MEMBER' && beforeStart,
    canJoinAsObserver: role === 'NON_MEMBER' && !closed,
    canChangeCharacter: isPlayer && beforeStart,
    canRequestCharacterChange: isPlayer && active,
    canStartRoom: isKp && beforeStart,
    canPauseRoom: isKp && lifecycle === 'IN_PROGRESS',
    canResumeRoom: isKp && lifecycle === 'PAUSED',
    canEnterFinishing: isKp && active,
    canFinalizeRoom: isKp && finishing,
    canCancelRoom: isKp && beforeStart,
    canCloseRoom: role === 'OWNER_KP' && canMutate,
    canUseKPTools: isKp && canMutate,
    canManageMembers: isKp && canMutate,
    canManageScene: isKp && canMutate,
    canManageClues: isKp && canMutate,
    canManageNpcs: isKp && canMutate,
    canManageCombat: isKp && canMutate,
    canSendPublicMessage: isMember && !closed,
    canSendPrivateMessage: isPlayer && !closed,
    canRollPublicDice: (isKp || isPlayer) && !closed,
    canRollSecretDice: isKp && canMutate,
    canViewSecretEvents: isKp,
    canViewPublicContent: isMember,
  };
}

function fallbackRoomBinding(role: RoomRoleView): RoomBindingView {
  return {
    roomMemberId: null,
    characterId: null,
    joinMode: isRoomHost(role)
      ? 'KP'
      : isRoomParticipant(role)
        ? 'PLAYER'
        : isRoomObserver(role)
          ? 'OBSERVER'
          : 'NONE',
  };
}

export function normalizeRoomListItem(room: RoomListItemResponse): RoomListItem {
  const lifecycle = room.lifecycle ?? 'PREPARING';
  const myRole = room.myRole ?? (room.isCreator ? 'OWNER_KP' : 'NON_MEMBER');

  return {
    ...room,
    lifecycle,
    myRole,
    myCapabilities: room.myCapabilities ?? fallbackRoomCapabilities(myRole, lifecycle),
    myBinding: room.myBinding ?? fallbackRoomBinding(myRole),
  };
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

export type RoomSettlementOutcome = 'SURVIVED' | 'DEAD' | 'MISSING' | 'INSANE' | 'WITHDREW';
export type RoomSettlementStatus = 'DRAFT' | 'CONFIRMED' | 'APPROVED';

export interface RoomSettlementParticipantView {
  id: string;
  userId: string;
  userNickname: string;
  characterId: string;
  characterName: string;
  currentHp: number;
  currentMp: number;
  currentSan: number;
  maxHp: number;
  maxMp: number;
  maxSan: number;
}

export interface RoomSettlementView {
  id: string;
  roomRunId: string;
  characterId: string;
  userId: string;
  status: RoomSettlementStatus;
  outcome: RoomSettlementOutcome;
  hpFinal: number | null;
  mpFinal: number | null;
  sanFinal: number | null;
  expAward: number;
  skillGrowth: RoomJsonValue[];
  itemChanges: RoomJsonValue[];
  kpNote: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSettlementEntryView {
  participant: RoomSettlementParticipantView;
  settlement: RoomSettlementView | null;
}

export interface RoomSettlementListResponse {
  roomRunId: string;
  lifecycle: RoomLifecycle;
  settlements: RoomSettlementEntryView[];
}

export interface RoomSettlementSavePayload {
  outcome?: RoomSettlementOutcome;
  hpFinal?: number | null;
  mpFinal?: number | null;
  sanFinal?: number | null;
  expAward?: number;
  skillGrowth?: RoomJsonValue[];
  itemChanges?: RoomJsonValue[];
  kpNote?: string | null;
  status?: RoomSettlementStatus;
}

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
