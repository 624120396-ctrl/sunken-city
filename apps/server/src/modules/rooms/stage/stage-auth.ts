import type { RoomRoleView } from '../room-auth';

export type StageChannelInput =
  | { kind: 'MAIN_ROOM'; roomId: string }
  | { kind: 'SUB_ROOM'; roomId: string; subRoomId: string }
  | { kind: 'PRIVATE_THREAD'; roomId: string; privateThreadId: string; participantUserIds: string[] };

export interface StageChannelAccessResult {
  allowed: boolean;
  viewerKind: 'KP' | 'PLAYER' | 'OBSERVER';
  reason?: 'NO_ROOM_ACCESS' | 'NOT_SUB_ROOM_MEMBER' | 'NOT_PRIVATE_PARTICIPANT';
  canManageStage: boolean;
}

export function authorizeStageChannelAccess(input: {
  channel: StageChannelInput;
  userId: string;
  role: RoomRoleView;
  capabilities: {
    canUseStage: boolean;
    canManageStage: boolean;
  };
  subRoomMemberUserIds?: string[];
}): StageChannelAccessResult {
  const viewerKind = input.role === 'OWNER_KP' || input.role === 'ASSISTANT_KP'
    ? 'KP'
    : input.role === 'PLAYER'
      ? 'PLAYER'
      : 'OBSERVER';

  if (!input.capabilities.canUseStage) {
    return { allowed: false, viewerKind, reason: 'NO_ROOM_ACCESS', canManageStage: false };
  }

  if (input.channel.kind === 'SUB_ROOM' && !input.capabilities.canManageStage) {
    const members = input.subRoomMemberUserIds ?? [];
    if (!members.includes(input.userId)) {
      return { allowed: false, viewerKind, reason: 'NOT_SUB_ROOM_MEMBER', canManageStage: false };
    }
  }

  if (input.channel.kind === 'PRIVATE_THREAD' && !input.capabilities.canManageStage) {
    if (!input.channel.participantUserIds.includes(input.userId)) {
      return { allowed: false, viewerKind, reason: 'NOT_PRIVATE_PARTICIPANT', canManageStage: false };
    }
  }

  return { allowed: true, viewerKind, canManageStage: input.capabilities.canManageStage };
}

export function authorizeStageActorCommand(input: {
  actorKind: 'PLAYER_CHARACTER' | 'NPC' | 'TEMPORARY';
  ownerUserId?: string | null;
  userId: string;
  capabilities: {
    canControlOwnStageActor: boolean;
    canManageStage: boolean;
  };
}) {
  if (input.capabilities.canManageStage) return { allowed: true as const };
  if (
    input.actorKind === 'PLAYER_CHARACTER' &&
    input.ownerUserId === input.userId &&
    input.capabilities.canControlOwnStageActor
  ) {
    return { allowed: true as const };
  }
  return { allowed: false as const, code: 'STAGE_ACTOR_FORBIDDEN' as const };
}
