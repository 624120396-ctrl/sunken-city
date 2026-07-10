import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  createGlobalRecruitment,
  getGlobalRecruitment,
  listGlobalRecruitments,
  listGlobalRecruitmentReports,
  reportGlobalRecruitment,
  reviewGlobalRecruitmentReport,
  respondGlobalRecruitment,
  updateGlobalRecruitment,
  updateGlobalRecruitmentResponse,
} from './global-recruitment.service';
import { adminMiddleware } from '../../middleware/admin';

const router = Router();

router.get('/recruitments', authMiddleware, listGlobalRecruitments);
router.post('/recruitments', authMiddleware, createGlobalRecruitment);
router.get('/recruitments/:postId', authMiddleware, getGlobalRecruitment);
router.patch('/recruitments/:postId', authMiddleware, updateGlobalRecruitment);
router.post('/recruitments/:postId/responses', authMiddleware, respondGlobalRecruitment);
router.patch('/recruitments/:postId/responses/:responseId', authMiddleware, updateGlobalRecruitmentResponse);
router.post('/recruitments/:postId/reports', authMiddleware, reportGlobalRecruitment);
router.get('/admin/recruitments/reports', authMiddleware, adminMiddleware, listGlobalRecruitmentReports);
router.patch('/admin/recruitments/reports/:reportId', authMiddleware, adminMiddleware, reviewGlobalRecruitmentReport);

export default router;
