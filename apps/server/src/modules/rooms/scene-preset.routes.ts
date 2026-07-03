import { Router } from 'express';
import { AppError } from '../../middleware/error';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { requireRoomCapability } from './room-auth';

const router = Router();

// 创建场景预设
router.post('/:roomId/presets', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageScene');
    const { name, atmosphere, sceneDesc, sceneImageUrl, sceneMusicUrl, npcSnapshots, clueSnapshots } = req.body;

    const preset = await prisma.scenePreset.create({
      data: {
        roomId: room.id,
        name,
        atmosphere: atmosphere || 'normal',
        sceneDesc,
        sceneImageUrl,
        sceneMusicUrl,
        npcSnapshots: JSON.stringify(npcSnapshots || []),
        clueSnapshots: JSON.stringify(clueSnapshots || []),
      },
    });

    res.status(201).json({ success: true, data: { preset } });
  } catch (error) {
    next(error);
  }
});

// 获取场景预设列表
router.get('/:roomId/presets', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageScene');

    const presets = await prisma.scenePreset.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        presets: presets.map(p => ({
          ...p,
          npcSnapshots: JSON.parse(p.npcSnapshots || '[]'),
          clueSnapshots: JSON.parse(p.clueSnapshots || '[]'),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 应用场景预设
router.post('/:roomId/presets/:presetId/apply', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, presetId } = req.params;
    const { room } = await requireRoomCapability(roomId, req.userId, 'canManageScene');

    const preset = await prisma.scenePreset.findUnique({ where: { id: presetId } });
    if (!preset || preset.roomId !== room.id) {
      throw new AppError('PRESET_NOT_FOUND', '预设不存在', 404);
    }

    // 更新房间场景描述和氛围
    await prisma.room.update({
      where: { id: room.id },
      data: {
        atmosphere: preset.atmosphere,
        sceneDesc: preset.sceneDesc,
      },
    });

    // 写入事件日志
    await prisma.roomEventLog.create({
      data: {
        roomId: room.id,
        eventType: 'SCENE_CHANGE',
        payload: JSON.stringify({
          action: '应用场景预设',
          presetName: preset.name,
          atmosphere: preset.atmosphere,
        }),
      },
    });

    res.json({
      success: true,
      data: {
        message: `已应用预设「${preset.name}」`,
        applied: {
          atmosphere: preset.atmosphere,
          sceneDesc: preset.sceneDesc,
          sceneImageUrl: preset.sceneImageUrl,
          sceneMusicUrl: preset.sceneMusicUrl,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// 删除场景预设
router.delete('/:roomId/presets/:presetId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId, presetId } = req.params;
    await requireRoomCapability(roomId, req.userId, 'canManageScene');

    await prisma.scenePreset.delete({ where: { id: presetId } });
    res.json({ success: true, message: '预设已删除' });
  } catch (error) {
    next(error);
  }
});

export default router;
