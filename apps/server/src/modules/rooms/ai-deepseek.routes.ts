import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();

// 旧 AI 生成路由默认关闭，避免在基础骨架阶段误触发付费供应商调用。
const LEGACY_AI_ROUTES_ENABLED = process.env.ENABLE_LEGACY_ROOM_AI_ROUTES === 'true';
const CODING_BASE_URL = process.env.CODING_AI_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3';
const CODING_API_KEY = process.env.CODING_AI_API_KEY || '';
const CODING_MODEL = process.env.CODING_AI_MODEL_ID || 'Kimi-K2.6';

interface ChatCompletionBody {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}

async function chatCompletion(body: ChatCompletionBody): Promise<string> {
  if (!CODING_API_KEY) {
    throw new AppError('AI_PROVIDER_NOT_CONFIGURED', 'Coding AI API Key 未配置，旧 AI 路由不会执行', 503);
  }

  const response = await fetch(`${CODING_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CODING_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: body.model || CODING_MODEL,
      messages: body.messages,
      temperature: body.temperature ?? 0.2,
      max_tokens: body.max_tokens ?? 1200,
      ...(body.response_format && { response_format: body.response_format }),
    }),
  });

  const data = await response.json() as any;

  if (!response.ok) {
    const msg = data.error?.message || data.message || 'AI 推理失败';
    throw new AppError('AI_GENERATION_ERROR', msg, 502);
  }

  return data.choices?.[0]?.message?.content as string || '';
}

router.use((_req, _res, next) => {
  if (!LEGACY_AI_ROUTES_ENABLED) {
    return next(new AppError('LEGACY_AI_DISABLED', '旧 AI 生成接口默认关闭，请使用 AI 基础任务骨架', 503));
  }
  return next();
});

// ===== 战斗结算推理 =====
// 输入：行动 + 双方状态 + 环境 → 输出：命中/伤害/效果 JSON
router.post('/:roomId/ai/combat-resolve', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const {
      action,           // { type: 'attack'|'dodge'|'spell', skillName, skillValue, weaponDamage }
      actorState,       // { name, hp, maxHp, dex, str, con, armor, weapon }
      targetState,      // { name, hp, maxHp, dex, armor }
      environment,      // { lighting, terrain, weather }
    } = req.body;

    const systemPrompt = `你是 TRPG 战斗裁判。严格按 COC 7e 规则计算命中、伤害、状态效果。只输出 JSON，不要任何解释文本。

JSON 格式：
{
  "hitRoll": number,       // D100 掷骰结果（1-100）
  "hitSuccess": boolean,
  "hitLevel": string,      // "CRITICAL_SUCCESS" | "HARD_SUCCESS" | "SUCCESS" | "FAILURE" | "FUMBLE"
  "damageRoll": string,    // 如 "3D6+2=14"
  "damage": number,        // 实际伤害值
  "finalDamage": number,   // 扣除护甲后的最终伤害
  "targetHpAfter": number,
  "effects": [             // 附加效果
    { "type": "STUNNED"|"BLEEDING"|"BROKEN_LIMB"|"DEAD", "duration": number, "description": string }
  ],
  "flavorText": string     // 战斗描写文本
}`;

    const userPrompt = `战斗行动结算：

**行动者**：${actorState?.name || '?'}
- HP: ${actorState?.hp}/${actorState?.maxHp}
- DEX: ${actorState?.dex || 50}
- 武器: ${actorState?.weapon || '徒手'}
- 护甲: ${actorState?.armor || '无'}

**行动**：${action?.type || 'attack'}
- 技能：${action?.skillName || '格斗'} (${action?.skillValue || 50})
- 武器伤害：${action?.weaponDamage || '1D3'}

**目标**：${targetState?.name || '?'}
- HP: ${targetState?.hp}/${targetState?.maxHp}
- DEX: ${targetState?.dex || 50}
- 护甲: ${targetState?.armor || '0'}

**环境**：${environment ? JSON.stringify(environment) : '普通室内'}

请按 COC 7e 规则计算并输出 JSON。`;

    const content = await chatCompletion({
      model: CODING_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    let result: any = {};
    try {
      result = JSON.parse(content);
    } catch {
      // fallback: 尝试从文本中提取 JSON
      const match = content.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    }

    res.json({
      success: true,
      data: {
        result,
        raw: content,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== Log 旁白润色 =====
router.post('/:roomId/ai/log-polish', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { events, gaps, style = 'suspense' } = req.body;

    const styleMap: Record<string, string> = {
      suspense: '悬疑风格：暗示、留白、紧张感',
      action: '动作风格：快节奏、感官冲击、动态描写',
      mystery: '推理风格：细节堆砌、逻辑链条、冷峻客观',
    };

    const systemPrompt = `你是叙事编辑，专门为克苏鲁跑团 Log 填补叙事空白。基于已有事件，在事件间隙之间生成过渡旁白段落。

规则：
1. 文风要与现有 Log 一致
2. 填补的是"事件之间的空白时间"，不是复述已有事件
3. 保持克苏鲁神话的压抑神秘感
4. 每个旁白段落 50-150 字
5. 输出 JSON 数组`;

    const userPrompt = `已有事件（前10条）：
${events?.slice(0, 10).map((e: any, i: number) => `${i + 1}. [${e.eventType}] ${e.characterName || e.userNickname}: ${JSON.stringify(e.payload).slice(0, 80)}`).join('\n') || '暂无'}

需要填补的间隙（${gaps?.length || 0}处）：
${gaps?.map((g: any, i: number) => `${i + 1}. 事件 ${g.fromEventId} → 事件 ${g.toEventId || '末尾'}`).join('\n') || '暂无'}

风格：${styleMap[style] || styleMap.suspense}

请输出 JSON 数组：
[
  { "gapIndex": number, "narration": string }
]`;

    const content = await chatCompletion({
      model: CODING_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });

    let result: any = { narrations: [] };
    try {
      result = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    }

    res.json({
      success: true,
      data: {
        narrations: result.narrations || result,
        style,
        gapCount: gaps?.length || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== 战后报告生成 =====
router.post('/:roomId/ai/combat-report', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { combatSession, actions, participants } = req.body;

    const systemPrompt = `你是 TRPG 战后报告撰写者。基于战斗数据，生成结构化的战后总结报告。

规则：
1. 用客观冷静的语气描述战斗经过
2. 突出关键时刻和转折点
3. 列出每位参与者的表现
4. 统计战斗数据
5. 只输出 JSON`;

    const userPrompt = `战斗数据：
总回合：${combatSession?.roundCount || '?'}
状态：${combatSession?.status || 'ended'}

参与者：
${participants?.map((p: any) => `- ${p.name}: HP ${p.hp}/${p.maxHp}, DEX ${p.dex || 50}`).join('\n') || '未知'}

行动记录（前20条）：
${actions?.slice(0, 20).map((a: any, i: number) => `${i + 1}. ${a.actorName || '?'} ${a.actionType} ${a.targetName || ''} - ${JSON.stringify(a.result).slice(0, 60)}`).join('\n') || '暂无'}

请输出 JSON 战后报告：
{
  "title": string,
  "summary": string,
  "highlights": [ { "round": number, "description": string } ],
  "participantStats": [ { "name": string, "damageDealt": number, "damageTaken": number, "status": string } ],
  "loot": [ { "name": string, "description": string } ],
  "narrativeSummary": string
}`;

    const content = await chatCompletion({
      model: CODING_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });

    let result: any = {};
    try {
      result = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    }

    res.json({
      success: true,
      data: {
        report: result,
        raw: content,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== 线索关联分析 =====
router.post('/:roomId/ai/clue-analysis', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { revealedClues, playerActions } = req.body;

    const systemPrompt = `你是调查分析助手。基于已揭示线索和玩家行动，指出可能的关联、遗漏和调查方向。

规则：
1. 基于已有线索做合理推断，不编造不存在的信息
2. 指出哪些线索可能有关联
3. 提示遗漏的调查方向
4. 只输出 JSON`;

    const userPrompt = `已揭示线索：
${revealedClues?.map((c: any, i: number) => `${i + 1}. ${c.title}: ${c.content?.slice(0, 100) || '无描述'}`).join('\n') || '暂无'}

玩家关键行动：
${playerActions?.slice(0, 10).map((a: any, i: number) => `${i + 1}. [${a.eventType}] ${a.characterName || '?'}: ${JSON.stringify(a.payload).slice(0, 80)}`).join('\n') || '暂无'}

请输出 JSON 分析报告：
{
  "connections": [ { "clueIds": [string], "insight": string, "confidence": "high"|"medium"|"low" } ],
  "missedDirections": [ { "suggestion": string, "reason": string } ],
  "warnings": [ string ],
  "summary": string
}`;

    const content = await chatCompletion({
      model: CODING_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    let result: any = {};
    try {
      result = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    }

    res.json({
      success: true,
      data: {
        analysis: result,
        raw: content,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
