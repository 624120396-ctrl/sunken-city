import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { AppError } from '../../middleware/error';

const router = Router();

// 旧图片生成路由默认关闭，避免基础骨架阶段误触发付费供应商调用。
const LEGACY_AI_ROUTES_ENABLED = process.env.ENABLE_LEGACY_ROOM_AI_ROUTES === 'true';
const API_KEY = process.env.SEEDREAM_API_KEY || process.env.DOUBAO_API_KEY || '';
const BASE_URL = process.env.SEEDREAM_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const MODEL = process.env.SEEDREAM_MODEL_ID || 'seedream-4.5';

interface GenerateImageBody {
  prompt: string;
  size?: string;
}

router.post('/ai/generate-image', authMiddleware, async (req, res, next) => {
  try {
    if (!LEGACY_AI_ROUTES_ENABLED) {
      throw new AppError('LEGACY_AI_DISABLED', '旧 AI 图片生成接口默认关闭，请使用 AI 基础任务骨架', 503);
    }

    const { prompt, size = '1920x1920' } = req.body as GenerateImageBody;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new AppError('INVALID_INPUT', '请输入图片描述', 400);
    }
    if (prompt.length > 600) {
      throw new AppError('INVALID_INPUT', '描述不能超过 600 个字符', 400);
    }

    if (!API_KEY) {
      throw new AppError('AI_PROVIDER_NOT_CONFIGURED', 'Seedream API Key 未配置，旧 AI 路由不会执行', 503);
    }

    const response = await fetch(`${BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt.trim(),
        n: 1,
        size,
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const msg = data.error?.message || data.message || 'AI 生成失败';
      throw new AppError('AI_GENERATION_ERROR', msg, 502);
    }

    const imageUrl = data.data?.[0]?.url as string | undefined;
    const imageSize = data.data?.[0]?.size as string | undefined;

    if (!imageUrl) {
      throw new AppError('AI_GENERATION_ERROR', '未获取到生成结果', 502);
    }

    res.json({
      success: true,
      data: { url: imageUrl, size: imageSize || size },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
