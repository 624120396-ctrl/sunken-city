import { PrismaClient } from '@prisma/client';
import { RELIC_REGISTRY, MAX_VAULT_SIZE, getRelicEffect } from './relics.config';

const prisma = new PrismaClient();

export async function purchaseRelic(
  userId: string,
  itemKey: string,
  characterId?: string
) {
  const item = await prisma.shopItem.findUnique({ where: { key: itemKey } });
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
    const character = await prisma.character.findFirst({
      where: { id: characterId, userId },
    });
    if (!character) {
      throw new Error('角色卡不存在或不属于你');
    }
    const count = await prisma.characterRelic.count({ where: { characterId } });
    if (count >= MAX_VAULT_SIZE) {
      throw new Error('角色保险箱已满（最多5件遗物）');
    }
    const relic = await prisma.characterRelic.create({
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
  const existing = await prisma.userInventory.findUnique({
    where: { userId_itemKey: { userId, itemKey } },
  });
  if (existing) {
    await prisma.userInventory.update({
      where: { id: existing.id },
      data: { quantity: { increment: 1 } },
    });
  } else {
    await prisma.userInventory.create({
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
  if (!item || item.category !== 'relic') throw new Error('不是遗物');

  const character = await prisma.character.findFirst({
    where: { id: characterId, userId },
  });
  if (!character) throw new Error('角色卡不存在或不属于你');

  const count = await prisma.characterRelic.count({ where: { characterId } });
  if (count >= MAX_VAULT_SIZE) throw new Error('角色保险箱已满');

  const registry = getRelicEffect(inv.itemKey);
  const effectData = item.effectData ? JSON.parse(item.effectData) : null;

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
    .filter((inv) => itemMap.has(inv.itemKey))
    .map((inv) => ({
      ...inv,
      item: itemMap.get(inv.itemKey),
      meta: getRelicEffect(inv.itemKey),
    }));
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
