import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/admin';
import { prisma } from '../../config/database';
import { getRelicEffect, MAX_VAULT_SIZE } from './relics.config';

const router = Router();

router.use(authMiddleware, adminMiddleware);

// GET /api/admin/relics
router.get('/relics', async (req: AuthRequest, res, next) => {
  try {
    const {
      page = '1',
      limit = '50',
      userId,
      characterId,
      relicKey,
      search,
    } = req.query;

    const where: any = {};
    if (userId) where.userId = userId as string;
    if (characterId) where.characterId = characterId as string;
    if (relicKey) where.relicKey = relicKey as string;
    if (search) {
      const users = await prisma.user.findMany({
        where: { nickname: { contains: search as string } },
        select: { id: true },
      });
      const chars = await prisma.character.findMany({
        where: { name: { contains: search as string } },
        select: { id: true },
      });
      where.OR = [
        { userId: { in: users.map((u) => u.id) } },
        { characterId: { in: chars.map((c) => c.id) } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [relics, total] = await Promise.all([
      prisma.characterRelic.findMany({
        where,
        orderBy: { acquiredAt: 'desc' },
        skip,
        take,
      }),
      prisma.characterRelic.count({ where }),
    ]);

    const userIds = [...new Set(relics.map((r) => r.userId))];
    const characterIds = [...new Set(relics.map((r) => r.characterId))];
    const [users, characters] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds.length > 0 ? userIds : [''] } },
        select: { id: true, nickname: true },
      }),
      prisma.character.findMany({
        where: { id: { in: characterIds.length > 0 ? characterIds : [''] } },
        select: { id: true, name: true },
      }),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const charMap = new Map(characters.map((c) => [c.id, c]));

    res.json({
      success: true,
      data: {
        relics: relics.map((r) => ({
          ...r,
          meta: getRelicEffect(r.relicKey),
          userNickname: userMap.get(r.userId)?.nickname || '未知',
          characterName: charMap.get(r.characterId)?.name || '未知',
          isOnSale: !!r.tradeLockId,
        })),
        total,
        pagination: {
          page: parseInt(page as string),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/relics/:id
router.delete('/relics/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const relic = await prisma.characterRelic.findUnique({ where: { id } });
    if (!relic) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '遗物不存在' } });
    }

    await prisma.$transaction(async (tx) => {
      if (relic.tradeLockId) {
        const trade = await tx.relicTrade.findUnique({ where: { id: relic.tradeLockId } });
        if (trade && trade.status === 'active') {
          await tx.relicTrade.update({
            where: { id: trade.id },
            data: { status: 'cancelled' },
          });
        }
      }
      await tx.characterRelic.delete({ where: { id } });
    });

    res.json({ success: true, message: '遗物已删除' });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/relics/grant
router.post('/relics/grant', async (req: AuthRequest, res, next) => {
  try {
    const { characterId, relicKey, durability, maxDurability } = req.body;

    if (!characterId || !relicKey) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '缺少角色卡ID或遗物Key' } });
    }

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '角色卡不存在' } });
    }

    const vaultCount = await prisma.characterRelic.count({ where: { characterId } });
    if (vaultCount >= MAX_VAULT_SIZE) {
      return res.status(400).json({ success: false, error: { code: 'VAULT_FULL', message: '角色保险箱已满（最多5件）' } });
    }

    const registry = getRelicEffect(relicKey);
    const created = await prisma.characterRelic.create({
      data: {
        characterId,
        userId: character.userId,
        relicKey,
        source: 'admin_grant',
        durability: durability !== undefined ? parseInt(durability) : (registry?.maxDurability ?? null),
        maxDurability: maxDurability !== undefined ? parseInt(maxDurability) : (registry?.maxDurability ?? null),
      },
    });

    res.json({ success: true, message: '遗物已发放', data: { relic: created } });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/relics/trades
router.get('/relics/trades', async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '50', status, relicKey, sellerId } = req.query;

    const where: any = {};
    if (status) where.status = status as string;
    if (relicKey) where.relicKey = relicKey as string;
    if (sellerId) where.sellerId = sellerId as string;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [trades, total] = await Promise.all([
      prisma.relicTrade.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.relicTrade.count({ where }),
    ]);

    const userIds = [...new Set([...trades.map((t) => t.sellerId), ...trades.filter((t) => t.buyerId).map((t) => t.buyerId!)])];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds.length > 0 ? userIds : [''] } },
      select: { id: true, nickname: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    res.json({
      success: true,
      data: {
        trades: trades.map((t) => ({
          ...t,
          meta: getRelicEffect(t.relicKey),
          sellerName: userMap.get(t.sellerId)?.nickname || '未知',
          buyerName: t.buyerId ? userMap.get(t.buyerId)?.nickname || '未知' : null,
          relicSnapshot: t.relicSnapshot ? JSON.parse(t.relicSnapshot) : null,
        })),
        total,
        pagination: {
          page: parseInt(page as string),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/relics/trades/:tradeId/cancel
router.post('/relics/trades/:tradeId/cancel', async (req: AuthRequest, res, next) => {
  try {
    const { tradeId } = req.params;
    const trade = await prisma.relicTrade.findUnique({ where: { id: tradeId } });
    if (!trade) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '交易不存在' } });
    }
    if (trade.status !== 'active') {
      return res.status(400).json({ success: false, error: { code: 'NOT_ACTIVE', message: '该交易不处于在售状态' } });
    }

    await prisma.$transaction(async (tx) => {
      await tx.relicTrade.update({
        where: { id: tradeId },
        data: { status: 'cancelled' },
      });
      if (trade.sellerCharacterRelicId) {
        await tx.characterRelic.update({
          where: { id: trade.sellerCharacterRelicId },
          data: { tradeLockId: null },
        });
      }
    });

    res.json({ success: true, message: '交易已强制下架' });
  } catch (error) {
    next(error);
  }
});

export default router;
