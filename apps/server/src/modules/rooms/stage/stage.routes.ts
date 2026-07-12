import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../../middleware/auth';
import {
  disableStageForRoom,
  enableStageForRoom,
  getStageAssetProxy,
  getStageSnapshot,
  getStageStatus,
  getStageUserId,
} from './stage.service';

const router = Router();

router.get('/:roomId/stage/status', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = await getStageStatus({
      roomId: req.params.roomId,
      userId: getStageUserId(req),
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/:roomId/stage/channels/:channelId/snapshot', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = await getStageSnapshot({
      roomId: req.params.roomId,
      channelId: req.params.channelId,
      userId: getStageUserId(req),
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/:roomId/stage/enable', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = await enableStageForRoom({
      roomId: req.params.roomId,
      userId: getStageUserId(req),
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/:roomId/stage/disable', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = await disableStageForRoom({
      roomId: req.params.roomId,
      userId: getStageUserId(req),
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/:roomId/stage/assets/:assetId/proxy', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = await getStageAssetProxy({
      roomId: req.params.roomId,
      assetId: req.params.assetId,
      userId: getStageUserId(req),
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
