import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  for (let i = 0; i < users.length; i++) {
    await prisma.user.update({
      where: { id: users[i].id },
      data: { displayId: i + 1 },
    });
    console.log(`User ${users[i].nickname} -> displayId ${i + 1}`);
  }

  const chars = await prisma.character.findMany({ orderBy: { createdAt: 'asc' } });
  for (let i = 0; i < chars.length; i++) {
    await prisma.character.update({
      where: { id: chars[i].id },
      data: { displayId: i + 1 },
    });
    console.log(`Character ${chars[i].name} -> displayId ${i + 1}`);
  }

  console.log('Backfill complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
