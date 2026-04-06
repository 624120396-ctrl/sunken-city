import { PrismaClient } from '@prisma/client';
import type { Server } from 'socket.io';
import { createNotification } from '../notifications/notifications.service';

const prisma = new PrismaClient();

export async function checkAndNotifyRankUp(
  userId: string,
  oldExp: number,
  newExp: number,
  io: Server | null | undefined,
  skipHistory?: boolean
) {
  const ranks = await prisma.rankConfig.findMany({
    where: { isActive: true },
    orderBy: { expRequired: 'desc' },
  });

  function getRank(exp: number) {
    for (const rank of ranks) {
      if (exp >= rank.expRequired) return rank;
    }
    return ranks[ranks.length - 1];
  }

  const oldRank = getRank(oldExp);
  const newRank = getRank(newExp);

  if (newRank.level > oldRank.level) {
    await createNotification(prisma, io, {
      userId,
      type: 'rank_up',
      title: `位阶晋升：你已成为 ${newRank.name}`,
      content: `灵魂碎片的积累让你跨越了界限，从 ${oldRank.name} 晋升至 ${newRank.name}。`,
      link: '/ranks',
      isSystem: true,
    });

    if (!skipHistory) {
      await prisma.userRankHistory.create({
        data: {
          userId,
          oldLevel: oldRank.level,
          newLevel: newRank.level,
          oldRankName: oldRank.name,
          newRankName: newRank.name,
        },
      });
    }
  }
}
