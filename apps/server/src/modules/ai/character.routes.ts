import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import {
  generateSceneNarration,
  generateNpcReply,
  summarizeSessionLore,
} from '../../utils/character-gateway';

const router = Router();

const ENDPOINT_ID = process.env.CHARACTER_ENDPOINT_ID || '';

/**
 * POST /api/rooms/:id/narrate
 * 生成场景旁白
 */
router.post('/rooms/:id/narrate', authMiddleware, async (req, res, next) => {
  try {
    const roomId = req.params.id;
    const {
      scene,
      location,
      time,
      investigators,
      mood,
    } = req.body as {
      scene?: string;
      location?: string;
      time?: string;
      investigators?: { name: string; action: string }[];
      mood?: 'normal' | 'tense' | 'horror' | 'mystery' | 'madness';
    };

    if (!scene || !location || !time) {
      throw new AppError('INVALID_INPUT', '缺少 scene / location / time 参数', 400);
    }
    if (!ENDPOINT_ID) {
      throw new AppError('CONFIG_ERROR', 'Character 模型未配置端点 ID', 500);
    }

    const narration = await generateSceneNarration(ENDPOINT_ID, {
      scene,
      location,
      time,
      investigators: Array.isArray(investigators) ? investigators : [],
      mood: mood || 'normal',
    });

    res.json({
      success: true,
      data: { roomId, narration },
    });
  } catch (error: any) {
    if (error?.message?.includes('Missing')) {
      next(new AppError('CONFIG_ERROR', 'AI 服务未配置 API Key', 500));
      return;
    }
    next(error);
  }
});

/**
 * POST /api/rooms/:id/npc-reply
 * NPC 自动回复
 */
router.post('/rooms/:id/npc-reply', authMiddleware, async (req, res, next) => {
  try {
    const roomId = req.params.id;
    const {
      npcName,
      npcProfile,
      npcMood,
      sceneContext,
      recentDialogue,
      playerMessage,
    } = req.body as {
      npcName?: string;
      npcProfile?: string;
      npcMood?: string;
      sceneContext?: string;
      recentDialogue?: string;
      playerMessage?: string;
    };

    if (!npcName || !npcProfile || !playerMessage) {
      throw new AppError(
        'INVALID_INPUT',
        '缺少 npcName / npcProfile / playerMessage 参数',
        400
      );
    }
    if (!ENDPOINT_ID) {
      throw new AppError('CONFIG_ERROR', 'Character 模型未配置端点 ID', 500);
    }

    const reply = await generateNpcReply(ENDPOINT_ID, {
      npcName,
      npcProfile,
      npcMood: npcMood || '平静',
      sceneContext: sceneContext || '',
      recentDialogue: recentDialogue || '',
      playerMessage,
    });

    res.json({
      success: true,
      data: { roomId, npcName, reply },
    });
  } catch (error: any) {
    if (error?.message?.includes('Missing')) {
      next(new AppError('CONFIG_ERROR', 'AI 服务未配置 API Key', 500));
      return;
    }
    next(error);
  }
});

/**
 * POST /api/rooms/:id/summarize
 * 剧情会话总结
 */
router.post('/rooms/:id/summarize', authMiddleware, async (req, res, next) => {
  try {
    const roomId = req.params.id;
    const { sessionTitle, rawLogs, maxLength } = req.body as {
      sessionTitle?: string;
      rawLogs?: string;
      maxLength?: number;
    };

    if (!rawLogs) {
      throw new AppError('INVALID_INPUT', '缺少 rawLogs 参数', 400);
    }
    if (!ENDPOINT_ID) {
      throw new AppError('CONFIG_ERROR', 'Character 模型未配置端点 ID', 500);
    }

    const summary = await summarizeSessionLore(ENDPOINT_ID, {
      sessionTitle: sessionTitle || '未命名团',
      rawLogs,
      maxLength,
    });

    res.json({
      success: true,
      data: { roomId, summary },
    });
  } catch (error: any) {
    if (error?.message?.includes('Missing')) {
      next(new AppError('CONFIG_ERROR', 'AI 服务未配置 API Key', 500));
      return;
    }
    next(error);
  }
});

export default router;
