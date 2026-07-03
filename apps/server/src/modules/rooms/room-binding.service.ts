import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';

export type JoinMode = 'PLAYER' | 'OBSERVER';

export function normalizeJoinMode(value: unknown): JoinMode {
  return value === 'OBSERVER' ? 'OBSERVER' : 'PLAYER';
}

export async function assertCharacterOwnedByUser(characterId: string, userId: string) {
  const character = await prisma.character.findFirst({
    where: { id: characterId, userId },
  });

  if (!character) {
    throw new AppError('CHARACTER_NOT_FOUND', '角色不存在或不属于你', 404);
  }

  return character;
}

export async function assertCharacterAvailableForRoom(characterId: string, roomId: string) {
  const activeLock = await prisma.roomCharacterLock.findFirst({
    where: {
      characterId,
      status: 'ACTIVE',
    },
    select: {
      roomId: true,
    },
  });

  if (activeLock && activeLock.roomId !== roomId) {
    throw new AppError('CHARACTER_ALREADY_LOCKED', '角色正在其他跑团中使用', 400);
  }
}

export function buildMemberJoinData(input: {
  roomDbId: string;
  userId: string;
  joinAs: JoinMode;
  characterId?: string | null;
}) {
  if (input.joinAs === 'OBSERVER') {
    return {
      roomId: input.roomDbId,
      userId: input.userId,
      role: 'OBSERVER',
      characterId: null,
      displayedCharacterId: null,
    };
  }

  if (!input.characterId) {
    throw new AppError('CHARACTER_REQUIRED', '加入玩家席位需要选择角色', 400);
  }

  return {
    roomId: input.roomDbId,
    userId: input.userId,
    role: 'PLAYER',
    characterId: input.characterId,
    displayedCharacterId: input.characterId,
  };
}
