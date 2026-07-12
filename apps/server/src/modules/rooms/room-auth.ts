import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';

export type RoomRoleView = 'OWNER_KP' | 'ASSISTANT_KP' | 'PLAYER' | 'OBSERVER' | 'NON_MEMBER';

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
  canUseStage: boolean;
  canControlOwnStageActor: boolean;
  canManageStage: boolean;
  canManageStageAssets: boolean;
  canExportStageReplay: boolean;
}

export function deriveLifecycle(status?: string | null, lifecycle?: string | null): string {
  if (lifecycle) return lifecycle;
  if (status === 'CLOSED') return 'FINISHED';
  return 'PREPARING';
}

export function deriveRoomRole(input: {
  creatorId: string;
  userId?: string;
  member?: { role: string; leftAt: Date | null } | null;
}): RoomRoleView {
  if (!input.userId) return 'NON_MEMBER';
  if (input.creatorId === input.userId) return 'OWNER_KP';
  if (!input.member || input.member.leftAt) return 'NON_MEMBER';
  if (input.member.role === 'KP') return 'ASSISTANT_KP';
  if (input.member.role === 'OBSERVER') return 'OBSERVER';
  if (input.member.role === 'PLAYER') return 'PLAYER';
  return 'NON_MEMBER';
}

export function capabilitiesFor(role: RoomRoleView, lifecycle: string): RoomCapabilities {
  const isKp = role === 'OWNER_KP' || role === 'ASSISTANT_KP';
  const isPlayer = role === 'PLAYER';
  const isObserver = role === 'OBSERVER';
  const isMember = isKp || isPlayer || isObserver;
  const beforeStart = lifecycle === 'PREPARING' || lifecycle === 'READY';
  const active = lifecycle === 'IN_PROGRESS' || lifecycle === 'PAUSED';
  const finishing = lifecycle === 'FINISHING';
  const closed = lifecycle === 'FINISHED' || lifecycle === 'CANCELLED';
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
    canSendPrivateMessage: (isKp || isPlayer) && !closed,
    canRollPublicDice: (isKp || isPlayer) && !closed,
    canRollSecretDice: isKp && canMutate,
    canViewSecretEvents: isKp,
    canViewPublicContent: isMember,
    canUseStage: isMember && !closed,
    canControlOwnStageActor: isPlayer && !closed,
    canManageStage: isKp && canMutate,
    canManageStageAssets: isKp && canMutate,
    canExportStageReplay: isKp,
  };
}

export async function requireRoomCapability(
  roomId: string,
  userId: string | undefined,
  capability: keyof RoomCapabilities
) {
  const room = await prisma.room.findUnique({
    where: { roomId },
    include: { members: true, roomRun: true },
  });

  if (!room) {
    throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
  }

  const member = room.members.find(m => m.userId === userId && !m.leftAt) || null;
  const lifecycle = deriveLifecycle(room.status, room.roomRun?.lifecycle);
  const role = deriveRoomRole({ creatorId: room.creatorId, userId, member });
  const capabilities = capabilitiesFor(role, lifecycle);

  if (!capabilities[capability]) {
    throw new AppError('FORBIDDEN', '你没有执行此房间操作的权限', 403);
  }

  return { room, member, role, lifecycle, capabilities };
}
