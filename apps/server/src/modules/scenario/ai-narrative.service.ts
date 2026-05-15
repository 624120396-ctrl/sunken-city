import { prisma } from '../../config/database';
import { characterChat } from '../../utils/character-gateway';
import { hunyuanChat } from '../../utils/hunyuan-gateway';
import crypto from 'crypto';
import type { ScenarioNode } from '@prisma/client';

const DOUBAO_ENDPOINT = process.env.DOUBAO_ENDPOINT || '';

interface NodeMetadata {
  stageDirection?: string;
  clues?: string[];
  npcs?: Array<{
    name: string;
    profile: string;
    mood: string;
    secret?: string;
    goal?: string;
    dialogueRounds?: Array<{
      playerOptions: string[];
      npcReplies: string[];
    }>;
  }>;
}

function parseMetadata(node: ScenarioNode): NodeMetadata {
  if (!node.metadata) return {};
  try {
    return typeof node.metadata === 'string'
      ? (JSON.parse(node.metadata) as NodeMetadata)
      : (node.metadata as NodeMetadata);
  } catch {
    return {};
  }
}

function buildCacheKey(globalState: Record<string, unknown>): string {
  const corruption = typeof globalState.corruption === 'number' ? globalState.corruption : 0;
  const clues = Array.isArray(globalState.unlockedClues)
    ? (globalState.unlockedClues as string[]).sort().join(',')
    : '';
  const lastCheck = globalState.lastCheckResult
    ? JSON.stringify(globalState.lastCheckResult)
    : '';
  return `c${corruption}_cl${crypto.createHash('sha256').update(clues + lastCheck).digest('hex').slice(0, 8)}`;
}

function buildPromptHash(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

/**
 * 获取 AI 渲染的节点旁白（带缓存）
 */
export async function getNodeAiNarration(
  sessionId: string,
  node: ScenarioNode,
  globalState: Record<string, unknown>
): Promise<{ text: string; fromCache: boolean }> {
  const metadata = parseMetadata(node);
  const fallback = node.content || '';

  if (!metadata.stageDirection || !DOUBAO_ENDPOINT) {
    return { text: fallback, fromCache: false };
  }

  const cacheKey = buildCacheKey(globalState);
  const promptHash = buildPromptHash(metadata.stageDirection);

  const cached = await prisma.aiNarrativeCache.findUnique({
    where: { sessionId_nodeId_cacheKey: { sessionId, nodeId: node.nodeId, cacheKey } },
  });

  if (cached && cached.promptHash === promptHash) {
    return { text: cached.cachedText || fallback, fromCache: true };
  }

  const corruption = typeof globalState.corruption === 'number' ? globalState.corruption : 0;
  const worldHint = corruption >= 50
    ? '现实正在扭曲，墙壁渗出颜料，空气中有腐臭与颜料混合的味道。'
    : '';

  const systemPrompt = `你是一位克苏鲁跑团（COC7）的专业守秘人（KP），擅长用细腻的笔触营造氛围。
要求：
1. 根据下面的场景提示，输出一段 100~300 字的场景旁白，用于替换或扩写原有描述；
2. 语言要有画面感和悬疑感，善用感官描写；
3. 不要出现任何玩家角色的直接对话，只描述环境与氛围；
4. 不要输出任何解释、标题或 Markdown 标记，只返回旁白正文。`;

  const userPrompt = `场景标题：${node.title}\n场景提示：${metadata.stageDirection}\n${worldHint ? `侵蚀提示：${worldHint}\n` : ''}原有描述：\n${fallback}\n\n请基于以上信息生成一段氛围渲染后的旁白。`;

  try {
    const result = await characterChat({
      endpointId: DOUBAO_ENDPOINT,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
      maxTokens: 1024,
    });

    const text = result.content.trim() || fallback;

    await prisma.aiNarrativeCache.upsert({
      where: { sessionId_nodeId_cacheKey: { sessionId, nodeId: node.nodeId, cacheKey } },
      create: {
        sessionId,
        nodeId: node.nodeId,
        cacheKey,
        promptHash,
        cachedText: text,
      },
      update: {
        promptHash,
        cachedText: text,
        updatedAt: new Date(),
      },
    });

    return { text, fromCache: false };
  } catch (err) {
    console.error('[AiNarrative] Doubao error:', err);
    return { text: fallback, fromCache: false };
  }
}

export interface NpcTalkHistoryItem {
  npcName: string;
  playerChoice: string;
  npcReply: string;
  roundIndex: number;
}

/**
 * 获取 NPC 对话回复
 */
export async function getNpcDialogue(
  sessionId: string,
  node: ScenarioNode,
  npcIndex: number,
  playerChoice: string,
  globalState: Record<string, unknown>
): Promise<{ reply: string; history: NpcTalkHistoryItem[] }> {
  const metadata = parseMetadata(node);
  const npc = metadata.npcs?.[npcIndex];
  if (!npc) {
    return { reply: '……（没有回应）', history: [] };
  }

  const history: NpcTalkHistoryItem[] = Array.isArray(globalState.npcTalkHistory)
    ? (globalState.npcTalkHistory as NpcTalkHistoryItem[])
    : [];

  const roundIndex = history.filter((h) => h.npcName === npc.name).length;

  // P0 极简内嵌对话：如果有预设回复且玩家在选项内，直接走预设
  const presetRound = npc.dialogueRounds?.[roundIndex];
  const optionIndex = presetRound?.playerOptions.indexOf(playerChoice);
  if (presetRound && optionIndex !== undefined && optionIndex >= 0) {
    const reply = presetRound.npcReplies[optionIndex] || '……';
    const newItem: NpcTalkHistoryItem = { npcName: npc.name, playerChoice, npcReply: reply, roundIndex };
    return { reply, history: [...history, newItem] };
  }

  // 否则调用 Hunyuan-role 生成
  const recentDialogue = history
    .filter((h) => h.npcName === npc.name)
    .slice(-3)
    .map((h) => `玩家：${h.playerChoice}\n${npc.name}：${h.npcReply}`)
    .join('\n\n');

  const systemPrompt = `你正在沉浸式扮演跑团 NPC：${npc.name}。\n人设：${npc.profile}\n当前情绪：${npc.mood}\n${npc.secret ? `你心底藏着一个秘密：${npc.secret}\n` : ''}${npc.goal ? `你当前想要达成的目的：${npc.goal}\n` : ''}\n要求：\n1. 以第一人称回应玩家，贴合人设；\n2. 可加入小动作神态（括号括起），主内容为对话；\n3. 50~200 字；\n4. 不要解释设定，只输出角色说的话。`;

  const userPrompt = `场景：${node.title}\n${recentDialogue ? `最近对话：\n${recentDialogue}\n\n` : ''}玩家对你说："${playerChoice}"\n请回复。`;

  try {
    const result = await hunyuanChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      maxTokens: 512,
    });

    const reply = result.content.trim() || '……';
    const newItem: NpcTalkHistoryItem = { npcName: npc.name, playerChoice, npcReply: reply, roundIndex };
    return { reply, history: [...history, newItem] };
  } catch (err) {
    console.error('[AiNarrative] Hunyuan error:', err);
    const fallbackReply = presetRound?.npcReplies[0] || '……（沉默）';
    const newItem: NpcTalkHistoryItem = { npcName: npc.name, playerChoice, npcReply: fallbackReply, roundIndex };
    return { reply: fallbackReply, history: [...history, newItem] };
  }
}
