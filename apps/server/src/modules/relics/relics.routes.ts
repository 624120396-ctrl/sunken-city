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
  listActiveTrades,
  createRelicTrade,
  cancelRelicTrade,
  buyRelicTrade,
} from './relics.service';
import { RELIC_REGISTRY, getAllRelics } from './relics.config';
import { prisma } from '../../config/database';

const router = Router();
router.use(authMiddleware);

// GET /api/relics/registry
router.get('/relics/registry', async (req: AuthRequest, res, next) => {
  try {
    res.json({ success: true, data: { relics: Object.values(RELIC_REGISTRY) } });
  } catch (err) {
    next(err);
  }
});

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

// ========== Phase 3: Market ==========

// GET /api/relics/market/listings
router.get('/relics/market/listings', async (req: AuthRequest, res, next) => {
  try {
    const { relicKey, sellerId } = req.query;
    const list = await listActiveTrades({
      relicKey: relicKey as string | undefined,
      sellerId: sellerId as string | undefined,
    });
    res.json({ success: true, data: { listings: list } });
  } catch (err) {
    next(new AppError('MARKET_LIST_FAILED', (err as Error).message, 400));
  }
});

// POST /api/relics/market/listings
router.post('/relics/market/listings', async (req: AuthRequest, res, next) => {
  try {
    const { characterRelicId, price, currency } = req.body;
    const trade = await createRelicTrade(req.userId!, characterRelicId, Number(price), currency);
    res.json({ success: true, data: trade });
  } catch (err) {
    next(new AppError('MARKET_LIST_FAILED', (err as Error).message, 400));
  }
});

// DELETE /api/relics/market/listings/:tradeId  (cancel)
router.delete('/relics/market/listings/:tradeId', async (req: AuthRequest, res, next) => {
  try {
    const { tradeId } = req.params;
    const result = await cancelRelicTrade(req.userId!, tradeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(new AppError('MARKET_CANCEL_FAILED', (err as Error).message, 400));
  }
});

// POST /api/relics/market/listings/:tradeId/buy
router.post('/relics/market/listings/:tradeId/buy', async (req: AuthRequest, res, next) => {
  try {
    const { tradeId } = req.params;
    const { characterId } = req.body;
    const result = await buyRelicTrade(req.userId!, tradeId, characterId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(new AppError('MARKET_BUY_FAILED', (err as Error).message, 400));
  }
});

export default router;
