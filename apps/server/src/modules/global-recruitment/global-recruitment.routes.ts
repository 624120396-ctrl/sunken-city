import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  createGlobalRecruitment,
  getGlobalRecruitment,
  listGlobalRecruitments,
  reportGlobalRecruitment,
  respondGlobalRecruitment,
  updateGlobalRecruitment,
  updateGlobalRecruitmentResponse,
} from './global-recruitment.service';

const router = Router();

router.get('/recruitments', authMiddleware, listGlobalRecruitments);
router.post('/recruitments', authMiddleware, createGlobalRecruitment);
router.get('/recruitments/:postId', authMiddleware, getGlobalRecruitment);
router.patch('/recruitments/:postId', authMiddleware, updateGlobalRecruitment);
router.post('/recruitments/:postId/responses', authMiddleware, respondGlobalRecruitment);
router.patch('/recruitments/:postId/responses/:responseId', authMiddleware, updateGlobalRecruitmentResponse);
router.post('/recruitments/:postId/reports', authMiddleware, reportGlobalRecruitment);

export default router;
