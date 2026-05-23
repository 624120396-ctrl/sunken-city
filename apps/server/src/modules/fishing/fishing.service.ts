import { prisma } from '../../config/database';
import type { FishingItem } from '@prisma/client';

// ========== In-memory cast sessions (MVP) ==========
type CastSession = {
  userId: string;
  startTime: number;
  waitTimeMs: number;
  biteAtMs: number;
  biteWindowMs: number;
  consumed: boolean;
};

const castSessions = new Map<string, CastSession>();

// ========== Default seed data (11 items) ==========
const DEFAULT_FISHING_ITEMS = [
  { key: 'seaweed_boot', name: '缠满海藻的旧靴子', description: '一只被海水泡烂的靴子，上面缠满了海藻。', rarity: 'JUNK', sellPrice: 1, sellCurrency: 'coin', weight: 300, isCollection: false },
  { key: 'expired_ticket', name: '过期的船票', description: '一张已经泛黄的船票，日期早已模糊不清。', rarity: 'JUNK', sellPrice: 1, sellCurrency: 'coin', weight: 300, isCollection: false },
  { key: 'rusted_can', name: '生锈的罐头', description: '罐头里的东西已经凝固成某种不可名状的物质。', rarity: 'JUNK', sellPrice: 2, sellCurrency: 'coin', weight: 250, isCollection: false },
  { key: 'blackwater_eel', name: '黑水鳗鱼', description: '生活在黑水港深处的鳗鱼，肉质意外地鲜美。', rarity: 'COMMON', sellPrice: 5, sellCurrency: 'coin', weight: 200, isCollection: false },
  { key: 'glow_jellyfish', name: '发光水母', description: '夜间会发出幽蓝微光的小型水母。', rarity: 'COMMON', sellPrice: 8, sellCurrency: 'coin', weight: 150, isCollection: false },
  { key: 'old_signet_box', name: '旧印盒子', description: '一个刻有古老印记的神秘盒子，似乎无法打开。', rarity: 'UNCOMMON', sellPrice: 0, sellCurrency: 'coin', weight: 80, isCollection: true, collectionCategory: '异物' },
  { key: 'rune_slate', name: '刻满符文的石板', description: '上面刻着你无法理解的古老符文。', rarity: 'UNCOMMON', sellPrice: 15, sellCurrency: 'coin', weight: 60, isCollection: false },
  { key: 'mini_diving_bell', name: '微型潜水钟', description: '某种仪式中使用的微型潜水钟模型。', rarity: 'RARE', sellPrice: 30, sellCurrency: 'coin', weight: 25, isCollection: false },
  { key: 'blinking_eye', name: '仍在眨动的眼球', description: '一颗脱离躯体后仍在眨动的眼球，它似乎也在看着你。', rarity: 'ELDRITCH', sellPrice: 50, sellCurrency: 'coin', weight: 5, isCollection: false },
  { key: 'tentacle_tip', name: '一小截触手', description: '一小截断掉的触手，断面还在缓慢蠕动。', rarity: 'ELDRITCH', sellPrice: 80, sellCurrency: 'coin', weight: 3, isCollection: false },
  { key: 'your_reflection', name: '你自己的倒影', description: '你从水面中捞起的自己的倒影，它看起来比你更加年轻。', rarity: 'ELDRITCH', sellPrice: 100, sellCurrency: 'coin', weight: 2, isCollection: false },
];

export async function ensureFishingItemsSeeded(): Promise<void> {
  const count = await prisma.fishingItem.count();
  if (count === 0) {
    await prisma.fishingItem.createMany({ data: DEFAULT_FISHING_ITEMS });
  }
}

async function getOrCreateConfig() {
  let config = await prisma.fishingConfig.findFirst();
  if (!config) {
    config = await prisma.fishingConfig.create({
      data: { dailyLimit: 5, extraCost: 10 },
    });
  }
  return config;
}

// ========== Daily limit helpers ==========
function isNewDay(lastRefreshAt: Date): boolean {
  const now = new Date();
  const last = new Date(lastRefreshAt);
  return (
    now.getFullYear() !== last.getFullYear() ||
    now.getMonth() !== last.getMonth() ||
    now.getDate() !== last.getDate()
  );
}

async function getOrRefreshDaily(userId: string) {
  let daily = await prisma.userFishingDaily.findUnique({
    where: { userId },
  });

  if (!daily) {
    daily = await prisma.userFishingDaily.create({
      data: { userId, freeUsed: 0, extraUsed: 0, lastRefreshAt: new Date() },
    });
  } else if (isNewDay(daily.lastRefreshAt)) {
    daily = await prisma.userFishingDaily.update({
      where: { id: daily.id },
      data: { freeUsed: 0, extraUsed: 0, lastRefreshAt: new Date() },
    });
  }

  return daily;
}

// ========== Status ==========
export async function getFishingStatus(userId: string) {
  const [daily, user, config] = await Promise.all([
    getOrRefreshDaily(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { coins: true } }),
    getOrCreateConfig(),
  ]);

  const dailyLimit = config.dailyLimit;
  const extraCost = config.extraCost;
  const canFish = daily.freeUsed < dailyLimit || (user?.coins ?? 0) >= extraCost;

  return {
    dailyLimit,
    freeUsed: daily.freeUsed,
    extraUsed: daily.extraUsed,
    extraCost,
    canFish,
  };
}

// ========== Cast ==========
export async function castLine(userId: string) {
  const [daily, user, config] = await Promise.all([
    getOrRefreshDaily(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { coins: true } }),
    getOrCreateConfig(),
  ]);

  const dailyLimit = config.dailyLimit;
  const extraCost = config.extraCost;
  const hasFree = daily.freeUsed < dailyLimit;
  const canPayExtra = (user?.coins ?? 0) >= extraCost;

  if (!hasFree && !canPayExtra) {
    throw new Error('DAILY_LIMIT_REACHED');
  }

  const waitTimeMs = Math.floor(Math.random() * 5000) + 3000; // 3000 ~ 8000
  const biteWindowMs = 1500;
  const startTime = Date.now();
  const castId = `${userId}-${startTime}-${Math.random().toString(36).slice(2, 9)}`;

  if (hasFree) {
    await prisma.userFishingDaily.update({
      where: { id: daily.id },
      data: { freeUsed: { increment: 1 } },
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: extraCost } },
      });
      await tx.userFishingDaily.update({
        where: { id: daily.id },
        data: { extraUsed: { increment: 1 } },
      });
    });
  }

  castSessions.set(castId, {
    userId,
    startTime,
    waitTimeMs,
    biteAtMs: startTime + waitTimeMs,
    biteWindowMs,
    consumed: true,
  });

  return {
    castId,
    waitTimeMs,
    biteWindowMs,
    biteAtMs: waitTimeMs, // relative to request start
  };
}

// ========== Drop logic ==========
function weightedRandom(items: FishingItem[]): FishingItem {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }
  return items[items.length - 1];
}

// ========== Reel ==========
export async function reelIn(userId: string, castId: string, clientTimestamp: number) {
  const session = castSessions.get(castId);
  if (!session || session.userId !== userId) {
    throw new Error('INVALID_CAST');
  }

  castSessions.delete(castId);

  const activeItems = await prisma.fishingItem.findMany({ where: { active: true } });
  const inWindow = clientTimestamp >= session.biteAtMs && clientTimestamp <= session.biteAtMs + session.biteWindowMs;

  let result: 'caught' | 'missed' | 'escaped';
  let item: FishingItem | null = null;

  if (inWindow) {
    result = 'caught';
    item = weightedRandom(activeItems);
  } else {
    if (Math.random() < 0.8) {
      result = 'escaped';
    } else {
      const junkItems = activeItems.filter((i) => i.rarity === 'JUNK');
      if (junkItems.length > 0) {
        result = 'caught';
        item = weightedRandom(junkItems);
      } else {
        result = 'escaped';
      }
    }
  }

  let logId: string | undefined;
  if (result === 'caught' && item) {
    await prisma.$transaction(async (tx) => {
      const log = await tx.userFishingLog.create({
        data: {
          userId,
          itemKey: item!.key,
          itemName: item!.name,
          rarity: item!.rarity,
          sellPrice: item!.sellPrice,
          sellCurrency: item!.sellCurrency,
        },
      });
      logId = log.id;

      if (item!.isCollection) {
        const existing = await tx.userInventory.findUnique({
          where: { userId_itemKey: { userId, itemKey: item!.key } },
        });
        if (existing) {
          await tx.userInventory.update({
            where: { id: existing.id },
            data: { quantity: { increment: 1 } },
          });
        } else {
          await tx.userInventory.create({
            data: { userId, itemKey: item!.key, quantity: 1 },
          });
        }
      }
    });
  }

  const [updatedUser, updatedDaily, config] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { coins: true } }),
    getOrRefreshDaily(userId),
    getOrCreateConfig(),
  ]);

  return {
    result,
    item: item
      ? {
          key: item.key,
          name: item.name,
          description: item.description,
          rarity: item.rarity,
          sellPrice: item.sellPrice,
          sellCurrency: item.sellCurrency,
          isCollection: item.isCollection,
          iconUrl: item.iconUrl,
        }
      : null,
    logId,
    userCoins: updatedUser?.coins ?? 0,
    freeUsed: updatedDaily.freeUsed,
    remaining: Math.max(0, config.dailyLimit - updatedDaily.freeUsed),
  };
}

// ========== Sell ==========
export async function sellFishingLog(userId: string, logId: string) {
  const log = await prisma.userFishingLog.findFirst({
    where: { id: logId, userId },
  });

  if (!log) {
    throw new Error('LOG_NOT_FOUND');
  }
  if (log.isSold) {
    throw new Error('ALREADY_SOLD');
  }

  await prisma.$transaction(async (tx) => {
    await tx.userFishingLog.update({
      where: { id: logId },
      data: { isSold: true },
    });
    await tx.user.update({
      where: { id: userId },
      data: {
        ...(log.sellCurrency === 'stardust'
          ? { stardust: { increment: log.sellPrice } }
          : { coins: { increment: log.sellPrice } }),
      },
    });
  });

  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true, stardust: true },
  });

  return {
    coins: updatedUser?.coins ?? 0,
    stardust: updatedUser?.stardust ?? 0,
    gained: log.sellPrice,
    currency: log.sellCurrency,
  };
}

// ========== Collection ==========
export async function getCollection(userId: string) {
  const [caughtKeys, allItems] = await Promise.all([
    prisma.userFishingLog.findMany({
      where: { userId },
      distinct: ['itemKey'],
      select: { itemKey: true },
    }),
    prisma.fishingItem.findMany({
      where: { active: true },
      select: { key: true },
    }),
  ]);

  const unlockedKeys = caughtKeys.map((c) => c.itemKey);
  const totalItems = allItems.length;
  const progress = totalItems > 0 ? Math.round((unlockedKeys.length / totalItems) * 100) : 0;

  return {
    unlocked: unlockedKeys,
    total: totalItems,
    progress,
  };
}

// ========== Logs ==========
export async function getFishingLogs(userId: string, limit: number = 10) {
  const logs = await prisma.userFishingLog.findMany({
    where: { userId },
    orderBy: { caughtAt: 'desc' },
    take: limit,
    select: {
      id: true,
      itemName: true,
      rarity: true,
      sellPrice: true,
      sellCurrency: true,
      isSold: true,
      caughtAt: true,
    },
  });
  return { logs };
}
