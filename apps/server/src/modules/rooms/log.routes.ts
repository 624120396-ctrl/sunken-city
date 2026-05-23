import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();

async function requireKP(req: AuthRequest, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { roomId },
    include: { members: true },
  });
  if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
  const member = room.members.find(m => m.userId === req.userId);
  if (!member || member.role !== 'KP') {
    throw new AppError('FORBIDDEN', '只有KP可以操作', 403);
  }
  return room;
}

async function requireMember(req: AuthRequest, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { roomId },
    include: { members: true },
  });
  if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
  const member = room.members.find(m => m.userId === req.userId);
  if (!member) throw new AppError('FORBIDDEN', '不是房间成员', 403);
  return { room, member };
}

// 获取或创建房间 Log
async function getOrCreateLog(roomId: string) {
  let log = await prisma.roomLog.findFirst({
    where: { roomId },
    include: { events: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!log) {
    log = await prisma.roomLog.create({
      data: { roomId },
      include: { events: true },
    });
  }
  return log;
}

// ===== Log 事件 =====

// 获取 Log 事件列表（成员可读）
router.get('/:roomId/log/events', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { eventType } = req.query;
    const { room } = await requireMember(req, roomId);

    const log = await getOrCreateLog(room.id);
    const where: any = { logId: log.id };
    if (eventType) where.eventType = eventType as string;

    const events = await prisma.roomLogEvent.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    res.json({ success: true, data: { events, logId: log.id } });
  } catch (error) {
    next(error);
  }
});

// 手动添加 Log 事件（KP 可添加旁白/合并标记）
router.post('/:roomId/log/events', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { room } = await requireMember(req, roomId);
    const { eventType, payload, characterId, characterName, sortOrder } = req.body;

    const log = await getOrCreateLog(room.id);
    const event = await prisma.roomLogEvent.create({
      data: {
        logId: log.id,
        roomId: room.id,
        eventType: eventType || 'SYSTEM_EVENT',
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload || {}),
        characterId: characterId || null,
        characterName: characterName || null,
        userId: req.userId!,
        userNickname: req.userId || 'KP',
        sortOrder: sortOrder || 0,
      },
    });

    res.status(201).json({ success: true, data: { event } });
  } catch (error) {
    next(error);
  }
});

// ===== Log 编辑层（Annotation） =====

// 获取所有 Annotation（KP 可读）
router.get('/:roomId/log/annotations', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    await requireKP(req, roomId);
    const room = await prisma.room.findUnique({ where: { roomId } });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const log = await getOrCreateLog(room.id);
    const annotations = await prisma.roomLogAnnotation.findMany({
      where: { logId: log.id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: { annotations } });
  } catch (error) {
    next(error);
  }
});

// 添加 Annotation（KP 专属）
router.post('/:roomId/log/annotations', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await requireKP(req, roomId);
    const { fromEventId, toEventId, type, content } = req.body;

    const log = await getOrCreateLog(room.id);
    const annotation = await prisma.roomLogAnnotation.create({
      data: {
        logId: log.id,
        fromEventId,
        toEventId: toEventId || null,
        type: type || 'NARRATION',
        content,
        authorId: req.userId!,
      },
    });

    res.status(201).json({ success: true, data: { annotation } });
  } catch (error) {
    next(error);
  }
});

// ===== Log 导出 =====

function renderMarkdown(events: any[], annotations: any[]): string {
  let md = `# 跑团记录\n\n`;
  md += `> 生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
  md += `---\n\n`;

  for (const event of events) {
    const anns = annotations.filter(a => a.fromEventId === event.id);
    // 在事件前插入 annotation
    for (const ann of anns.filter(a => !a.toEventId)) {
      md += `**[KP 旁白]** ${ann.content}\n\n`;
    }

    let payload: any = {};
    try { payload = JSON.parse(event.payload); } catch { payload = { message: event.payload }; }

    switch (event.eventType) {
      case 'CHAT_TEXT':
        md += `**[${event.characterName || event.userNickname}]**：${payload.message || payload.content || event.payload}\n\n`;
        break;
      case 'DICE_ROLL':
        md += `🎲 **${payload.skill || payload.targetName || '检定'}**：${payload.rollResult || payload.result}/${payload.targetValue || '?'} **${payload.successLevel || payload.result || ''}**\n\n`;
        break;
      case 'SCENE_CHANGE':
        md += `---\n\n**场景切换：${payload.sceneTitle || payload.presetName || '新场景'}**\n\n`;
        if (payload.sceneDesc) md += `> ${payload.sceneDesc}\n\n`;
        md += `---\n\n`;
        break;
      case 'COMBAT_ACTION':
        md += `⚔️ **${payload.actor || '?'}** ${payload.action || '行动'}${payload.target ? ` → **${payload.target}**` : ''}${payload.result ? `：${JSON.stringify(payload.result).slice(0, 100)}` : ''}\n\n`;
        break;
      case 'CLUE_REVEAL':
        md += `💡 **线索揭示：${payload.clueTitle || '未知线索'}**\n\n*由 ${payload.discoveredBy || event.userNickname} 发现*\n\n`;
        break;
      case 'NPC_DIALOGUE':
        md += `💬 **${payload.npcName || 'NPC'}**：${payload.dialogue || payload.content || ''}\n\n`;
        break;
      case 'PHASE_CHANGE':
        md += `📖 **阶段变更：${payload.phaseTitle || '新阶段'}**\n\n`;
        break;
      case 'SYSTEM_EVENT':
        md += `> ${payload.message || payload.action || event.payload}\n\n`;
        break;
      default:
        md += `[${event.eventType}] ${payload.message || JSON.stringify(payload).slice(0, 200)}\n\n`;
    }

    // 在事件后插入 REDACT/NOTE
    for (const ann of anns.filter(a => a.toEventId)) {
      if (ann.type === 'REDACT') {
        md += `\`█ 内容已脱敏 █\`\n\n`;
      } else if (ann.type === 'NOTE') {
        md += `*[笔记] ${ann.content}*\n\n`;
      }
    }
  }

  return md;
}

function renderHTML(events: any[], annotations: any[]): string {
  const md = renderMarkdown(events, annotations);
  // 简单 markdown → html
  let html = md
    .replace(/\*\*\[(.*?)\]\*\*/g, '<strong>[$1]</strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/---\n\n/g, '<hr/>')
    .replace(/> (.*?)\n/g, '<blockquote>$1</blockquote>\n')
    .replace(/`█ (.*?) █`/g, '<span style="color:#888">█ $1 █</span>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    + '</p>';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>跑团记录</title><style>body{font-family:serif;background:#0a0a0f;color:#d4c5a8;padding:2rem;max-width:800px;margin:0 auto;line-height:1.8}h1{text-align:center;color:#c9a227}hr{border-color:#333;margin:1.5rem 0}blockquote{border-left:2px solid #c9a227;padding-left:1rem;color:#a0957a;font-style:italic}strong{color:#e8d5a3}</style></head><body>${html}</body></html>`;
}

// 导出 Log
router.post('/:roomId/log/export', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { format = 'markdown', eventTypes } = req.body;
    const room = await requireKP(req, roomId);

    const log = await getOrCreateLog(room.id);

    const where: any = { logId: log.id };
    if (eventTypes && eventTypes.length > 0) {
      where.eventType = { in: eventTypes };
    }

    const events = await prisma.roomLogEvent.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    const annotations = await prisma.roomLogAnnotation.findMany({
      where: { logId: log.id },
    });

    let content = '';
    if (format === 'markdown') {
      content = renderMarkdown(events, annotations);
    } else if (format === 'html') {
      content = renderHTML(events, annotations);
    } else if (format === 'json') {
      content = JSON.stringify({ events, annotations }, null, 2);
    } else {
      throw new AppError('INVALID_FORMAT', '不支持的导出格式', 400);
    }

    // 保存导出记录
    const exportRecord = await prisma.roomLogExport.create({
      data: {
        logId: log.id,
        format,
        content,
        options: JSON.stringify({ eventTypes }),
      },
    });

    res.json({
      success: true,
      data: {
        exportId: exportRecord.id,
        format,
        eventCount: events.length,
        annotationCount: annotations.length,
        content: format === 'json' ? undefined : content,
        // 前端可直接下载 content
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
