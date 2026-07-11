import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  createRoomAnnouncement,
  deleteRoomAnnouncement,
  getRoomCoordination,
  saveMyAttendance,
  saveRoomNextSession,
} from './room-coordination.service';
import {
  cancelRoomSchedulePoll,
  closeRoomSchedulePoll,
  createRoomSchedulePoll,
  downloadRoomNextSessionCalendar,
  finalizeRoomSchedulePoll,
  getRoomSchedulePolls,
  remindRoomSchedulePollPendingMembers,
  saveRoomScheduleVotes,
  updateRoomSchedulePoll,
} from './room-schedule-poll.service';

const router = Router();

router.get('/:roomId/coordination', authMiddleware, getRoomCoordination);
router.put('/:roomId/coordination/next-session', authMiddleware, saveRoomNextSession);
router.patch('/:roomId/coordination/next-session', authMiddleware, saveRoomNextSession);
router.put('/:roomId/coordination/my-attendance', authMiddleware, saveMyAttendance);
router.post('/:roomId/coordination/announcements', authMiddleware, createRoomAnnouncement);
router.delete('/:roomId/coordination/announcements/:announcementId', authMiddleware, deleteRoomAnnouncement);
router.get('/:roomId/coordination/schedule-polls', authMiddleware, getRoomSchedulePolls);
router.post('/:roomId/coordination/schedule-polls', authMiddleware, createRoomSchedulePoll);
router.put('/:roomId/coordination/schedule-polls/:pollId', authMiddleware, updateRoomSchedulePoll);
router.put('/:roomId/coordination/schedule-polls/:pollId/my-votes', authMiddleware, saveRoomScheduleVotes);
router.post('/:roomId/coordination/schedule-polls/:pollId/close', authMiddleware, closeRoomSchedulePoll);
router.post('/:roomId/coordination/schedule-polls/:pollId/cancel', authMiddleware, cancelRoomSchedulePoll);
router.post('/:roomId/coordination/schedule-polls/:pollId/finalize', authMiddleware, finalizeRoomSchedulePoll);
router.post('/:roomId/coordination/schedule-polls/:pollId/remind-pending', authMiddleware, remindRoomSchedulePollPendingMembers);
router.get('/:roomId/coordination/next-session.ics', authMiddleware, downloadRoomNextSessionCalendar);

export default router;
