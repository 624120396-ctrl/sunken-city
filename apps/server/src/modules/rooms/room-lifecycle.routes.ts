import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  cancelRoom,
  enterFinishing,
  finalizeRoom,
  pauseRoom,
  resumeRoom,
  startRoom,
} from './room-lifecycle.service';

const router = Router();

router.post('/:roomId/lifecycle/start', authMiddleware, startRoom);
router.post('/:roomId/lifecycle/pause', authMiddleware, pauseRoom);
router.post('/:roomId/lifecycle/resume', authMiddleware, resumeRoom);
router.post('/:roomId/lifecycle/finishing', authMiddleware, enterFinishing);
router.post('/:roomId/lifecycle/finalize', authMiddleware, finalizeRoom);
router.post('/:roomId/lifecycle/cancel', authMiddleware, cancelRoom);

export default router;
