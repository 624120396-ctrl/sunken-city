import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { getRoomOperationsOverview } from './room-overview.service';

const router = Router();

router.get('/:roomId/overview', authMiddleware, getRoomOperationsOverview);

export default router;
