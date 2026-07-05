import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  createRoomAnnouncement,
  deleteRoomAnnouncement,
  getRoomCoordination,
  saveMyAttendance,
  saveRoomNextSession,
} from './room-coordination.service';

const router = Router();

router.get('/:roomId/coordination', authMiddleware, getRoomCoordination);
router.put('/:roomId/coordination/next-session', authMiddleware, saveRoomNextSession);
router.patch('/:roomId/coordination/next-session', authMiddleware, saveRoomNextSession);
router.put('/:roomId/coordination/my-attendance', authMiddleware, saveMyAttendance);
router.post('/:roomId/coordination/announcements', authMiddleware, createRoomAnnouncement);
router.delete('/:roomId/coordination/announcements/:announcementId', authMiddleware, deleteRoomAnnouncement);

export default router;
