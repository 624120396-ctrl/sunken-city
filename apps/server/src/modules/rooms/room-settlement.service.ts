import { NextFunction, Response } from 'express';
import { ZodError, z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';

const settlementOutcomeSchema = z.enum(['SURVIVED', 'DEAD', 'MISSING', 'INSANE', 'WITHDREW']);
const settlementStatusSchema = z.enum(['DRAFT', 'CONFIRMED', 'APPROVED']);

const settlementPayloadSchema = z.object({
  outcome: settlementOutcomeSchema.optional(),
  hpFinal: z.number().int().min(0).nullable().optional(),
  mpFinal: z.number().int().min(0).nullable().optional(),
  sanFinal: z.number().int().min(0).nullable().optional(),
  expAward: z.number().int().min(0).optional(),
  skillGrowth: z.array(z.unknown()).optional(),
  itemChanges: z.array(z.unknown()).optional(),
  kpNote: z.string().nullable().optional(),
  status: settlementStatusSchema.optional(),
});

function parseArrayJson(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeSettlement(settlement: {
  id: string;
  roomRunId: string;
  characterId: string;
  userId: string;
  status: string;
  outcome: string;
  hpFinal: number | null;
  mpFinal: number | null;
  sanFinal: number | null;
  expAward: number;
  skillGrowth: string;
  itemChanges: string;
  kpNote: string | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...settlement,
    skillGrowth: parseArrayJson(settlement.skillGrowth),
    itemChanges: parseArrayJson(settlement.itemChanges),
    appliedAt: settlement.appliedAt?.toISOString() ?? null,
    createdAt: settlement.createdAt.toISOString(),
    updatedAt: settlement.updatedAt.toISOString(),
  };
}

export async function getRoomSettlements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { room, lifecycle } = await requireRoomCapability(roomId, userId, 'canFinalizeRoom');

    if (lifecycle !== 'FINISHING') {
      throw new AppError('INVALID_ROOM_LIFECYCLE', '只有结算中的房间可以查看结算草案', 400);
    }

    const run = await prisma.roomRun.findUnique({
      where: { roomId: room.id },
      include: {
        participants: {
          where: {
            role: 'PLAYER',
            characterId: { not: null },
          },
          include: {
            user: { select: { id: true, nickname: true } },
            character: {
              select: {
                id: true,
                name: true,
                hp: true,
                mp: true,
                san: true,
                maxHp: true,
                maxMp: true,
                maxSan: true,
                userId: true,
              },
            },
          },
          orderBy: { joinedRunAt: 'asc' },
        },
        settlements: true,
      },
    });

    if (!run) {
      throw new AppError('ROOM_RUN_NOT_FOUND', '房间进程不存在', 404);
    }

    const settlementByCharacterId = new Map(
      run.settlements.map(settlement => [settlement.characterId, serializeSettlement(settlement)])
    );

    const settlements = run.participants
      .filter(participant => participant.characterId && participant.character)
      .map(participant => ({
        participant: {
          id: participant.id,
          userId: participant.userId,
          userNickname: participant.user.nickname,
          characterId: participant.characterId!,
          characterName: participant.character!.name,
          currentHp: participant.character!.hp,
          currentMp: participant.character!.mp,
          currentSan: participant.character!.san,
          maxHp: participant.character!.maxHp,
          maxMp: participant.character!.maxMp,
          maxSan: participant.character!.maxSan,
        },
        settlement: settlementByCharacterId.get(participant.characterId!) ?? null,
      }));

    res.json({
      success: true,
      data: {
        roomRunId: run.id,
        lifecycle: run.lifecycle,
        settlements,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_SETTLEMENT_PAYLOAD', '结算数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function saveRoomSettlement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId, characterId } = req.params;
    const userId = req.userId!;
    const { room, lifecycle } = await requireRoomCapability(roomId, userId, 'canFinalizeRoom');

    if (lifecycle !== 'FINISHING') {
      throw new AppError('INVALID_ROOM_LIFECYCLE', '只有结算中的房间可以保存结算草案', 400);
    }

    const payload = settlementPayloadSchema.parse(req.body ?? {});

    const run = await prisma.roomRun.findUnique({
      where: { roomId: room.id },
      include: {
        participants: {
          where: {
            role: 'PLAYER',
            characterId,
          },
          include: {
            character: { select: { id: true, userId: true } },
          },
        },
      },
    });

    if (!run) {
      throw new AppError('ROOM_RUN_NOT_FOUND', '房间进程不存在', 404);
    }

    if (run.lifecycle !== 'FINISHING') {
      throw new AppError('INVALID_ROOM_LIFECYCLE', '只有结算中的房间可以保存结算草案', 400);
    }

    const participant = run.participants[0];
    if (!participant || !participant.character || participant.character.userId !== participant.userId) {
      throw new AppError('INVALID_SETTLEMENT_CHARACTER', '结算角色必须属于当前跑团的玩家参与者', 400);
    }

    const updateData = {
      ...(payload.outcome !== undefined ? { outcome: payload.outcome } : {}),
      ...(payload.hpFinal !== undefined ? { hpFinal: payload.hpFinal } : {}),
      ...(payload.mpFinal !== undefined ? { mpFinal: payload.mpFinal } : {}),
      ...(payload.sanFinal !== undefined ? { sanFinal: payload.sanFinal } : {}),
      ...(payload.expAward !== undefined ? { expAward: payload.expAward } : {}),
      ...(payload.skillGrowth !== undefined ? { skillGrowth: JSON.stringify(payload.skillGrowth) } : {}),
      ...(payload.itemChanges !== undefined ? { itemChanges: JSON.stringify(payload.itemChanges) } : {}),
      ...(payload.kpNote !== undefined ? { kpNote: payload.kpNote } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
    };

    const settlement = await prisma.roomSettlement.upsert({
      where: {
        roomRunId_characterId: {
          roomRunId: run.id,
          characterId,
        },
      },
      create: {
        roomRunId: run.id,
        characterId,
        userId: participant.userId,
        outcome: payload.outcome ?? 'SURVIVED',
        hpFinal: payload.hpFinal ?? null,
        mpFinal: payload.mpFinal ?? null,
        sanFinal: payload.sanFinal ?? null,
        expAward: payload.expAward ?? 0,
        skillGrowth: JSON.stringify(payload.skillGrowth ?? []),
        itemChanges: JSON.stringify(payload.itemChanges ?? []),
        kpNote: payload.kpNote ?? null,
        status: payload.status ?? 'DRAFT',
      },
      update: updateData,
    });

    res.json({
      success: true,
      data: {
        settlement: serializeSettlement(settlement),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_SETTLEMENT_PAYLOAD', '结算数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}
