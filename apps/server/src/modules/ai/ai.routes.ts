import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { AppError } from '../../middleware/error';

const router = Router();

// 火山引擎 — Seedream-4.5 图片生成
const API_KEY = '8e36469a-f376-4f3a-b957-2d6a7181473d';
const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const MODEL = 'ep-20260408171908-9s9bs'; // Doubao-Seedream-4.5

interface GenerateImageBody {
  prompt: string;
  size?: string;
}

router.post('/ai/generate-image', authMiddleware, async (req, res, next) => {
  try {
    const { prompt, size = '1920x1920' } = req.body as GenerateImageBody;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new AppError('INVALID_INPUT', '请输入图片描述', 400);
    }
    if (prompt.length > 600) {
      throw new AppError('INVALID_INPUT', '描述不能超过 600 个字符', 400);
    }

    if (!API_KEY) {
      throw new AppError('CONFIG_ERROR', 'AI 生成服务未配置', 500);
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
