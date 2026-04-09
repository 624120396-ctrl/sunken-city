import { PrismaClient } from '@prisma/client';
import { RELIC_REGISTRY, MAX_VAULT_SIZE, getRelicEffect } from './relics.config';

const prisma = new PrismaClient();

export async function purchaseRelic(
  userId: string,
  itemKey: string,
  characterId?: string,
  txClient?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
) {
  const db = txClient || prisma;
  const item = await db.shopItem.findUnique({ where: { key: itemKey } });
  if (!item || !item.isActive || item.category !== 'relic') {
    throw new Error('商品不存在或不是遗物');
  }

  const registry = getRelicEffect(itemKey);
  if (!registry) {
    throw new Error('遗物未在注册表中定义');
  }

  const effectData = item.effectData ? JSON.parse(item.effectData) : null;

  if (item.bindOnAcquire) {
    if (!characterId) {
      throw new Error('该遗物购买后立刻绑定，必须指定角色卡');
    }
    const character = await db.character.findFirst({
      where: { id: characterId, userId },
    });
    if (!character) {
      throw new Error('角色卡不存在或不属于你');
    }
    const count = await db.characterRelic.count({ where: { characterId } });
    if (count >= MAX_VAULT_SIZE) {
      throw new Error('角色保险箱已满（最多5件遗物）');
    }
    const relic = await db.characterRelic.create({
      data: {
        characterId,
        userId,
        relicKey: itemKey,
        source: 'shop',
        durability: effectData?.maxDurability ?? registry.maxDurability ?? null,
        maxDurability: effectData?.maxDurability ?? registry.maxDurability ?? null,
      },
    });
    return { bound: true, relic };
  }

  // 非即绑：进入 UserInventory
  const existing = await db.userInventory.findUnique({
    where: { userId_itemKey: { userId, itemKey } },
  });
  if (existing) {
    await db.userInventory.update({
      where: { id: existing.id },
      data: { quantity: { increment: 1 } },
    });
  } else {
    await db.userInventory.create({
      data: { userId, itemKey, quantity: 1 },
    });
  }
  return { bound: false };
}

export async function bindRelicToCharacter(
  userId: string,
  inventoryId: string,
  characterId: string
) {
  const inv = await prisma.userInventory.findFirst({
    where: { id: inventoryId, userId },
    include: { user: true },
  });
  if (!inv) throw new Error('库存记录不存在');

  const item = await prisma.shopItem.findUnique({ where: { key: inv.itemKey } });
  const registry = getRelicEffect(inv.itemKey);
  if ((!item || item.category !== 'relic') && !registry) throw new Error('不是遗物');

  const character = await prisma.character.findFirst({
    where: { id: characterId, userId },
  });
  if (!character) throw new Error('角色卡不存在或不属于你');

  const count = await prisma.characterRelic.count({ where: { characterId } });
  if (count >= MAX_VAULT_SIZE) throw new Error('角色保险箱已满');

  const effectData = item?.effectData ? JSON.parse(item.effectData) : null;

  const relic = await prisma.$transaction(async (tx) => {
    if (inv.quantity <= 1) {
      await tx.userInventory.delete({ where: { id: inv.id } });
    } else {
      await tx.userInventory.update({
        where: { id: inv.id },
        data: { quantity: { decrement: 1 } },
      });
    }
    return tx.characterRelic.create({
      data: {
        characterId,
        userId,
        relicKey: inv.itemKey,
        source: 'shop',
        durability: effectData?.maxDurability ?? registry?.maxDurability ?? null,
        maxDurability: effectData?.maxDurability ?? registry?.maxDurability ?? null,
      },
    });
  });

  return relic;
}

export async function getCharacterRelics(characterId: string, userId?: string) {
  const where: any = { characterId };
  if (userId) where.userId = userId;
  const relics = await prisma.characterRelic.findMany({
    where,
    orderBy: { acquiredAt: 'desc' },
  });
  return relics.map((r) => ({
    ...r,
    meta: getRelicEffect(r.relicKey),
  }));
}

export async function getUserUnboundRelics(userId: string) {
  const inventory = await prisma.userInventory.findMany({
    where: { userId },
    orderBy: { purchasedAt: 'desc' },
  });
  const relicKeys = inventory.map((i) => i.itemKey);
  const items = await prisma.shopItem.findMany({
    where: { key: { in: relicKeys.length > 0 ? relicKeys : [''] }, category: 'relic' },
  });
  const itemMap = new Map(items.map((i) => [i.key, i]));
  return inventory
    .filter((inv) => itemMap.has(inv.itemKey) || getRelicEffect(inv.itemKey))
    .map((inv) => {
      const shopItem = itemMap.get(inv.itemKey);
      const meta = getRelicEffect(inv.itemKey);
      return {
        ...inv,
        item:
          shopItem || meta
            ? {
                key: inv.itemKey,
                name: shopItem?.name || meta?.name || inv.itemKey,
                description: shopItem?.description || meta?.description || '',
                category: 'relic',
                rarity: shopItem?.rarity || meta?.rarity || 'common',
                iconUrl: shopItem?.iconUrl || meta?.iconUrl || null,
              }
            : undefined,
        meta,
      };
    });
}

export async function setRoomRelics(
  userId: string,
  roomMemberId: string,
  relicIds: string[]
) {
  const member = await prisma.roomMember.findFirst({
    where: { id: roomMemberId, userId },
    include: { room: true },
  });
  if (!member) throw new Error('房间成员不存在');
  if (member.room.status === 'PLAYING') {
    throw new Error('游戏已开始，无法更换携带遗物');
  }

  // 校验这些遗物都属于该成员的角色
  const validRelics = await prisma.characterRelic.findMany({
    where: {
      id: { in: relicIds },
      characterId: member.characterId || '',
      userId,
    },
  });
  if (validRelics.length !== relicIds.length) {
    throw new Error('部分遗物不属于当前角色');
  }

  await prisma.roomMember.update({
    where: { id: roomMemberId },
    data: { broughtRelics: JSON.stringify(relicIds) },
  });
  return { broughtRelics: relicIds };
}

export async function getRoomRelics(roomMemberId: string) {
  const member = await prisma.roomMember.findUnique({
    where: { id: roomMemberId },
    select: { broughtRelics: true, characterId: true },
  });
  if (!member) throw new Error('成员不存在');
  const ids: string[] = JSON.parse(member.broughtRelics || '[]');
  if (ids.length === 0) return [];
  const relics = await prisma.characterRelic.findMany({
    where: { id: { in: ids } },
  });
  return relics.map((r) => ({ ...r, meta: getRelicEffect(r.relicKey) }));
}

export async function validateRelicCarry(roomMemberId: string) {
  const member = await prisma.roomMember.findUnique({
    where: { id: roomMemberId },
    select: { broughtRelics: true, joinStatus: true },
  });
  if (!member) throw new Error('成员不存在');
  if (member.joinStatus !== 'approved') {
    throw new Error('成员尚未通过审核，无法携带遗物');
  }
  const ids: string[] = JSON.parse(member.broughtRelics || '[]');
  if (ids.length > 2) {
    throw new Error('每场最多携带2件遗物');
  }
  return ids;
}

// ========== Phase 3: Relic Market ==========

export async function listActiveTrades(filters?: { relicKey?: string; sellerId?: string; buyerId?: string }) {
  const where: any = { status: 'active' };
  if (filters?.relicKey) where.relicKey = filters.relicKey;
  if (filters?.sellerId) where.sellerId = filters.sellerId;
  if (filters?.buyerId) where.buyerId = filters.buyerId;

  const trades = await prisma.relicTrade.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const sellerIds = [...new Set(trades.map((t) => t.sellerId))];
  const sellers = await prisma.user.findMany({
    where: { id: { in: sellerIds.length > 0 ? sellerIds : [''] } },
    select: { id: true, nickname: true },
  });
  const sellerMap = new Map(sellers.map((u) => [u.id, u]));

  return trades.map((t) => ({
    ...t,
    meta: getRelicEffect(t.relicKey),
    sellerName: sellerMap.get(t.sellerId)?.nickname || '未知',
    relicSnapshot: t.relicSnapshot ? JSON.parse(t.relicSnapshot) : null,
  }));
}

export async function createRelicTrade(
  sellerId: string,
  characterRelicId: string,
  price: number,
  currency: string
) {
  const relic = await prisma.characterRelic.findFirst({
    where: { id: characterRelicId, userId: sellerId },
  });
  if (!relic) throw new Error('遗物不存在或不属于你');
  if (relic.tradeLockId) throw new Error('该遗物已在交易中');

  const shopItem = await prisma.shopItem.findUnique({ where: { key: relic.relicKey } });
  if (shopItem && shopItem.tradable === false) {
    throw new Error('该遗物不允许交易');
  }

  if (!price || price <= 0) throw new Error('价格必须大于0');
  if (!['coin', 'stardust'].includes(currency)) throw new Error('币种不支持');

  const trade = await prisma.$transaction(async (tx) => {
    const created = await tx.relicTrade.create({
      data: {
        sellerId,
        sellerCharacterRelicId: characterRelicId,
        relicKey: relic.relicKey,
        price,
        currency,
        status: 'active',
        relicSnapshot: JSON.stringify({
          durability: relic.durability,
          maxDurability: relic.maxDurability,
          usedCount: relic.usedCount,
          isEquipped: relic.isEquipped,
        }),
      },
    });
    await tx.characterRelic.update({
      where: { id: characterRelicId },
      data: { tradeLockId: created.id },
    });
    return created;
  });

  return trade;
}

export async function cancelRelicTrade(sellerId: string, tradeId: string) {
  await prisma.$transaction(async (tx) => {
    const trade = await tx.relicTrade.findFirst({
      where: { id: tradeId, sellerId, status: 'active' },
    });
    if (!trade) throw new Error('挂单不存在或已成交');

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

  return { success: true };
}

export async function buyRelicTrade(
  buyerId: string,
  tradeId: string,
  targetCharacterId: string
) {
  await prisma.$transaction(async (tx) => {
    const trade = await tx.relicTrade.findFirst({
      where: { id: tradeId, status: 'active' },
    });
    if (!trade) throw new Error('挂单不存在或已成交');
    if (trade.sellerId === buyerId) throw new Error('不能购买自己的挂单');

    const buyer = await tx.user.findUnique({ where: { id: buyerId } });
    if (!buyer) throw new Error('用户不存在');

    if (trade.currency === 'coin') {
      if (buyer.coins < trade.price) throw new Error('锈蚀硬币不足');
    } else {
      if (buyer.stardust < trade.price) throw new Error('星尘不足');
    }

    const targetCharacter = await tx.character.findFirst({
      where: { id: targetCharacterId, userId: buyerId },
    });
    if (!targetCharacter) throw new Error('目标角色卡不存在或不属于你');

    const vaultCount = await tx.characterRelic.count({
      where: { characterId: targetCharacterId },
    });
    if (vaultCount >= MAX_VAULT_SIZE) throw new Error('角色保险箱已满');

    const snapshot = trade.relicSnapshot ? JSON.parse(trade.relicSnapshot) : {};

    // 扣买家货币
    if (trade.currency === 'coin') {
      await tx.user.update({
        where: { id: buyerId },
        data: { coins: { decrement: trade.price } },
      });
    } else {
      await tx.user.update({
        where: { id: buyerId },
        data: { stardust: { decrement: trade.price } },
      });
    }

    // 加卖家货币
    if (trade.currency === 'coin') {
      await tx.user.update({
        where: { id: trade.sellerId },
        data: { coins: { increment: trade.price } },
      });
    } else {
      await tx.user.update({
        where: { id: trade.sellerId },
        data: { stardust: { increment: trade.price } },
      });
    }

    // 给买家创建 CharacterRelic
    await tx.characterRelic.create({
      data: {
        characterId: targetCharacterId,
        userId: buyerId,
        relicKey: trade.relicKey,
        source: 'trade',
        durability: snapshot.durability ?? null,
        maxDurability: snapshot.maxDurability ?? null,
        usedCount: snapshot.usedCount ?? 0,
        isEquipped: false,
      },
    });

    // 删除卖家的 CharacterRelic（已售出）
    if (trade.sellerCharacterRelicId) {
      await tx.characterRelic.deleteMany({
        where: { id: trade.sellerCharacterRelicId },
      });
    }

    // 更新交易状态
    await tx.relicTrade.update({
      where: { id: tradeId },
      data: { status: 'sold', buyerId, soldAt: new Date() },
    });
  });

  return { success: true };
}
