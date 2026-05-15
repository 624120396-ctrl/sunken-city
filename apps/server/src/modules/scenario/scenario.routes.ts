import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { scenarioService } from './scenario.service';
import { clueService } from './clue.service';
import { doubtService } from './doubt.service';
import { argumentService } from './argument.service';

const router = Router();

// ========================================
// 剧本基础路由
// ========================================

/**
 * GET /api/scenarios
 * 列出所有已发布剧本
 */
router.get('/scenarios', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const scenarios = await scenarioService.listScenarios();
    res.json({ success: true, data: scenarios });
  } catch (err) {
    next(new AppError('SCENARIO_LIST_FAILED', (err as Error).message, 500));
  }
});

/**
 * GET /api/scenarios/:id
 * 获取剧本详情
 */
router.get('/scenarios/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const scenario = await scenarioService.getScenarioById(req.params.id);
    if (!scenario) {
      return next(new AppError('SCENARIO_NOT_FOUND', '剧本不存在', 404));
    }
    res.json({ success: true, data: scenario });
  } catch (err) {
    next(new AppError('SCENARIO_GET_FAILED', (err as Error).message, 500));
  }
});

/**
 * POST /api/scenarios
 * 创建新剧本
 */
router.post('/scenarios', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const scenario = await scenarioService.createScenario(req.body, req.userId!);
    res.status(201).json({ success: true, data: scenario });
  } catch (err) {
    next(new AppError('SCENARIO_CREATE_FAILED', (err as Error).message, 500));
  }
});

/**
 * PATCH /api/scenarios/:id
 * 更新剧本
 */
router.patch('/scenarios/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const scenario = await scenarioService.updateScenario(req.params.id, req.body);
    res.json({ success: true, data: scenario });
  } catch (err) {
    next(new AppError('SCENARIO_UPDATE_FAILED', (err as Error).message, 500));
  }
});

/**
 * DELETE /api/scenarios/:id
 * 删除剧本
 */
router.delete('/scenarios/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await scenarioService.deleteScenario(req.params.id);
    res.json({ success: true, message: '剧本已删除' });
  } catch (err) {
    next(new AppError('SCENARIO_DELETE_FAILED', (err as Error).message, 500));
  }
});

// ========================================
// 线索 (Clue) 路由
// ========================================

/**
 * GET /api/scenarios/:scenarioId/clues
 * 获取剧本线索列表
 */
router.get(
  '/scenarios/:scenarioId/clues',
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const clues = await clueService.listClues({
        scenarioId: req.params.scenarioId,
      });
      res.json({ success: true, data: clues });
    } catch (err) {
      next(new AppError('CLUE_LIST_FAILED', (err as Error).message, 500));
    }
  }
);

/**
 * GET /api/clues/:id
 * 获取线索详情
 */
router.get('/clues/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const clue = await clueService.getClueById(req.params.id);
    if (!clue) {
      return next(new AppError('CLUE_NOT_FOUND', '线索不存在', 404));
    }
    res.json({ success: true, data: clue });
  } catch (err) {
    next(new AppError('CLUE_GET_FAILED', (err as Error).message, 500));
  }
});

/**
 * POST /api/scenarios/:scenarioId/clues
 * 创建线索
 */
router.post(
  '/scenarios/:scenarioId/clues',
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const clue = await clueService.createClue({
        ...req.body,
        scenarioId: req.params.scenarioId,
      });
      res.json({ success: true, data: clue });
    } catch (err) {
      next(new AppError('CLUE_CREATE_FAILED', (err as Error).message, 500));
    }
  }
);

/**
 * PATCH /api/clues/:id
 * 更新线索
 */
router.patch('/clues/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const clue = await clueService.updateClue({
      ...req.body,
      id: req.params.id,
    });
    res.json({ success: true, data: clue });
  } catch (err) {
    next(new AppError('CLUE_UPDATE_FAILED', (err as Error).message, 500));
  }
});

/**
 * DELETE /api/clues/:id
 * 删除线索
 */
router.delete('/clues/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await clueService.deleteClue(req.params.id);
    res.json({ success: true, message: '线索已删除' });
  } catch (err) {
    next(new AppError('CLUE_DELETE_FAILED', (err as Error).message, 500));
  }
});

// ========================================
// 疑点 (Doubt) 路由
// ========================================

/**
 * GET /api/scenarios/:scenarioId/doubts
 * 获取剧本疑点列表
 */
router.get(
  '/scenarios/:scenarioId/doubts',
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const doubts = await doubtService.listDoubts({
        scenarioId: req.params.scenarioId,
      });
      res.json({ success: true, data: doubts });
    } catch (err) {
      next(new AppError('DOUBT_LIST_FAILED', (err as Error).message, 500));
    }
  }
);

/**
 * GET /api/nodes/:nodeId/doubts
 * 获取节点关联的疑点
 */
router.get(
  '/nodes/:nodeId/doubts',
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const doubts = await doubtService.getDoubtsByNodeId(req.params.nodeId);
      res.json({ success: true, data: doubts });
    } catch (err) {
      next(new AppError('DOUBT_LIST_FAILED', (err as Error).message, 500));
    }
  }
);

/**
 * GET /api/doubts/:id
 * 获取疑点详情
 */
router.get('/doubts/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const doubt = await doubtService.getDoubtById(req.params.id);
    if (!doubt) {
      return next(new AppError('DOUBT_NOT_FOUND', '疑点不存在', 404));
    }
    res.json({ success: true, data: doubt });
  } catch (err) {
    next(new AppError('DOUBT_GET_FAILED', (err as Error).message, 500));
  }
});

/**
 * POST /api/scenarios/:scenarioId/doubts
 * 创建疑点
 */
router.post(
  '/scenarios/:scenarioId/doubts',
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const doubt = await doubtService.createDoubt({
        ...req.body,
        scenarioId: req.params.scenarioId,
      });
      res.json({ success: true, data: doubt });
    } catch (err) {
      next(new AppError('DOUBT_CREATE_FAILED', (err as Error).message, 500));
    }
  }
);

/**
 * PATCH /api/doubts/:id
 * 更新疑点
 */
router.patch('/doubts/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const doubt = await doubtService.updateDoubt({
      ...req.body,
      id: req.params.id,
    });
    res.json({ success: true, data: doubt });
  } catch (err) {
    next(new AppError('DOUBT_UPDATE_FAILED', (err as Error).message, 500));
  }
});

/**
 * DELETE /api/doubts/:id
 * 删除疑点
 */
router.delete('/doubts/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await doubtService.deleteDoubt(req.params.id);
    res.json({ success: true, message: '疑点已删除' });
  } catch (err) {
    next(new AppError('DOUBT_DELETE_FAILED', (err as Error).message, 500));
  }
});

// ========================================
// 论证 (Argument) 路由
// ========================================

/**
 * POST /api/sessions/:sessionId/arguments
 * 提交论证
 */
router.post(
  '/sessions/:sessionId/arguments',
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const result = await argumentService.submitArgument(req.params.sessionId, {
        doubtId: req.body.doubtId,
        selectedClueIds: req.body.selectedClueIds,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(new AppError('ARGUMENT_SUBMIT_FAILED', (err as Error).message, 500));
    }
  }
);

/**
 * GET /api/sessions/:sessionId/arguments
 * 获取会话论证历史
 */
router.get(
  '/sessions/:sessionId/arguments',
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const history = await argumentService.getArgumentHistory(
        req.params.sessionId
      );
      res.json({ success: true, data: history });
    } catch (err) {
      next(new AppError('ARGUMENT_HISTORY_FAILED', (err as Error).message, 500));
    }
  }
);

/**
 * GET /api/doubts/:doubtId/statistics
 * 获取疑点统计
 */
router.get(
  '/doubts/:doubtId/statistics',
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const stats = await argumentService.getDoubtStatistics(req.params.doubtId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(
        new AppError('ARGUMENT_STATISTICS_FAILED', (err as Error).message, 500)
      );
    }
  }
);

/**
 * GET /api/sessions/:sessionId/doubts/:doubtId/completed
 * 检查玩家是否已完成某疑点
 */
router.get(
  '/sessions/:sessionId/doubts/:doubtId/completed',
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const completed = await argumentService.hasCompletedDoubt(
        req.params.sessionId,
        req.params.doubtId
      );
      res.json({ success: true, data: { completed } });
    } catch (err) {
      next(
        new AppError('ARGUMENT_CHECK_FAILED', (err as Error).message, 500)
      );
    }
  }
);

export default router;
