import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.character.count();
  await prisma.character.deleteMany();
  console.log('已删除 ' + count + ' 个旧角色');
}
main().finally(() => prisma.$disconnect());
