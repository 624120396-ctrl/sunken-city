import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { generateImage } from '../../utils/image-gateway';
import { saveImageFromUrl } from '../../utils/image-downloader';

const router = Router();

const ENDPOINT_ID = process.env.SEEDREAM_ENDPOINT_ID || '';

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

    if (!ENDPOINT_ID) {
      throw new AppError('CONFIG_ERROR', 'AI 生成服务未配置端点 ID', 500);
    }

    const results = await generateImage({
      endpointId: ENDPOINT_ID,
      prompt: prompt.trim(),
      size,
      n: 1,
    });

    const imageUrl = results[0]?.url;
    const imageSize = results[0]?.size as string | undefined;

    if (!imageUrl) {
      throw new AppError('AI_GENERATION_ERROR', '未获取到生成结果', 502);
    }

    // 下载图片到本地并返回本地 URL
    const localUrl = await saveImageFromUrl(imageUrl, 'ai-generated');
    if (!localUrl) {
      throw new AppError('AI_GENERATION_ERROR', '图片保存失败', 500);
    }

    res.json({
      success: true,
      data: { url: localUrl, size: imageSize || size },
    });
  } catch (error: any) {
    if (error?.message?.includes('Missing ARK_IMAGE_API_KEY')) {
      next(new AppError('CONFIG_ERROR', 'AI 生成服务未配置 API Key', 500));
      return;
    }
    next(error);
  }
});

export default router;
