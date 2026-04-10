/**
 * Doubao-Seed-Character 叙事/角色扮演网关
 *
 * 面向角色扮演与故事叙事场景定向优化：
 * - 旁白能力增强（长旁白、氛围描写）
 * - 单人/多人剧情编排与场景生成
 * - NPC 虚拟陪伴对话（情感递进、互动自然）
 * - 强格式遵循（稳定输出 JSON / Markdown 结构）
 */
import { fetchWithResilience } from './fetch-with-resilience';

const ARK_CHARACTER_API_KEY = process.env.ARK_CHARACTER_API_KEY || process.env.ARK_API_KEY || '';
const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

export interface CharacterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CharacterChatOptions {
  endpointId: string;
  messages: CharacterChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface CharacterChatResult {
  content: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

async function characterChat(options: CharacterChatOptions): Promise<CharacterChatResult> {
  const apiKey = ARK_CHARACTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ARK_CHARACTER_API_KEY or ARK_API_KEY environment variable');
  }

  const response = await fetchWithResilience(`${ARK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.endpointId,
      messages: options.messages,
      temperature: options.temperature ?? 0.85,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Character chat error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  const content = data.choices?.[0]?.message?.content || '';
  return { content, usage: data.usage };
}

/**
 * 生成场景旁白
 */
export async function generateSceneNarration(
  endpointId: string,
  params: {
    scene: string;      // 当前场景关键词
    location: string;   // 地点
    time: string;       // 时间
    investigators: { name: string; action: string }[];
    mood: 'normal' | 'tense' | 'horror' | 'mystery' | 'madness';
  }
): Promise<string> {
  const moodMap: Record<string, string> = {
    normal: '日常、平静',
    tense: '紧张、压抑',
    horror: '恐怖、绝望',
    mystery: '神秘、悬疑',
    madness: '癫狂、不可名状',
  };

  const investigatorLines = params.investigators
    .map((p) => `- ${p.name}：${p.action}`)
    .join('\n');

  const systemPrompt = `你是一位克苏鲁跑团（COC7）的专业守秘人（KP），擅长用细腻的笔触营造氛围。
要求：
1. 输出一段 100~300 字的场景旁白；
2. 语言要有画面感，善用感官描写（视觉、听觉、嗅觉、触觉）；
3. 不要出现任何对话，只写环境/动作描写；
4. 不要输出任何解释，只返回旁白正文。`;

  const userPrompt = `场景：${params.scene}
地点：${params.location}
时间：${params.time}
氛围：${moodMap[params.mood] || params.mood}
在场调查员：
${investigatorLines}`;

  const result = await characterChat({
    endpointId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.9,
    maxTokens: 1024,
  });

  return result.content.trim();
}

/**
 * 生成 NPC 回复
 */
export async function generateNpcReply(
  endpointId: string,
  params: {
    npcName: string;
    npcProfile: string;        // 人设
    npcMood: string;           // 当前情绪
    sceneContext: string;      // 场景上下文
    recentDialogue: string;    // 最近几条对话
    playerMessage: string;     // 玩家说的话
  }
): Promise<string> {
  const systemPrompt = `你正在扮演一位跑团 NPC：${params.npcName}。
人设：${params.npcProfile}
要求：
1. 以第一人称回应玩家；
2. 语言要符合人设和当前情绪，可以加入小动作或神态描写（用括号括起来）；
3. 回复长度控制在 50~200 字；
4. 不要跳出角色，不要解释设定，只输出 NPC 说的话。`;

  const userPrompt = `当前场景：${params.sceneContext}
${params.npcName} 的当前情绪：${params.npcMood}

最近对话：
${params.recentDialogue}

玩家对 ${params.npcName} 说："${params.playerMessage}"

请回复。`;

  const result = await characterChat({
    endpointId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.85,
    maxTokens: 512,
  });

  return result.content.trim();
}

/**
 * 剧情会话总结
 */
export async function summarizeSessionLore(
  endpointId: string,
  params: {
    sessionTitle: string;
    rawLogs: string;           // 原始房间日志（精简版）
    maxLength?: number;        // 总结最大长度
  }
): Promise<{
  summary: string;
  plotProgress: string;
  characterStates: string;
  looseEnds: string;
  nextSceneHint: string;
}> {
  const systemPrompt = `你是一位克苏鲁跑团战役记录员。请根据提供的房间日志生成结构化总结。
输出必须严格遵循以下 JSON 格式，不要添加任何额外说明：
{
  "summary": "用 3-5 句话概括本场核心剧情",
  "plotProgress": "当前主线推进到什么阶段",
  "characterStates": "主要角色的最新状态与关系变化",
  "looseEnds": "尚未回收的伏笔与待解谜团（列表形式）",
  "nextSceneHint": "为 KP 提供下一场开场的建议"
}`;

  const userPrompt = `团名：${params.sessionTitle}
日志内容（已去噪）：
${params.rawLogs.substring(0, params.maxLength || 8000)}`;

  const result = await characterChat({
    endpointId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 1024,
  });

  try {
    const cleaned = result.content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary || '',
      plotProgress: parsed.plotProgress || '',
      characterStates: parsed.characterStates || '',
      looseEnds: parsed.looseEnds || '',
      nextSceneHint: parsed.nextSceneHint || '',
    };
  } catch (e) {
    // 解析失败时回退为纯文本
    return {
      summary: result.content.trim(),
      plotProgress: '',
      characterStates: '',
      looseEnds: '',
      nextSceneHint: '',
    };
  }
}