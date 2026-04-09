import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { generateImage } from '../../utils/image-gateway';
import { saveImageFromUrl } from '../../utils/image-downloader';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

const ENDPOINT_ID = process.env.SEEDREAM_ENDPOINT_ID || '';
const PORTRAIT_MAX_COUNT = 5;
const PORTRAIT_COOLDOWN_HOURS = 24;

// 角色卡自动 prompt
function buildCharacterPrompt(
  character: {
    name: string;
    age: number;
    gender?: string | null;
    occupation: string;
    background?: string | null;
  },
  customDesc?: string
): string {
  const genderEn = character.gender === '女' ? 'A female' : 'A male';
  const prompt = `
    ${genderEn} investigator in his/her ${character.age}s,
    profession: ${character.occupation},
    dark fantasy style, mysterious atmosphere,
    1920s vintage clothing, subtle occult elements in background,
    detailed anime portrait, cinematic lighting, muted colors,
    single character in center, clean face, no text, no watermark
    ${customDesc ? `, ${customDesc}` : ''}
    ${character.background ? `, character background: ${character.background}` : ''}
  `.trim();
  return prompt.replace(/\s+/g, ' ');
}

// 检查冷却时间
function isInCooldown(generatedAt: Date | null): boolean {
  if (!generatedAt) return false;
  const now = new Date().getTime();
  const last = new Date(generatedAt).getTime();
  return now - last < PORTRAIT_COOLDOWN_HOURS * 60 * 60 * 1000;
}

/**
 * POST /api/characters/:id/portrait/preview
 * 预览生成形象（消耗次数）
 */
router.post('/characters/:id/portrait/preview', authMiddleware, async (req, res, next) => {
  try {
    const characterId = req.params.id;
    const userId = (req as any).user?.userId;
    const isAdmin = (req as any).user?.isAdmin === true;

    const { customDesc } = req.body as { customDesc?: string };

    if (!ENDPOINT_ID) {
      throw new AppError('CONFIG_ERROR', 'AI 形象生成服务未配置端点 ID', 500);
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new AppError('NOT_FOUND', '角色卡不存在', 404);
    }

    if (character.userId !== userId && !isAdmin) {
      throw new AppError('FORBIDDEN', '无权操作该角色卡', 403);
    }

    // 管理员不受限制，但也 increment 做记录
    if (!isAdmin) {
      const cooldownBoundary = new Date(
        Date.now() - PORTRAIT_COOLDOWN_HOURS * 60 * 60 * 1000
      );
      const updated = await prisma.character.updateMany({
        where: {
          id: characterId,
          portraitGeneratedCount: { lt: PORTRAIT_MAX_COUNT },
          OR: [
            { portraitGeneratedAt: null },
            { portraitGeneratedAt: { lt: cooldownBoundary } },
          ],
        },
        data: {
          portraitGeneratedCount: { increment: 1 },
          portraitGeneratedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        if (character.portraitGeneratedCount >= PORTRAIT_MAX_COUNT) {
          throw new AppError(
            'QUOTA_EXCEEDED',
            `该角色卡的形象生成次数已用完（上限 ${PORTRAIT_MAX_COUNT} 次）`,
            429
          );
        }
        const nextTime = new Date(
          new Date(character.portraitGeneratedAt!).getTime() +
            PORTRAIT_COOLDOWN_HOURS * 60 * 60 * 1000
        );
        throw new AppError(
          'COOLDOWN',
          `形象生成冷却中，下次可生成时间为 ${nextTime.toLocaleString('zh-CN')}`,
          429
        );
      }
    } else {
      await prisma.character.update({
        where: { id: characterId },
        data: {
          portraitGeneratedCount: { increment: 1 },
          portraitGeneratedAt: new Date(),
        },
      });
    }

    const prompt = buildCharacterPrompt(character, customDesc);

    const results = await generateImage({
      endpointId: ENDPOINT_ID,
      prompt,
      size: '1920x1920',
      n: 1,
    });

    const imageUrl = results[0]?.url;
    if (!imageUrl) {
      throw new AppError('AI_GENERATION_ERROR', '形象生成失败，未获取到图片', 502);
    }

    // 下载图片到本地并返回本地永久 URL
    const localUrl = await saveImageFromUrl(imageUrl, 'portraits');
    if (!localUrl) {
      throw new AppError('AI_GENERATION_ERROR', '图片保存失败', 500);
    }

    // 写入 previewUrl 供 confirm 严格校验
    await prisma.character.update({
      where: { id: characterId },
      data: { portraitPreviewUrl: localUrl },
    });

    res.json({
      success: true,
      data: {
        characterId,
        previewUrl: localUrl,
        prompt,
        remainingCount: isAdmin
          ? PORTRAIT_MAX_COUNT
          : Math.max(0, PORTRAIT_MAX_COUNT - (character.portraitGeneratedCount + 1)),
      },
    });
  } catch (error: any) {
    if (error?.message?.includes('Missing ARK_IMAGE_API_KEY')) {
      next(new AppError('CONFIG_ERROR', 'AI 形象生成服务未配置 API Key', 500));
      return;
    }
    next(error);
  }
});

/**
 * POST /api/characters/:id/portrait/confirm
 * 确认采用形象
 */
router.post('/characters/:id/portrait/confirm', authMiddleware, async (req, res, next) => {
  try {
    const characterId = req.params.id;
    const userId = (req as any).user?.userId;
    const isAdmin = (req as any).user?.isAdmin === true;
    const { url } = req.body as { url?: string };

    if (!url || typeof url !== 'string') {
      throw new AppError('INVALID_INPUT', '缺少图片 URL', 400);
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new AppError('NOT_FOUND', '角色卡不存在', 404);
    }

    if (character.userId !== userId && !isAdmin) {
      throw new AppError('FORBIDDEN', '无权操作该角色卡', 403);
    }

    // 校验该 URL 是最近一次 preview 生成的（30 分钟内，且与 portraitPreviewUrl 匹配）
    if (!isAdmin) {
      const generatedRecently =
        character.portraitGeneratedAt &&
        new Date().getTime() - new Date(character.portraitGeneratedAt).getTime() < 30 * 60 * 1000;
      if (!generatedRecently) {
        throw new AppError('EXPIRED', '形象预览已过期，请重新生成', 400);
      }
      if (character.portraitPreviewUrl !== url) {
        throw new AppError('INVALID_PREVIEW', '预览图片与最近一次生成不匹配', 400);
      }
    }

    // 校验本地文件确实存在
    const localFilePath = path.join(process.cwd(), 'public', url);
    if (!fs.existsSync(localFilePath)) {
      throw new AppError('NOT_FOUND', '图片文件不存在，请重新生成', 404);
    }

    await prisma.character.update({
      where: { id: characterId },
      data: { portraitUrl: url },
    });

    res.json({
      success: true,
      data: { characterId, portraitUrl: url },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/characters/:id/portrait/quota
 * 查询形象生成配额
 */
router.get('/characters/:id/portrait/quota', authMiddleware, async (req, res, next) => {
  try {
    const characterId = req.params.id;
    const userId = (req as any).user?.userId;
    const isAdmin = (req as any).user?.isAdmin === true;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        userId: true,
        portraitUrl: true,
        portraitGeneratedCount: true,
        portraitGeneratedAt: true,
      },
    });

    if (!character) {
      throw new AppError('NOT_FOUND', '角色卡不存在', 404);
    }

    if (character.userId !== userId && !isAdmin) {
      throw new AppError('FORBIDDEN', '无权操作该角色卡', 403);
    }

    const remainingCount = isAdmin
      ? PORTRAIT_MAX_COUNT
      : Math.max(0, PORTRAIT_MAX_COUNT - character.portraitGeneratedCount);

    const inCooldown = !isAdmin && isInCooldown(character.portraitGeneratedAt);
    const nextAvailableAt = inCooldown && character.portraitGeneratedAt
      ? new Date(
          new Date(character.portraitGeneratedAt).getTime() +
            PORTRAIT_COOLDOWN_HOURS * 60 * 60 * 1000
        ).toISOString()
      : null;

    res.json({
      success: true,
      data: {
        characterId,
        portraitUrl: character.portraitUrl,
        maxCount: PORTRAIT_MAX_COUNT,
        generatedCount: isAdmin ? 0 : character.portraitGeneratedCount,
        remainingCount,
        inCooldown,
        nextAvailableAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
