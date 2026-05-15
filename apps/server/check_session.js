const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const session = await prisma.scenarioSession.findFirst({
    where: { id: 'cmnufjcvo0001vh74khwrqmsq' },
  });
  console.log('Session:', JSON.stringify(session, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
