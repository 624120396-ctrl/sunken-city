import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import {
  ensureFishingItemsSeeded,
  getFishingStatus,
  castLine,
  reelIn,
  sellFishingLog,
  getCollection,
  getFishingLogs,
} from './fishing.service';

const router = Router();

// Seed default fishing items on module load
ensureFishingItemsSeeded().catch(() => {});

/**
 * GET /api/fishing/status
 */
router.get('/fishing/status', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const status = await getFishingStatus(req.userId!);
    res.json({ success: true, data: status });
  } catch (err) {
    next(new AppError('FISHING_STATUS_FAILED', (err as Error).message, 400));
  }
});

/**
 * POST /api/fishing/cast
 */
router.post('/fishing/cast', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await castLine(req.userId!);
    res.json({ success: true, data: result });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'DAILY_LIMIT_REACHED') {
      return next(new AppError('DAILY_LIMIT_REACHED', '今日钓鱼次数已用尽', 403));
    }
    next(new AppError('CAST_FAILED', msg, 400));
  }
});

/**
 * POST /api/fishing/reel
 */
router.post('/fishing/reel', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { castId, timestamp } = req.body;
    if (!castId || typeof timestamp !== 'number') {
      return next(new AppError('INVALID_PARAMS', '缺少 castId 或 timestamp', 400));
    }
    const result = await reelIn(req.userId!, castId as string, timestamp as number);
    res.json({ success: true, data: result });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'INVALID_CAST') {
      return next(new AppError('INVALID_CAST', '无效的抛竿记录', 404));
    }
    next(new AppError('REEL_FAILED', msg, 400));
  }
});

/**
 * POST /api/fishing/sell
 */
router.post('/fishing/sell', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { logId } = req.body;
    if (!logId) {
      return next(new AppError('INVALID_PARAMS', '缺少 logId', 400));
    }
    const result = await sellFishingLog(req.userId!, logId as string);
    res.json({ success: true, data: result });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'LOG_NOT_FOUND') {
      return next(new AppError('LOG_NOT_FOUND', '钓物记录不存在', 404));
    }
    if (msg === 'ALREADY_SOLD') {
      return next(new AppError('ALREADY_SOLD', '该钓物已经出售', 400));
    }
    next(new AppError('SELL_FAILED', msg, 400));
  }
});

/**
 * GET /api/fishing/collection
 */
router.get('/fishing/collection', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await getCollection(req.userId!);
    res.json({ success: true, data: result });
  } catch (err) {
    next(new AppError('COLLECTION_FAILED', (err as Error).message, 400));
  }
});

/**
 * GET /api/fishing/logs
 */
router.get('/fishing/logs', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await getFishingLogs(req.userId!, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    next(new AppError('LOGS_FAILED', (err as Error).message, 400));
  }
});

export default router;
