import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { getRoomListOverview, getRoomOperationsOverview } from './room-overview.service';

const router = Router();

router.get('/overview/list-summary', authMiddleware, getRoomListOverview);
router.get('/:roomId/overview', authMiddleware, getRoomOperationsOverview);

export default router;
