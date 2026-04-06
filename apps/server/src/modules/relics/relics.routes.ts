import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import {
  bindRelicToCharacter,
  getCharacterRelics,
  getRoomRelics,
  getUserUnboundRelics,
  setRoomRelics,
  validateRelicCarry,
} from './relics.service';

const router = Router();
router.use(authMiddleware);

// GET /api/relics/character/:characterId
router.get('/relics/character/:characterId', async (req: AuthRequest, res, next) => {
  try {
    const { characterId } = req.params;
    const userId = req.userId!;
    const list = await getCharacterRelics(characterId, userId);
    res.json({ success: true, data: { relics: list } });
  } catch (err) {
    next(new AppError('RELIC_FETCH_FAILED', (err as Error).message, 400));
  }
});

// GET /api/relics/unbound
router.get('/relics/unbound', async (req: AuthRequest, res, next) => {
  try {
    const list = await getUserUnboundRelics(req.userId!);
    res.json({ success: true, data: { items: list } });
  } catch (err) {
    next(new AppError('RELIC_FETCH_FAILED', (err as Error).message, 400));
  }
});

// POST /api/relics/bind
router.post('/relics/bind', async (req: AuthRequest, res, next) => {
  try {
    const { inventoryId, characterId } = req.body;
    const relic = await bindRelicToCharacter(req.userId!, inventoryId, characterId);
    res.json({ success: true, data: { relic } });
  } catch (err) {
    next(new AppError('RELIC_BIND_FAILED', (err as Error).message, 400));
  }
});

// POST /api/relics/room/:roomMemberId/carry
router.post('/relics/room/:roomMemberId/carry', async (req: AuthRequest, res, next) => {
  try {
    const { roomMemberId } = req.params;
    const { relicIds } = req.body;
    const result = await setRoomRelics(req.userId!, roomMemberId, relicIds || []);
    res.json({ success: true, data: result });
  } catch (err) {
    next(new AppError('RELIC_CARRY_FAILED', (err as Error).message, 400));
  }
});

// GET /api/relics/room/:roomMemberId/carry
router.get('/relics/room/:roomMemberId/carry', async (req: AuthRequest, res, next) => {
  try {
    const { roomMemberId } = req.params;
    const list = await getRoomRelics(roomMemberId);
    res.json({ success: true, data: { relics: list } });
  } catch (err) {
    next(new AppError('RELIC_FETCH_FAILED', (err as Error).message, 400));
  }
});

// POST /api/relics/room/:roomMemberId/validate
router.post('/relics/room/:roomMemberId/validate', async (req: AuthRequest, res, next) => {
  try {
    const { roomMemberId } = req.params;
    const ids = await validateRelicCarry(roomMemberId);
    res.json({ success: true, data: { valid: true, carriedRelicIds: ids } });
  } catch (err) {
    next(new AppError('RELIC_VALIDATE_FAILED', (err as Error).message, 400));
  }
});

export default router;
