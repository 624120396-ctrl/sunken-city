/**
 * 腾讯混元 Hunyuan-role 角色扮演网关
 * Base URL: https://tokenhub.tencentmaas.com/v1/chat/completions
 * 模型: hunyuan-role-latest
 *
 * 核心优势：人设贴合、口语化、情感陪伴、剧情推进力强
 * 适用场景：NPC 对话、角色扮演、情感化叙事、剧情分支互动
 */
import { fetchWithResilience } from './fetch-with-resilience';

const HUNYUAN_API_KEY = process.env.HUNYUAN_API_KEY || '';
const HUNYUAN_BASE_URL = 'https://tokenhub.tencentmaas.com/v1/chat/completions';
const HUNYUAN_MODEL = 'hunyuan-role-latest';

export interface HunyuanMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface HunyuanChatOptions {
  messages: HunyuanMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface HunyuanChatResult {
  content: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export async function hunyuanChat(options: HunyuanChatOptions): Promise<HunyuanChatResult> {
  const apiKey = HUNYUAN_API_KEY;
  if (!apiKey) {
    throw new Error('Missing HUNYUAN_API_KEY environment variable');
  }

  const response = await fetchWithResilience(HUNYUAN_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || HUNYUAN_MODEL,
      messages: options.messages,
      temperature: options.temperature ?? 0.75,
      max_tokens: options.maxTokens ?? 2048,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Hunyuan chat error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  const content = data.choices?.[0]?.message?.content || '';
  return { content, usage: data.usage };
}

/**
 * 生成 NPC 回复（人设扮演）
 */
export async function generateNpcDialogue(params: {
  npcName: string;
  npcProfile: string;
  npcMood: string;
  sceneContext: string;
  recentDialogue: string;
  playerMessage: string;
  secret?: string;        // NPC 知道的秘密（可选择性透露）
  goal?: string;          // NPC 当前想要达成的目的
}): Promise<string> {
  const systemPrompt = `你正在沉浸式扮演跑团 NPC：${params.npcName}。
人设：${params.npcProfile}
当前情绪：${params.npcMood}
${params.secret ? `你心底藏着一个秘密：${params.secret}` : ''}
${params.goal ? `你当前想要达成的目的：${params.goal}` : ''}

要求：
1. 以第一人称回应玩家，语言贴合人设，口语化、自然、有情感起伏。
2. 可加入小动作或神态描写（用括号括起来），但主内容必须是对话。
3. 长度 50~200 字，切忌说教或 OOC。
4. 不要解释设定，不要输出“作为 NPC 我会...”，只输出角色说的话。`;

  const userPrompt = `当前场景：${params.sceneContext}

最近对话记录：
${params.recentDialogue}

玩家对你说："${params.playerMessage}"

请回复。`;

  const result = await hunyuanChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    maxTokens: 512,
  });

  return result.content.trim();
}

/**
 * 生成情感化场景描写（偏角色内心/交互）
 */
export async function generateEmotionalSceneDescription(params: {
  scene: string;
  location: string;
  characters: { name: string; emotion: string; action: string }[];
  theme: 'tension' | 'comfort' | 'breakdown' | 'revelation' | 'farewell';
}): Promise<string> {
  const themeMap: Record<string, string> = {
    tension: '紧张对峙，暗流涌动',
    comfort: '短暂慰藉，温情流动',
    breakdown: '情绪崩溃，理智边缘',
    revelation: '真相揭露，震撼冲击',
    farewell: '离别时刻，怅然若失',
  };

  const charLines = params.characters
    .map((c) => `- ${c.name}：${c.emotion}，${c.action}`)
    .join('\n');

  const systemPrompt = `你是一位擅长刻画人物情感与互动的叙述者。
要求：
1. 生成 100~250 字的场景描写，聚焦于角色之间的情绪张力与细微动作。
2. 多用对话、眼神、肢体接触（或刻意的疏离）来推进画面。
3. 不要写成干巴巴的环境说明，要让读者感受到心跳和呼吸。
4. 只返回正文，不要解释。`;

  const userPrompt = `场景：${params.scene}
地点：${params.location}
情感主题：${themeMap[params.theme] || params.theme}

在场角色：
${charLines}`;

  const result = await hunyuanChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.85,
    maxTokens: 1024,
  });

  return result.content.trim();
}

/**
 * 生成角色起源故事（情感向）
 */
export async function generateCharacterOriginStory(params: {
  name: string;
  occupation: string;
  age: number;
  keyStats: { str: number; dex: number; int: number; pow: number; edu: number; app: number };
  backgroundHints: string[];
  tone?: 'tragic' | 'mysterious' | 'hopeful' | 'neutral';
}): Promise<string> {
  const toneMap: Record<string, string> = {
    tragic: '悲剧、宿命的',
    mysterious: '神秘、令人不安的',
    hopeful: '带有微光与希望的',
    neutral: '平淡但真实的',
  };

  const systemPrompt = `你是一位擅长书写角色起源的小说家。
要求：
1. 根据调查员的基本信息，写一段 150~300 字的起源故事。
2. 故事要贴合职业与属性特点（力量高可写体格劳动者，智力高可写学者或推理者，外貌高可写善于社交）。
3. 将背景中的关键词自然融入情节，不要罗列。
4. 基调 ${toneMap[params.tone || 'neutral']}，只返回故事正文。`;

  const userPrompt = `姓名：${params.name}
职业：${params.occupation}
年龄：${params.age}
关键属性：STR ${params.keyStats.str}, DEX ${params.keyStats.dex}, INT ${params.keyStats.int}, POW ${params.keyStats.pow}, EDU ${params.keyStats.edu}, APP ${params.keyStats.app}
背景线索：${params.backgroundHints.join('、')}

请生成起源故事。`;

  const result = await hunyuanChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    maxTokens: 1024,
  });

  return result.content.trim();
}