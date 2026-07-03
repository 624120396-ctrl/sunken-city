import { NextFunction, Response } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { AuthRequest } from '../../middleware/auth';
import { requireRoomCapability } from './room-auth';

const ACTIVE_LOCK_STATUS = 'ACTIVE';
const APPLICABLE_SETTLEMENT_STATUSES = ['CONFIRMED', 'APPROVED'];

function toJsonString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '{}';
  return JSON.stringify(value);
}

function buildCharacterSnapshot(character: {
  id: string;
  name: string;
  occupation: string;
  hp: number;
  mp: number;
  san: number;
  maxHp: number;
  maxMp: number;
  maxSan: number;
  skills: string;
  weapons: string;
  armor: string | null;
}) {
  return {
    id: character.id,
    name: character.name,
    occupation: character.occupation,
    hp: character.hp,
    mp: character.mp,
    san: character.san,
    maxHp: character.maxHp,
    maxMp: character.maxMp,
    maxSan: character.maxSan,
    skills: character.skills,
    weapons: character.weapons,
    armor: character.armor,
  };
}

export async function startRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;

    const { room } = await requireRoomCapability(roomId, userId, 'canStartRoom');

    const roomWithPlayers = await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        members: {
          where: {
            role: 'PLAYER',
            leftAt: null,
            characterId: { not: null },
          },
          include: { character: true },
        },
      },
    });

    if (!roomWithPlayers) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    const playerMembers = roomWithPlayers.members.filter(member => member.characterId && member.character);

    if (playerMembers.length === 0) {
      throw new AppError('ROOM_START_REQUIRES_PLAYER_CHARACTER', '至少需要一名已绑定角色的玩家才能开团', 400);
    }

    for (const member of playerMembers) {
      if (member.character?.userId !== member.userId) {
        throw new AppError('CHARACTER_OWNER_MISMATCH', '存在不属于玩家本人的角色绑定', 400);
      }
    }

    const characterIds = playerMembers.map(member => member.characterId!);
    const now = new Date();

    const roomRun = await prisma.$transaction(async tx => {
      const activeLocks = await tx.roomCharacterLock.findMany({
        where: {
          characterId: { in: characterIds },
          status: ACTIVE_LOCK_STATUS,
        },
      });

      if (activeLocks.length > 0) {
        throw new AppError('CHARACTER_ALREADY_IN_ROOM_RUN', '存在角色正在其他跑团中使用', 409);
      }

      const startSnapshot = {
        roomId: room.roomId,
        startedAt: now.toISOString(),
        participants: playerMembers.map(member => ({
          roomMemberId: member.id,
          userId: member.userId,
          characterId: member.characterId,
          character: member.character ? buildCharacterSnapshot(member.character) : null,
        })),
      };

      const run = await tx.roomRun.upsert({
        where: { roomId: room.id },
        create: {
          roomId: room.id,
          lifecycle: 'IN_PROGRESS',
          startedAt: now,
          pausedAt: null,
          finishingAt: null,
          finishedAt: null,
          cancelledAt: null,
          startSnapshot: JSON.stringify(startSnapshot),
        },
        update: {
          lifecycle: 'IN_PROGRESS',
          startedAt: now,
          pausedAt: null,
          finishingAt: null,
          finishedAt: null,
          cancelledAt: null,
          startSnapshot: JSON.stringify(startSnapshot),
        },
      });

      await tx.roomRunParticipant.deleteMany({ where: { roomRunId: run.id } });

      await tx.roomRunParticipant.createMany({
        data: playerMembers.map(member => ({
          roomRunId: run.id,
          roomMemberId: member.id,
          userId: member.userId,
          role: member.role,
          characterId: member.characterId,
          initialSnapshot: member.character ? JSON.stringify(buildCharacterSnapshot(member.character)) : '{}',
          joinSnapshot: member.character ? JSON.stringify(buildCharacterSnapshot(member.character)) : '{}',
        })),
      });

      await tx.roomCharacterLock.createMany({
        data: playerMembers.map(member => ({
          characterId: member.characterId!,
          roomId: room.id,
          roomRunId: run.id,
          userId: member.userId,
          status: ACTIVE_LOCK_STATUS,
          lockedAt: now,
        })),
      });

      return run;
    });

    res.json({ success: true, data: { roomRun } });
  } catch (error) {
    next(error);
  }
}

export async function pauseRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { room, lifecycle } = await requireRoomCapability(roomId, userId, 'canPauseRoom');

    if (lifecycle !== 'IN_PROGRESS') {
      throw new AppError('INVALID_ROOM_LIFECYCLE', '只有进行中的房间可以暂停', 400);
    }

    const roomRun = await prisma.roomRun.update({
      where: { roomId: room.id },
      data: { lifecycle: 'PAUSED', pausedAt: new Date() },
    });

    res.json({ success: true, data: { roomRun } });
  } catch (error) {
    next(error);
  }
}

export async function resumeRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { room, lifecycle } = await requireRoomCapability(roomId, userId, 'canResumeRoom');

    if (lifecycle !== 'PAUSED') {
      throw new AppError('INVALID_ROOM_LIFECYCLE', '只有已暂停的房间可以继续', 400);
    }

    const roomRun = await prisma.roomRun.update({
      where: { roomId: room.id },
      data: { lifecycle: 'IN_PROGRESS', pausedAt: null },
    });

    res.json({ success: true, data: { roomRun } });
  } catch (error) {
    next(error);
  }
}

export async function enterFinishing(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { room, lifecycle } = await requireRoomCapability(roomId, userId, 'canEnterFinishing');

    if (lifecycle !== 'IN_PROGRESS' && lifecycle !== 'PAUSED') {
      throw new AppError('INVALID_ROOM_LIFECYCLE', '只有进行中或暂停的房间可以进入结算', 400);
    }

    const roomRun = await prisma.roomRun.update({
      where: { roomId: room.id },
      data: { lifecycle: 'FINISHING', finishingAt: new Date() },
    });

    res.json({ success: true, data: { roomRun } });
  } catch (error) {
    next(error);
  }
}

export async function finalizeRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { room, lifecycle } = await requireRoomCapability(roomId, userId, 'canFinalizeRoom');

    if (lifecycle !== 'FINISHING') {
      throw new AppError('INVALID_ROOM_LIFECYCLE', '只有结算中的房间可以完成结团', 400);
    }

    const finishSummary = toJsonString(req.body?.finishSummary);
    const now = new Date();

    const result = await prisma.$transaction(async tx => {
      const run = await tx.roomRun.findUnique({
        where: { roomId: room.id },
        include: {
          settlements: {
            where: { status: { in: APPLICABLE_SETTLEMENT_STATUSES } },
          },
          participants: {
            where: {
              role: 'PLAYER',
              characterId: { not: null },
            },
            select: {
              characterId: true,
              userId: true,
            },
          },
        },
      });

      if (!run) {
        throw new AppError('ROOM_RUN_NOT_FOUND', '房间进程不存在', 404);
      }

      const playerParticipantCharacterIds = new Set(
        run.participants
          .map(participant => participant.characterId)
          .filter((characterId): characterId is string => Boolean(characterId))
      );
      const playerParticipantCharacterUserPairs = new Set(
        run.participants
          .filter((participant): participant is { characterId: string; userId: string } => Boolean(participant.characterId))
          .map(participant => `${participant.characterId}:${participant.userId}`)
      );
      let appliedSettlementCount = 0;

      for (const settlement of run.settlements) {
        const matchesPlayerParticipant = settlement.userId
          ? playerParticipantCharacterUserPairs.has(`${settlement.characterId}:${settlement.userId}`)
          : playerParticipantCharacterIds.has(settlement.characterId);

        if (!matchesPlayerParticipant) {
          continue;
        }

        const characterData: { hp?: number; mp?: number; san?: number } = {};
        if (settlement.hpFinal !== null) characterData.hp = settlement.hpFinal;
        if (settlement.mpFinal !== null) characterData.mp = settlement.mpFinal;
        if (settlement.sanFinal !== null) characterData.san = settlement.sanFinal;

        if (Object.keys(characterData).length > 0) {
          await tx.character.update({
            where: { id: settlement.characterId },
            data: characterData,
          });
        }

        if (settlement.expAward > 0) {
          await tx.user.update({
            where: { id: settlement.userId },
            data: { exp: { increment: settlement.expAward } },
          });
        }

        await tx.roomSettlement.update({
          where: { id: settlement.id },
          data: { appliedAt: now },
        });
        appliedSettlementCount += 1;
      }

      await tx.roomCharacterLock.updateMany({
        where: {
          roomRunId: run.id,
          status: ACTIVE_LOCK_STATUS,
        },
        data: {
          status: 'RELEASED',
          releasedAt: now,
        },
      });

      const roomRun = await tx.roomRun.update({
        where: { id: run.id },
        data: {
          lifecycle: 'FINISHED',
          finishedAt: now,
          finalizedById: userId,
          finishSummary,
        },
      });

      await tx.room.update({
        where: { id: room.id },
        data: { status: 'CLOSED' },
      });

      return { roomRun, appliedSettlementCount };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function cancelRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { room, lifecycle } = await requireRoomCapability(roomId, userId, 'canCancelRoom');

    if (lifecycle !== 'PREPARING' && lifecycle !== 'READY') {
      throw new AppError('INVALID_ROOM_LIFECYCLE', '只有开团前的房间可以取消', 400);
    }

    const now = new Date();
    const roomRun = await prisma.$transaction(async tx => {
      const run = await tx.roomRun.upsert({
        where: { roomId: room.id },
        create: {
          roomId: room.id,
          lifecycle: 'CANCELLED',
          cancelledAt: now,
        },
        update: {
          lifecycle: 'CANCELLED',
          cancelledAt: now,
        },
      });

      await tx.room.update({
        where: { id: room.id },
        data: { status: 'CLOSED' },
      });

      return run;
    });

    res.json({ success: true, data: { roomRun } });
  } catch (error) {
    next(error);
  }
}
