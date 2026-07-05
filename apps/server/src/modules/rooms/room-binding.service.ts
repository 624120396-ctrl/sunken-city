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

export async function createOrRestoreRoomMember(input: {
  roomDbId: string;
  userId: string;
  joinAs: JoinMode;
  characterId?: string | null;
}) {
  const room = await prisma.room.findUnique({
    where: { id: input.roomDbId },
    include: { members: true },
  });

  if (!room) {
    throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
  }

  const existingMember = room.members.find(member => member.userId === input.userId && !member.leftAt);
  if (existingMember) {
    throw new AppError('ALREADY_MEMBER', '你已在房间中', 400);
  }

  if (input.joinAs === 'PLAYER') {
    if (!input.characterId) {
      throw new AppError('CHARACTER_REQUIRED', '加入玩家席位需要选择角色', 400);
    }
    await assertCharacterOwnedByUser(input.characterId, input.userId);
    await assertCharacterAvailableForRoom(input.characterId, input.roomDbId);
  }

  const joinData = buildMemberJoinData(input);
  const leftMember = room.members.find(member => member.userId === input.userId && member.leftAt);

  if (leftMember) {
    return prisma.roomMember.update({
      where: { id: leftMember.id },
      data: {
        leftAt: null,
        role: joinData.role,
        characterId: joinData.characterId,
        displayedCharacterId: joinData.displayedCharacterId,
      },
    });
  }

  return prisma.roomMember.create({ data: joinData });
}
