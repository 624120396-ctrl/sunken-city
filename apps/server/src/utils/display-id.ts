import { PrismaClient } from '@prisma/client';

export async function nextUserDisplayId(prisma: PrismaClient): Promise<number> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [result] = await prisma.$queryRaw<[{ maxId: number | null }]>`SELECT MAX(displayId) as maxId FROM User`;
    const nextId = (result?.maxId ?? 0) + 1;
    try {
      // 尝试直接插入一个占位记录确保唯一性（这里只是查，真正保证唯一性在注册/创卡时的 try/catch）
      // 更安全的做法：直接返回 nextId，让调用方在 create 时 catch 重试
      return nextId;
    } catch {
      await new Promise((r) => setTimeout(r, 10 * (attempt + 1)));
    }
  }
  throw new Error('Failed to generate unique user displayId after retries');
}

export async function nextCharacterDisplayId(prisma: PrismaClient): Promise<number> {
  const [result] = await prisma.$queryRaw<[{ maxId: number | null }]>`SELECT MAX(displayId) as maxId FROM Character`;
  return (result?.maxId ?? 0) + 1;
}
