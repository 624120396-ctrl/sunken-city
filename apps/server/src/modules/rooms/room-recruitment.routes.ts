import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  cancelRoomInvitation,
  getRoomRecruitment,
  inviteRoomUser,
  joinApprovedRoomApplication,
  reviewRoomJoinApplication,
  respondRoomInvitation,
  saveRoomRecruitmentProfile,
  submitRoomJoinApplication,
  withdrawRoomJoinApplication,
} from './room-recruitment.service';

const router = Router();

router.get('/:roomId/recruitment', authMiddleware, getRoomRecruitment);
router.put('/:roomId/recruitment/profile', authMiddleware, saveRoomRecruitmentProfile);
router.patch('/:roomId/recruitment/profile', authMiddleware, saveRoomRecruitmentProfile);
router.post('/:roomId/recruitment/applications', authMiddleware, submitRoomJoinApplication);
router.patch('/:roomId/recruitment/applications/:applicationId', authMiddleware, reviewRoomJoinApplication);
router.post('/:roomId/recruitment/applications/:applicationId/withdraw', authMiddleware, withdrawRoomJoinApplication);
router.post('/:roomId/recruitment/applications/:applicationId/join', authMiddleware, joinApprovedRoomApplication);
router.post('/:roomId/recruitment/invitations', authMiddleware, inviteRoomUser);
router.post('/:roomId/recruitment/invitations/:invitationId/cancel', authMiddleware, cancelRoomInvitation);
router.post('/:roomId/recruitment/invitations/:invitationId/respond', authMiddleware, respondRoomInvitation);

export default router;
