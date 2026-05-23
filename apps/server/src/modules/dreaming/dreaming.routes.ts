import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import {
  getDailyStatus,
  drawCandidates,
  selectCard,
  revealDraw,
  deepRevealDraw,
  getCollection,
  getHistory,
  seedDreamCards,
} from './dreaming.service';

const router = Router();

// 自动种子
seedDreamCards().catch(() => null);

router.get('/dream/daily', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const status = await getDailyStatus(userId);
    res.json({ success: true, data: status });
  } catch (e: any) {
    next(new AppError('DREAM_ERROR', e.message, 400));
  }
});

router.post('/dream/draw', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const data = await drawCandidates(userId);
    res.json({ success: true, data });
  } catch (e: any) {
    next(new AppError('DREAM_ERROR', e.message, 400));
  }
});

router.post('/dream/select', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { cardKey } = req.body as { cardKey?: string };
    if (!cardKey || typeof cardKey !== 'string') {
      throw new AppError('INVALID_INPUT', '请选择一张牌', 400);
    }
    const data = await selectCard(userId, cardKey);
    res.json({ success: true, data });
  } catch (e: any) {
    next(new AppError('DREAM_ERROR', e.message, 400));
  }
});

router.post('/dream/reveal', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { drawId } = req.body as { drawId?: string };
    if (!drawId) {
      throw new AppError('INVALID_INPUT', '缺少记录ID', 400);
    }
    const data = await revealDraw(userId, drawId);
    res.json({ success: true, data });
  } catch (e: any) {
    next(new AppError('DREAM_ERROR', e.message, 400));
  }
});

router.post('/dream/deep-reveal', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { drawId } = req.body as { drawId?: string };
    if (!drawId) {
      throw new AppError('INVALID_INPUT', '缺少记录ID', 400);
    }
    const data = await deepRevealDraw(userId, drawId);
    res.json({ success: true, data });
  } catch (e: any) {
    next(new AppError('DREAM_ERROR', e.message, 400));
  }
});

router.get('/dream/collection', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const data = await getCollection(userId);
    res.json({ success: true, data });
  } catch (e: any) {
    next(new AppError('DREAM_ERROR', e.message, 400));
  }
});

router.get('/dream/history', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const data = await getHistory(userId, limit);
    res.json({ success: true, data });
  } catch (e: any) {
    next(new AppError('DREAM_ERROR', e.message, 400));
  }
});

export default router;
