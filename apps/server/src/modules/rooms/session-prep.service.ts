import { NextFunction, Response } from 'express';
import { ZodError, z } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';

const checklistItemSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1).max(160),
  done: z.boolean().default(false),
  public: z.boolean().default(true),
});

const materialLinkSchema = z.object({
  title: z.string().min(1).max(80),
  url: z.string().min(1).max(500),
  public: z.boolean().default(true),
});

const characterConfirmationSchema = z.object({
  confirmed: z.boolean().default(false),
  note: z.string().max(200).optional(),
});

const sessionPrepPayloadSchema = z.object({
  scheduledAt: z.string().datetime().nullable().optional(),
  checklist: z.array(checklistItemSchema).optional(),
  characterConfirmations: z.record(characterConfirmationSchema).optional(),
  publicNotes: z.string().max(4000).optional(),
  keeperNotes: z.string().max(4000).optional(),
  materialLinks: z.array(materialLinkSchema).optional(),
});

type ChecklistItem = z.infer<typeof checklistItemSchema>;
type MaterialLink = z.infer<typeof materialLinkSchema>;

function parseArray<T>(value: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}

function parseObject<T extends Record<string, unknown>>(value: string, fallback: T): T {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : fallback;
  } catch {
    return fallback;
  }
}

function serializeSessionPrep(prep: {
  id: string;
  roomId: string;
  scheduledAt: Date | null;
  checklist: string;
  characterConfirmations: string;
  publicNotes: string;
  keeperNotes: string;
  materialLinks: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}, includeKeeperFields: boolean) {
  const checklist = parseArray<ChecklistItem>(prep.checklist, []);
  const materialLinks = parseArray<MaterialLink>(prep.materialLinks, []);

  return {
    ...prep,
    scheduledAt: prep.scheduledAt?.toISOString() ?? null,
    checklist: includeKeeperFields ? checklist : checklist.filter(item => item.public !== false),
    materialLinks: includeKeeperFields ? materialLinks : materialLinks.filter(link => link.public !== false),
    characterConfirmations: parseObject(prep.characterConfirmations, {}),
    keeperNotes: includeKeeperFields ? prep.keeperNotes : undefined,
    createdAt: prep.createdAt.toISOString(),
    updatedAt: prep.updatedAt.toISOString(),
  };
}

export async function getSessionPrep(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room, capabilities } = await requireRoomCapability(roomId, req.userId, 'canViewPublicContent');

    const prep = await prisma.roomSessionPrep.findUnique({
      where: { roomId: room.id },
    });

    res.json({
      success: true,
      data: {
        prep: prep ? serializeSessionPrep(prep, capabilities.canUseKPTools) : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function saveSessionPrep(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canUseKPTools');
    const payload = sessionPrepPayloadSchema.parse(req.body ?? {});

    const prep = await prisma.roomSessionPrep.upsert({
      where: { roomId: room.id },
      create: {
        roomId: room.id,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        checklist: JSON.stringify(payload.checklist ?? []),
        characterConfirmations: JSON.stringify(payload.characterConfirmations ?? {}),
        publicNotes: payload.publicNotes ?? '',
        keeperNotes: payload.keeperNotes ?? '',
        materialLinks: JSON.stringify(payload.materialLinks ?? []),
        createdById: req.userId!,
      },
      update: {
        ...(payload.scheduledAt !== undefined ? { scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null } : {}),
        ...(payload.checklist !== undefined ? { checklist: JSON.stringify(payload.checklist) } : {}),
        ...(payload.characterConfirmations !== undefined ? { characterConfirmations: JSON.stringify(payload.characterConfirmations) } : {}),
        ...(payload.publicNotes !== undefined ? { publicNotes: payload.publicNotes } : {}),
        ...(payload.keeperNotes !== undefined ? { keeperNotes: payload.keeperNotes } : {}),
        ...(payload.materialLinks !== undefined ? { materialLinks: JSON.stringify(payload.materialLinks) } : {}),
      },
    });

    res.json({
      success: true,
      data: { prep: serializeSessionPrep(prep, true) },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_SESSION_PREP_PAYLOAD', '备团数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}

export async function getCharacterSyncStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canViewPublicContent');

    const members = await prisma.roomMember.findMany({
      where: {
        roomId: room.id,
        leftAt: null,
        role: 'PLAYER',
      },
      orderBy: { joinedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
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
            updatedAt: true,
          },
        },
      },
    });

    const checks = members.map(member => {
      const issues: string[] = [];
      const character = member.character;

      if (!character) {
        issues.push('NO_CHARACTER');
      } else {
        if (character.hp < 0 || character.hp > character.maxHp) issues.push('HP_OUT_OF_RANGE');
        if (character.mp < 0 || character.mp > character.maxMp) issues.push('MP_OUT_OF_RANGE');
        if (character.san < 0 || character.san > character.maxSan) issues.push('SAN_OUT_OF_RANGE');
      }

      return {
        memberId: member.id,
        userId: member.userId,
        nickname: member.user.nickname,
        role: member.role,
        character: character ? {
          id: character.id,
          name: character.name,
          hp: character.hp,
          maxHp: character.maxHp,
          mp: character.mp,
          maxMp: character.maxMp,
          san: character.san,
          maxSan: character.maxSan,
          updatedAt: character.updatedAt.toISOString(),
        } : null,
        issues,
        status: issues.length > 0 ? 'NEEDS_ATTENTION' : 'READY',
      };
    });

    res.json({
      success: true,
      data: {
        checks,
        summary: {
          totalPlayers: checks.length,
          readyCount: checks.filter(item => item.status === 'READY').length,
          needsAttentionCount: checks.filter(item => item.status === 'NEEDS_ATTENTION').length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
