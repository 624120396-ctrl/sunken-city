import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();

// Doubao-Seed 配置（火山引擎）
const LEGACY_AI_ROUTES_ENABLED = process.env.ENABLE_LEGACY_ROOM_AI_ROUTES === 'true';
const DOUBAO_BASE_URL = process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || '';
const DOUBAO_CHARACTER_ENDPOINT = process.env.DOUBAO_CHARACTER_MODEL_ID || 'doubao-seed-character';
const DOUBAO_IMAGE_ENDPOINT = process.env.SEEDREAM_MODEL_ID || 'seedream-4.5';

interface ChatCompletionBody {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}

async function chatCompletion(body: ChatCompletionBody): Promise<string> {
  if (!DOUBAO_API_KEY) {
    throw new AppError('AI_PROVIDER_NOT_CONFIGURED', 'Doubao API Key 未配置，旧 AI 路由不会执行', 503);
  }

  const response = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DOUBAO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: body.model || DOUBAO_CHARACTER_ENDPOINT,
      messages: body.messages,
      temperature: body.temperature ?? 0.75,
      max_tokens: body.max_tokens ?? 800,
      ...(body.response_format && { response_format: body.response_format }),
    }),
  });

  const data = await response.json() as any;

  if (!response.ok) {
    const msg = data.error?.message || data.message || 'AI 生成失败';
    throw new AppError('AI_GENERATION_ERROR', msg, 502);
  }

  return data.choices?.[0]?.message?.content as string || '';
}

router.use('/:roomId/ai', (_req, _res, next) => {
  if (!LEGACY_AI_ROUTES_ENABLED) {
    return next(new AppError('LEGACY_AI_DISABLED', '旧 AI 生成接口默认关闭，请使用 AI 基础任务骨架', 503));
  }
  return next();
});

// ===== 场景旁白生成 =====
router.post('/:roomId/ai/scene-desc', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { keywords, atmosphere, tone = 'dark', length = 'medium' } = req.body;

    const systemPrompt = `你是克苏鲁神话风格的场景描写大师。用压抑、神秘、充满细节感官描写的风格，只输出场景描述文本，不要任何解释、不要JSON。`;

    const lengthMap: Record<string, string> = {
      short: '150字以内',
      medium: '300字左右',
      long: '500字左右',
    };

    const userPrompt = `基于以下关键词生成场景描述：
关键词：${keywords?.join(', ') || '未知'}
氛围：${atmosphere || 'normal'}
基调：${tone}
长度：${lengthMap[length] || lengthMap.medium}

要求：
1. 感官细节丰富（视觉、嗅觉、触觉、听觉）
2. 暗示而非直白描述恐怖元素
3. 保持克苏鲁神话的压抑神秘感
4. 只用中文输出纯文本描述`;

    const content = await chatCompletion({
      model: DOUBAO_CHARACTER_ENDPOINT,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 800,
    });

    res.json({
      success: true,
      data: { description: content.trim(), keywords, atmosphere },
    });
  } catch (error) {
    next(error);
  }
});

// ===== NPC 对话生成 =====
router.post('/:roomId/ai/npc-dialogue', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { npcName, npcDescription, npcPersonality, playerQuestion, sceneContext, mood = 'calm' } = req.body;

    if (!npcName || !playerQuestion) {
      throw new AppError('INVALID_INPUT', '需要 npcName 和 playerQuestion', 400);
    }

    const systemPrompt = `你是 ${npcName}，${npcDescription || '一位神秘的NPC'}。${npcPersonality ? `性格特点：${npcPersonality}` : ''}

规则：
1. 用第一人称回复，保持人格一致性
2. 回复要符合克苏鲁神话的压抑氛围
3. 可以适当隐藏信息或暗示秘密
4. 不要用括号添加动作描述，只输出对话文本
5. 只输出 NPC 说的话，不要解释`;

    const userPrompt = `${sceneContext ? `当前场景：${sceneContext}\n` : ''}玩家提问：「${playerQuestion}」

请以 ${npcName} 的身份回复。当前情绪：${mood}`;

    const content = await chatCompletion({
      model: DOUBAO_CHARACTER_ENDPOINT,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    res.json({
      success: true,
      data: {
        npcName,
        dialogue: content.trim(),
        playerQuestion,
        mood,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== 子房间场景生成 =====
router.post('/:roomId/ai/sub-room-scene', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { parentSceneDesc, purpose, atmosphere } = req.body;

    const systemPrompt = `你是一位克苏鲁神话场景设计师。基于主房间场景，生成子房间的配套场景描述。子房间是主场景的延伸、梦境、回忆或秘密空间。

规则：
1. 风格要与主场景一致但更聚焦
2. 子房间应该有独特的氛围变化（更压抑/更诡异/更温暖等）
3. 包含感官细节
4. 只输出纯文本描述`;

    const userPrompt = `主房间场景：
${parentSceneDesc || '未知'}

子房间用途：${purpose || '秘密空间'}
期望氛围：${atmosphere || '比主场景更压抑'}

请生成一段子房间场景描述（200-300字）。`;

    const content = await chatCompletion({
      model: DOUBAO_CHARACTER_ENDPOINT,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.75,
      max_tokens: 600,
    });

    res.json({
      success: true,
      data: {
        description: content.trim(),
        parentSceneDesc,
        purpose,
        atmosphere,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== 场景图片 prompt 生成（辅助 Seedream） =====
router.post('/:roomId/ai/scene-image-prompt', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { sceneDesc, atmosphere } = req.body;

    const systemPrompt = `你是 AI 绘画提示词工程师。将中文场景描述翻译成高质量的英文 Stable Diffusion 提示词。`;

    const userPrompt = `场景描述：${sceneDesc || ''}
氛围：${atmosphere || 'dark fantasy'}

请生成一段英文 AI 绘画提示词，要求：
1. 包含 art style、lighting、mood 等关键词
2. 适合 1920x1920 场景图
3. 风格：dark fantasy, Lovecraftian, cinematic
4. 只输出提示词文本，不要任何解释`;

    const content = await chatCompletion({
      model: DOUBAO_CHARACTER_ENDPOINT,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 400,
    });

    res.json({
      success: true,
      data: {
        prompt: content.trim(),
        sceneDesc,
        atmosphere,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
