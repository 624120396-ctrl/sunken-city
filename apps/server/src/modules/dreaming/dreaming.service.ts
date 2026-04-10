import { PrismaClient } from '@prisma/client';
import {
  CardPosition,
  getRandomText,
  getRandomTentacleBuff,
  getCardMeta,
  DREAM_REVEAL_PRICE_COIN,
  DREAM_DEEP_REVEAL_PRICE_STARDUST,
  DREAM_CARD_DEFINITIONS,
  TENTACLE_BUFFS,
} from './dreaming.config';

const prisma = new PrismaClient();

function getShanghaiDateString(d = new Date()): string {
  const offset = d.getTimezoneOffset();
  const shanghaiOffset = -480; // Asia/Shanghai = UTC+8
  const diff = shanghaiOffset - offset;
  const local = new Date(d.getTime() + diff * 60000);
  return local.toISOString().slice(0, 10);
}

export async function getDailyStatus(userId: string) {
  const today = getShanghaiDateString();
  let daily = await prisma.userDreamDaily.findUnique({
    where: { userId },
  });

  if (!daily || daily.date !== today) {
    daily = await prisma.userDreamDaily.upsert({
      where: { userId },
      update: { date: today, drawCount: 0, lastDrawAt: new Date() },
      create: { userId, date: today, drawCount: 0 },
    });
  }

  const todayDraws = await prisma.userDreamDraw.findMany({
    where: {
      userId,
      drawnAt: {
        gte: new Date(`${today}T00:00:00+08:00`),
        lt: new Date(`${today}T23:59:59+08:00`),
      },
    },
    orderBy: { drawnAt: 'desc' },
    take: 1,
  });

  const latestDraw = todayDraws[0] || null;

  const enrichedDraw = latestDraw
    ? {
        ...latestDraw,
        cardName: getCardMeta(latestDraw.cardKey)?.name || latestDraw.cardKey,
        buff: latestDraw.tentacleBuff
          ? TENTACLE_BUFFS.find((b) => b.key === latestDraw.tentacleBuff) || null
          : null,
      }
    : null;

  return {
    canDraw: daily.drawCount < 1,
    drawCount: daily.drawCount,
    todayDraw: enrichedDraw,
  };
}

export async function drawCandidates(userId: string) {
  const daily = await getDailyStatus(userId);
  if (!daily.canDraw) {
    throw new Error('今日已抽过溺者之牌');
  }

  // 从10张中随机选3张不重复
  const allKeys = [...DREAM_CARD_DEFINITIONS];
  const shuffled = allKeys.sort(() => Math.random() - 0.5);
  const candidates = shuffled.slice(0, 3).map((c) => ({
    key: c.key,
    name: c.name,
    rarity: c.rarity,
  }));

  return { candidates };
}

export async function selectCard(userId: string, cardKey: string) {
  const dailyStatus = await getDailyStatus(userId);
  if (!dailyStatus.canDraw) {
    throw new Error('今日已抽过溺者之牌');
  }

  const card = getCardMeta(cardKey);
  if (!card) {
    throw new Error('未知的溺者之牌');
  }

  const position: CardPosition = Math.random() < 0.5 ? 'upright' : 'reversed';

  const draw = await prisma.$transaction(async (tx) => {
    const today = getShanghaiDateString();
    await tx.userDreamDaily.upsert({
      where: { userId },
      update: { drawCount: { increment: 1 }, lastDrawAt: new Date() },
      create: { userId, date: today, drawCount: 1 },
    });

    return tx.userDreamDraw.create({
      data: {
        userId,
        cardKey,
        position,
      },
    });
  });

  const dbCard = await prisma.dreamCard.findUnique({
    where: { key: card.key },
    select: { imageUrl: true },
  });

  return {
    draw,
    card: {
      key: card.key,
      name: card.name,
      rarity: card.rarity,
      imageUrl: dbCard?.imageUrl || null,
    },
  };
}

export async function revealDraw(userId: string, drawId: string) {
  const draw = await prisma.userDreamDraw.findFirst({
    where: { id: drawId, userId },
  });
  if (!draw) throw new Error('记录不存在');
  if (draw.isRevealed) {
    return { draw, alreadyRevealed: true };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });
  if (!user || user.coins < DREAM_REVEAL_PRICE_COIN) {
    throw new Error('锈蚀硬币不足');
  }

  const text = getRandomText(draw.cardKey, draw.position as CardPosition);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: DREAM_REVEAL_PRICE_COIN } },
    });
    return tx.userDreamDraw.update({
      where: { id: drawId },
      data: {
        isRevealed: true,
        revealedAt: new Date(),
        revealText: text,
      },
    });
  });

  return { draw: updated, alreadyRevealed: false };
}

export async function deepRevealDraw(userId: string, drawId: string) {
  const draw = await prisma.userDreamDraw.findFirst({
    where: { id: drawId, userId },
  });
  if (!draw) throw new Error('记录不存在');
  if (draw.isDeepRevealed) {
    return { draw, alreadyRevealed: true };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stardust: true },
  });
  if (!user || user.stardust < DREAM_DEEP_REVEAL_PRICE_STARDUST) {
    throw new Error('虚银不足');
  }

  const text = getRandomText(draw.cardKey, draw.position as CardPosition);
  const buff = getRandomTentacleBuff();

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { stardust: { decrement: DREAM_DEEP_REVEAL_PRICE_STARDUST } },
    });
    return tx.userDreamDraw.update({
      where: { id: drawId },
      data: {
        isRevealed: true,
        revealedAt: new Date(),
        revealText: text,
        isDeepRevealed: true,
        deepRevealedAt: new Date(),
        deepRevealText: text,
        tentacleBuff: buff.key,
      },
    });
  });

  return { draw: updated, buff, alreadyRevealed: false };
}

export async function getCollection(userId: string) {
  const cards = await prisma.dreamCard.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  const draws = await prisma.userDreamDraw.groupBy({
    by: ['cardKey'],
    where: { userId },
    _count: { cardKey: true },
  });

  const drawMap = new Map(draws.map((d) => [d.cardKey, d._count.cardKey]));

  return cards.map((c) => ({
    ...c,
    unlocked: (drawMap.get(c.key) || 0) > 0,
    drawCount: drawMap.get(c.key) || 0,
  }));
}

export async function getHistory(userId: string, limit = 20) {
  const draws = await prisma.userDreamDraw.findMany({
    where: { userId },
    orderBy: { drawnAt: 'desc' },
    take: limit,
  });

  return draws.map((d) => {
    const meta = getCardMeta(d.cardKey);
    const buff = d.tentacleBuff
      ? TENTACLE_BUFFS.find((b) => b.key === d.tentacleBuff) || null
      : null;
    return {
      ...d,
      cardName: meta?.name || d.cardKey,
      buff,
    };
  });
}

export async function seedDreamCards() {
  const count = await prisma.dreamCard.count();
  if (count > 0) return;

  for (const card of DREAM_CARD_DEFINITIONS) {
    await prisma.dreamCard.create({
      data: {
        key: card.key,
        name: card.name,
        rarity: card.rarity,
        sortOrder: DREAM_CARD_DEFINITIONS.indexOf(card),
      },
    });
  }
}
