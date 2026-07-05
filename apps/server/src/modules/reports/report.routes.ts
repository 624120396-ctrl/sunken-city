import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { logger } from '../../utils/logger';
import { requireRoomCapability } from '../rooms/room-auth';

const router = Router();

type KeyEvent = {
  time: string;
  event: string;
};

type SkillGrowthEntry = {
  name?: string;
  before?: number;
  after?: number;
};

type CharacterGrowthEntry = {
  userId?: string;
  characterId?: string;
  name?: string;
  hpChange?: { before?: number; after?: number };
  mpChange?: { before?: number; after?: number };
  sanChange?: { before?: number; after?: number };
  skillGrowth?: SkillGrowthEntry[];
  settlement?: unknown;
};

type InvestigationReportEntry = {
  time: string;
  eventType: string;
  title: string;
  content: string | null;
};

function parseJsonArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

// 获取房间报告
router.get('/rooms/:roomId/report', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    await requireRoomCapability(roomId, req.userId, 'canViewPublicContent');

    // 获取房间信息
    const room = await prisma.room.findUnique({
      where: { roomId },
      include: {
        members: {
          include: {
            user: { select: { id: true, nickname: true } },
            character: true,
          },
        },
        roomRun: {
          include: {
            settlements: true,
          },
        },
      },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    // 获取战斗日志
    const combatLogs = await prisma.combatLog.findMany({
      where: { roomId },
      orderBy: { timestamp: 'asc' },
    });

    // 获取投骰记录
    const diceRolls = await prisma.diceRoll.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });

    // 获取已有报告
    let report = await prisma.sessionReport.findFirst({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
    });

    const currentFocus = await prisma.roomCurrentFocus.findUnique({
      where: { roomId: room.id },
    });

    const currentScene = await prisma.investigationScene.findFirst({
      where: { roomId: room.id, isCurrent: true },
      orderBy: { updatedAt: 'desc' },
    });

    const publicClues = await prisma.investigationClue.findMany({
      where: { roomId: room.id, visibility: 'PUBLIC' },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const investigationTimeline = await prisma.investigationLogEntry.findMany({
      where: { roomId: room.id, visibility: 'PUBLIC' },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    // 如果没有报告，创建一个
    if (!report) {
      const participantCount = room.members.filter(m => m.leftAt === null).length;
      
      // 计算战斗回合数
      const maxRound = combatLogs.length > 0 
        ? Math.max(...combatLogs.map(log => log.round))
        : 0;

      // 生成关键事件
      const keyEvents = [
        { time: room.createdAt.toISOString(), event: '房间创建' },
        ...combatLogs.map(log => ({
          time: log.timestamp.toISOString(),
          event: `${log.actor} ${log.action}${log.target ? ` ${log.target}` : ''}`,
        })),
      ];

      report = await prisma.sessionReport.create({
        data: {
          roomId,
          title: `${room.name} - 游戏报告`,
          summary: '',
          participantCount,
          combatRounds: maxRound,
          diceRollCount: diceRolls.length,
          keyEvents: JSON.stringify(keyEvents),
          characterGrowth: JSON.stringify([]),
        },
      });
    }

    // 解析JSON字段
    const parsedKeyEvents = parseJsonArray<KeyEvent>(report.keyEvents);
    const parsedCharacterGrowth = parseJsonArray<CharacterGrowthEntry>(report.characterGrowth);

    // 构建战斗记录
    const combatRecords = combatLogs.map(log => ({
      round: log.round,
      time: log.timestamp.toISOString(),
      actor: log.actor,
      action: log.action,
      target: log.target,
      result: log.result,
    }));

    // 构建技能检定记录
    const skillChecks = diceRolls.map(roll => ({
      time: roll.createdAt.toISOString(),
      character: roll.targetName || '未知',
      skill: roll.rollType,
      roll: roll.rollResult,
      successLevel: roll.successLevel,
    }));

    const settlementByCharacterId = new Map(
      (room.roomRun?.settlements || []).map(settlement => [
        settlement.characterId,
        {
          outcome: settlement.outcome,
          hpFinal: settlement.hpFinal,
          mpFinal: settlement.mpFinal,
          sanFinal: settlement.sanFinal,
          expAward: settlement.expAward,
          skillGrowth: parseJsonArray(settlement.skillGrowth),
          itemChanges: parseJsonArray(settlement.itemChanges),
          kpNote: settlement.kpNote,
          status: settlement.status,
        },
      ])
    );

    // 构建角色成长记录
    const characterProgress = room.members
      .filter(m => m.character)
      .map(m => {
        const settlement = settlementByCharacterId.get(m.character!.id);
        return {
          userId: m.userId,
          characterId: m.character!.id,
          name: m.character!.name,
          hpChange: { before: m.character!.hp, after: settlement?.hpFinal ?? m.character!.hp },
          mpChange: { before: m.character!.mp, after: settlement?.mpFinal ?? m.character!.mp },
          sanChange: { before: m.character!.san, after: settlement?.sanFinal ?? m.character!.san },
          skillGrowth: settlement?.skillGrowth ?? [],
          settlement,
        };
      });

    const mergedCharacterProgress = parsedCharacterGrowth.length > 0
      ? parsedCharacterGrowth.map((entry) => ({
          ...entry,
          settlement: entry.characterId ? settlementByCharacterId.get(entry.characterId) ?? entry.settlement : entry.settlement,
        }))
      : characterProgress;

    res.json({
      success: true,
      data: {
        id: report.id,
        title: report.title,
        summary: report.summary,
        date: report.createdAt.toISOString().split('T')[0],
        duration: report.duration || Math.ceil((Date.now() - report.createdAt.getTime()) / 60000),
        participants: room.members.filter(m => m.leftAt === null).map(m => ({
          name: m.user.nickname,
          role: m.role,
          character: m.character?.name,
        })),
        keyEvents: parsedKeyEvents,
        combatRecords,
        skillChecks,
        characterProgress: mergedCharacterProgress,
        investigation: {
          lastRecap: currentFocus?.lastRecap ?? '',
          currentObjective: currentFocus?.currentObjective ?? '',
          unresolvedQuestions: currentFocus ? parseJsonArray<string>(currentFocus.unresolvedQuestions) : [],
          pinnedMessage: currentFocus?.pinnedMessage ?? '',
          currentScene: currentScene ? {
            title: currentScene.title,
            publicSummary: currentScene.publicSummary,
            atmosphere: currentScene.atmosphere,
          } : null,
          publicClues: publicClues.map(clue => ({
            id: clue.id,
            title: clue.title,
            content: clue.content,
            source: clue.source,
            status: clue.status,
            revealedAt: clue.revealedAt?.toISOString() ?? null,
          })),
          timeline: investigationTimeline.map<InvestigationReportEntry>(entry => ({
            time: entry.createdAt.toISOString(),
            eventType: entry.eventType,
            title: entry.title,
            content: entry.content,
          })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// 更新报告摘要
router.patch('/rooms/:roomId/report', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { summary, characterGrowth } = req.body;
    await requireRoomCapability(roomId, req.userId, 'canViewPublicContent');

    const report = await prisma.sessionReport.findFirst({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
    });

    if (!report) {
      throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404);
    }

    const updateData: { summary?: string; characterGrowth?: string } = {};
    if (summary !== undefined) updateData.summary = summary;
    if (characterGrowth !== undefined) {
      updateData.characterGrowth = JSON.stringify(parseJsonArray<CharacterGrowthEntry>(characterGrowth));
    }

    await prisma.sessionReport.update({
      where: { id: report.id },
      data: updateData,
    });

    res.json({
      success: true,
      message: '报告已更新',
    });
  } catch (error) {
    next(error);
  }
});

// 导出报告为Markdown
router.get('/rooms/:roomId/report/export', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    await requireRoomCapability(roomId, req.userId, 'canViewPublicContent');

    // 获取报告数据
    const room = await prisma.room.findUnique({
      where: { roomId },
      include: {
        members: {
          include: {
            user: { select: { nickname: true } },
            character: true,
          },
        },
      },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    const report = await prisma.sessionReport.findFirst({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
    });

    const combatLogs = await prisma.combatLog.findMany({
      where: { roomId },
      orderBy: { timestamp: 'asc' },
    });

    const diceRolls = await prisma.diceRoll.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });

    const keyEvents = report ? parseJsonArray<KeyEvent>(report.keyEvents) : [];
    const characterGrowth = report ? parseJsonArray<CharacterGrowthEntry>(report.characterGrowth) : [];
    const currentFocus = await prisma.roomCurrentFocus.findUnique({
      where: { roomId: room.id },
    });
    const currentScene = await prisma.investigationScene.findFirst({
      where: { roomId: room.id, isCurrent: true },
      orderBy: { updatedAt: 'desc' },
    });
    const publicClues = await prisma.investigationClue.findMany({
      where: { roomId: room.id, visibility: 'PUBLIC' },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    const investigationTimeline = await prisma.investigationLogEntry.findMany({
      where: { roomId: room.id, visibility: 'PUBLIC' },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    // 生成Markdown
    const md = `# ${room.name} - 游戏报告

## 基本信息
- **日期**: ${report?.createdAt.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]}
- **时长**: ${report?.duration || 0}分钟
- **参与人数**: ${room.members.filter(m => m.leftAt === null).length}
- **战斗回合**: ${Math.max(...combatLogs.map(log => log.round), 0)}
- **投骰次数**: ${diceRolls.length}

## 参与者
${room.members.filter(m => m.leftAt === null).map(m => `- ${m.user.nickname}${m.character ? ` (${m.character.name})` : ''} - ${m.role === 'KP' ? '守秘人' : '调查员'}`).join('\n')}

## 故事概要
${report?.summary || '暂无概要'}

## 调查档案
- **当前目标**: ${currentFocus?.currentObjective || '暂无'}
- **当前场景**: ${currentScene?.title || '暂无'}
- **KP 置顶消息**: ${currentFocus?.pinnedMessage || '暂无'}

### 上次回顾
${currentFocus?.lastRecap || '暂无'}

### 未解决问题
${currentFocus ? parseJsonArray<string>(currentFocus.unresolvedQuestions).map(question => `- ${question}`).join('\n') || '暂无' : '暂无'}

### 公开线索
${publicClues.length > 0 ? publicClues.map(clue => `- **${clue.title}**${clue.source ? `（${clue.source}）` : ''}: ${clue.content || '无内容'}`).join('\n') : '暂无'}

### 调查日志
${investigationTimeline.length > 0 ? investigationTimeline.map(entry => `- ${new Date(entry.createdAt).toLocaleString()} - ${entry.title}${entry.content ? `：${entry.content}` : ''}`).join('\n') : '暂无'}

## 关键事件
${keyEvents.map((event) => `- ${new Date(event.time).toLocaleTimeString()} - ${event.event}`).join('\n')}

## 战斗记录
${combatLogs.map(log => `### 第${log.round}回合 - ${log.actor}
- **行动**: ${log.action}${log.target ? ` → ${log.target}` : ''}
- **结果**: ${log.result}
`).join('\n')}

## 技能检定记录
| 时间 | 角色 | 技能 | 骰值 | 结果 |
|------|------|------|------|------|
${diceRolls.map(roll => `| ${new Date(roll.createdAt).toLocaleTimeString()} | ${roll.targetName || '未知'} | ${roll.rollType} | ${roll.rollResult} | ${roll.successLevel} |`).join('\n')}

## 角色成长
${characterGrowth.length > 0 ? characterGrowth.map((character) => `### ${character.name || '未知角色'}
- **HP**: ${character.hpChange?.before ?? '-'} → ${character.hpChange?.after ?? '-'}
- **MP**: ${character.mpChange?.before ?? '-'} → ${character.mpChange?.after ?? '-'}
- **SAN**: ${character.sanChange?.before ?? '-'} → ${character.sanChange?.after ?? '-'}
${character.skillGrowth && character.skillGrowth.length > 0 ? `- **技能成长**: ${character.skillGrowth.map((skill) => `${skill.name || '未知技能'} ${skill.before ?? '-'}% → ${skill.after ?? '-'}%`).join(', ')}` : ''}
`).join('\n') : '暂无成长记录'}

---
*由 COC跑团平台 自动生成*
`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${room.name}_游戏报告.md"`);
    res.send(md);
  } catch (error) {
    next(error);
  }
});

export default router;
