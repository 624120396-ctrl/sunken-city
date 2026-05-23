import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();

// ===== KP 权限检查中间件 =====
async function requireKP(req: AuthRequest, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { roomId },
    include: { members: true },
  });
  if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

  const member = room.members.find(m => m.userId === req.userId);
  if (!member || member.role !== 'KP') {
    throw new AppError('FORBIDDEN', '只有KP可以操作', 403);
  }
  return room;
}

// ===== 阶段管理 =====

// 创建阶段
router.post('/:roomId/phases', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { title, description, sortOrder } = req.body;
    await requireKP(req, roomId);

    const room = await prisma.room.findUnique({ where: { roomId } });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const phase = await prisma.roomPhase.create({
      data: {
        roomId: room.id,
        title,
        description,
        sortOrder: sortOrder ?? 0,
      },
    });

    res.status(201).json({ success: true, data: { phase } });
  } catch (error) {
    next(error);
  }
});

// 获取阶段列表
router.get('/:roomId/phases', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await prisma.room.findUnique({ where: { roomId } });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const phases = await prisma.roomPhase.findMany({
      where: { roomId: room.id },
      orderBy: { sortOrder: 'asc' },
      include: { scenes: { orderBy: { sortOrder: 'asc' } } },
    });

    res.json({ success: true, data: { phases } });
  } catch (error) {
    next(error);
  }
});

// 更新阶段
router.patch('/:roomId/phases/:phaseId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, phaseId } = req.params;
    await requireKP(req, roomId);

    const { title, description, sortOrder, status } = req.body;
    const phase = await prisma.roomPhase.update({
      where: { id: phaseId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(status && { status }),
        ...(status === 'completed' && { completedAt: new Date() }),
      },
    });

    res.json({ success: true, data: { phase } });
  } catch (error) {
    next(error);
  }
});

// 完成阶段
router.post('/:roomId/phases/:phaseId/complete', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, phaseId } = req.params;
    await requireKP(req, roomId);

    const phase = await prisma.roomPhase.update({
      where: { id: phaseId },
      data: { status: 'completed', completedAt: new Date() },
    });

    res.json({ success: true, data: { phase } });
  } catch (error) {
    next(error);
  }
});

// ===== 场景管理 =====

// 创建场景
router.post('/:roomId/phases/:phaseId/scenes', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, phaseId } = req.params;
    const { title, description, atmosphere, imageUrl, musicUrl, sortOrder } = req.body;
    await requireKP(req, roomId);

    const room = await prisma.room.findUnique({ where: { roomId } });
    if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);

    const scene = await prisma.roomScene.create({
      data: {
        phaseId,
        roomId: room.id,
        title,
        description,
        atmosphere: atmosphere || 'normal',
        imageUrl,
        musicUrl,
        sortOrder: sortOrder ?? 0,
      },
    });

    res.status(201).json({ success: true, data: { scene } });
  } catch (error) {
    next(error);
  }
});

// 获取场景列表
router.get('/:roomId/phases/:phaseId/scenes', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { phaseId } = req.params;
    const scenes = await prisma.roomScene.findMany({
      where: { phaseId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: { scenes } });
  } catch (error) {
    next(error);
  }
});

// 更新场景
router.patch('/:roomId/scenes/:sceneId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, sceneId } = req.params;
    await requireKP(req, roomId);

    const { title, description, atmosphere, imageUrl, musicUrl, sortOrder, status } = req.body;
    const scene = await prisma.roomScene.update({
      where: { id: sceneId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(atmosphere && { atmosphere }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(musicUrl !== undefined && { musicUrl }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(status && { status }),
      },
    });

    res.json({ success: true, data: { scene } });
  } catch (error) {
    next(error);
  }
});

// 激活场景（同时更新房间当前场景）
router.post('/:roomId/scenes/:sceneId/activate', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, sceneId } = req.params;
    const roomRecord = await requireKP(req, roomId);

    const scene = await prisma.roomScene.findUnique({
      where: { id: sceneId },
      include: { phase: true },
    });
    if (!scene) throw new AppError('SCENE_NOT_FOUND', '场景不存在', 404);

    // 更新房间当前阶段和场景
    await prisma.room.update({
      where: { id: roomRecord.id },
      data: {
        currentPhaseId: scene.phaseId,
        currentSceneId: scene.id,
        sceneDesc: scene.description || roomRecord.sceneDesc,
        atmosphere: scene.atmosphere,
      },
    });

    // 将同一阶段的其他场景设为 completed（可选：根据需求可改为不自动完成）
    await prisma.roomScene.updateMany({
      where: { phaseId: scene.phaseId, id: { not: scene.id }, status: 'active' },
      data: { status: 'completed' },
    });

    // 将目标场景设为 active
    await prisma.roomScene.update({
      where: { id: sceneId },
      data: { status: 'active' },
    });

    // 如果阶段不是 active，设为 active
    if (scene.phase.status !== 'active') {
      await prisma.roomPhase.update({
        where: { id: scene.phaseId },
        data: { status: 'active' },
      });
    }

    res.json({
      success: true,
      data: {
        scene,
        phase: scene.phase,
        message: '场景已激活',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
