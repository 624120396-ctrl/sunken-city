import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { logger } from '../../utils/logger';

const router = Router();

// 获取房间报告
router.get('/rooms/:roomId/report', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;

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
    const parsedKeyEvents = JSON.parse(report.keyEvents as string);
    const parsedCharacterGrowth = JSON.parse(report.characterGrowth as string);

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

    // 构建角色成长记录
    const characterProgress = room.members
      .filter(m => m.character)
      .map(m => ({
        name: m.character!.name,
        hpChange: { before: m.character!.hp, after: m.character!.hp },
        mpChange: { before: m.character!.mp, after: m.character!.mp },
        sanChange: { before: m.character!.san, after: m.character!.san },
        skillGrowth: [],
      }));

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
        characterProgress: parsedCharacterGrowth.length > 0 ? parsedCharacterGrowth : characterProgress,
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

    const report = await prisma.sessionReport.findFirst({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
    });

    if (!report) {
      throw new AppError('REPORT_NOT_FOUND', '报告不存在', 404);
    }

    const updateData: any = {};
    if (summary !== undefined) updateData.summary = summary;
    if (characterGrowth !== undefined) updateData.characterGrowth = JSON.stringify(characterGrowth);

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

    const keyEvents = report ? JSON.parse(report.keyEvents as string) : [];
    const characterGrowth = report ? JSON.parse(report.characterGrowth as string) : [];

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

## 关键事件
${keyEvents.map((e: any) => `- ${new Date(e.time).toLocaleTimeString()} - ${e.event}`).join('\n')}

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
${characterGrowth.length > 0 ? characterGrowth.map((c: any) => `### ${c.name}
- **HP**: ${c.hpChange?.before} → ${c.hpChange?.after}
- **MP**: ${c.mpChange?.before} → ${c.mpChange?.after}
- **SAN**: ${c.sanChange?.before} → ${c.sanChange?.after}
${c.skillGrowth?.length > 0 ? `- **技能成长**: ${c.skillGrowth.map((s: any) => `${s.name} ${s.before}% → ${s.after}%`).join(', ')}` : ''}
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