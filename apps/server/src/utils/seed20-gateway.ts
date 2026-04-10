/**
 * 豆包 Doubao-Seed-2.0-pro 旗舰级通用模型网关
 * Base URL: https://ark.cn-beijing.volces.com/api/v3
 * Endpoint ID: ep-20260408223517-qsq95
 *
 * 核心定位：复杂推理、长上下文理解、结构化生成、多步规划
 * 适用场景：AI KP 助手、战役总结、复杂规则裁决、长链路任务执行
 */
import { fetchWithResilience } from './fetch-with-resilience';

const SEED20_API_KEY = process.env.SEED20_API_KEY || process.env.ARK_API_KEY || '';
const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const SEED20_ENDPOINT_ID = 'ep-20260408223517-qsq95';

export interface Seed20Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Seed20ChatOptions {
  messages: Seed20Message[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'text' | 'json_object' };
}

export interface Seed20ChatResult {
  content: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export async function seed20Chat(options: Seed20ChatOptions): Promise<Seed20ChatResult> {
  const apiKey = SEED20_API_KEY;
  if (!apiKey) {
    throw new Error('Missing SEED20_API_KEY or ARK_API_KEY environment variable');
  }

  const response = await fetchWithResilience(`${ARK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: SEED20_ENDPOINT_ID,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4096,
      stream: false,
      ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Seed20 chat error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  const content = data.choices?.[0]?.message?.content || '';
  return { content, usage: data.usage };
}

/**
 * AI KP 助手：分析当前局势并给出结构化建议
 */
export async function kpAssistant(params: {
  sceneName: string;
  sceneDesc: string;
  recentLogs: string;
  characters: { name: string; occupation: string; keySkills: string; currentHp: number; currentSan: number }[];
  playerAction: string;
}): Promise<{
  situationAnalysis: string;
  ruleSuggestion: string;
  plotBranches: { trigger: string; outcome: string }[];
  sanCheck?: { target: string; loss: string; reason: string };
  atmosphereText: string;
}> {
  const systemPrompt = `你是一位资深的克苏鲁跑团（COC7）守秘人（KP）顾问，擅长在复杂局势下快速分析场面、调用规则、推进剧情。
要求：
1. 根据提供的场景、日志、角色卡和玩家行动，输出结构化的 KP 建议。
2. 规则建议必须精确到 COC7 的检定类型、难度、对抗方式或可选规则。
3. 剧情分支至少给出 3 条，分别对应成功/失败/极端结果。
4. 如果场景涉及恐怖、诡异、不可名状之物，必须提议合适的 SAN Check（目标、损失、理由）。
5. 最后附上一段 50~100 字的氛围描述，供 KP 朗读或发送。
6. 输出必须严格是 JSON 格式，不要任何额外说明。`;

  const characterLines = params.characters
    .map((c) => `- ${c.name}（${c.occupation}），关键技能：${c.keySkills}，HP ${c.currentHp}，SAN ${c.currentSan}`)
    .join('\n');

  const userPrompt = `当前场景：${params.sceneName}
场景描述：${params.sceneDesc}

在场调查员：
${characterLines}

最近房间日志（精简）：
${params.recentLogs.slice(0, 4000)}

玩家刚刚的行动：${params.playerAction}

请输出 JSON：
{
  "situationAnalysis": "...",
  "ruleSuggestion": "...",
  "plotBranches": [
    { "trigger": "...", "outcome": "..." }
  ],
  "sanCheck": { "target": "...", "loss": "...", "reason": "..." },
  "atmosphereText": "..."
}`;

  const result = await seed20Chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    maxTokens: 2048,
  });

  try {
    const cleaned = result.content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned);
    return {
      situationAnalysis: parsed.situationAnalysis || '',
      ruleSuggestion: parsed.ruleSuggestion || '',
      plotBranches: Array.isArray(parsed.plotBranches) ? parsed.plotBranches : [],
      sanCheck: parsed.sanCheck || undefined,
      atmosphereText: parsed.atmosphereText || '',
    };
  } catch (e) {
    return {
      situationAnalysis: result.content.trim(),
      ruleSuggestion: '',
      plotBranches: [],
      atmosphereText: '',
    };
  }
}

/**
 * Session 全自动结构化总结
 */
export async function summarizeFullSession(params: {
  sessionTitle: string;
  fullLogs: string;
  characters: { name: string; occupation: string }[];
}): Promise<{
  summary: string;
  timeline: { phase: string; events: string[] }[];
  characterArcs: { name: string; actions: string; stateChanges: string }[];
  cluesRecovered: string[];
  looseEnds: string[];
  nextSceneHint: string;
  pendingRules: string[];
}> {
  const systemPrompt = `你是一位克苏鲁跑团战役记录员与分析师。请根据完整的房间日志生成深度结构化总结。
要求：
1. 剧情时间线按「幕/章节」组织，不要按分钟罗列。
2. 每个调查员要有独立的「角色弧线」总结。
3. 线索分为「已回收」和「未回收（伏笔）」。
4. 列出所有尚未完成的规则结算（如待投 SAN、待领成长、待判定疯狂后遗症等）。
5. 输出必须严格是 JSON 格式，不要任何额外说明。`;

  const charsLine = params.characters.map((c) => `- ${c.name}（${c.occupation}）`).join('\n');

  const userPrompt = `团名：${params.sessionTitle}
调查员：
${charsLine}

完整日志（已截断到可用长度）：
${params.fullLogs.slice(0, 12000)}

请输出 JSON：
{
  "summary": "用 3-5 句话概括整场核心剧情",
  "timeline": [
    { "phase": "第一幕：...", "events": ["..."] }
  ],
  "characterArcs": [
    { "name": "...", "actions": "...", "stateChanges": "..." }
  ],
  "cluesRecovered": ["..."],
  "looseEnds": ["..."],
  "nextSceneHint": "...",
  "pendingRules": ["..."]
}`;

  const result = await seed20Chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 4096,
  });

  try {
    const cleaned = result.content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary || '',
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
      characterArcs: Array.isArray(parsed.characterArcs) ? parsed.characterArcs : [],
      cluesRecovered: Array.isArray(parsed.cluesRecovered) ? parsed.cluesRecovered : [],
      looseEnds: Array.isArray(parsed.looseEnds) ? parsed.looseEnds : [],
      nextSceneHint: parsed.nextSceneHint || '',
      pendingRules: Array.isArray(parsed.pendingRules) ? parsed.pendingRules : [],
    };
  } catch (e) {
    return {
      summary: result.content.trim(),
      timeline: [],
      characterArcs: [],
      cluesRecovered: [],
      looseEnds: [],
      nextSceneHint: '',
      pendingRules: [],
    };
  }
}

/**
 * 复杂规则裁决器（COC7 Edge Case）
 */
export async function judgeComplexRule(params: {
  situation: string;
  involvedCharacters: { name: string; relevantStats: string }[];
  question: string;
}): Promise<{
  ruling: string;
  ruleBasis: string;
  narrativeSuggestion: string;
}> {
  const systemPrompt = `你是一位精通克苏鲁的呼唤第七版（COC7）规则的裁判官。请根据具体情境做出裁决。
要求：
1. 给出明确的裁定结果（ruling）。
2. 列出该裁定的规则依据（ruleBasis），指出规则书中的对应章节或逻辑。
3. 给 KP 提供一段自然、有画面感的叙事建议（narrativeSuggestion）。
4. 输出严格为 JSON 格式。`;

  const charsLine = params.involvedCharacters
    .map((c) => `- ${c.name}：${c.relevantStats}`)
    .join('\n');

  const userPrompt = `情境：${params.situation}
涉及角色：
${charsLine}

问题：${params.question}

请输出 JSON：
{
  "ruling": "...",
  "ruleBasis": "...",
  "narrativeSuggestion": "..."
}`;

  const result = await seed20Chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    maxTokens: 1024,
  });

  try {
    const cleaned = result.content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned);
    return {
      ruling: parsed.ruling || '',
      ruleBasis: parsed.ruleBasis || '',
      narrativeSuggestion: parsed.narrativeSuggestion || '',
    };
  } catch (e) {
    return {
      ruling: result.content.trim(),
      ruleBasis: '',
      narrativeSuggestion: '',
    };
  }
}