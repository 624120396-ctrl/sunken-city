const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 检查RankConfig表
    const ranks = await prisma.rankConfig.findMany({ orderBy: { level: 'asc' } });
    console.log(`✅ RankConfig: ${ranks.length} records`);
    ranks.forEach(r => console.log(`  - Lv.${r.level}: ${r.name}`));

    // 检查TitleConfig表
    const titles = await prisma.titleConfig.findMany();
    console.log(`\n✅ TitleConfig: ${titles.length} records`);
    
    // 检查User表结构
    const user = await prisma.user.findFirst();
    console.log(`\n✅ User table columns:`);
    console.log(`  - id: ${typeof user?.id}`);
    console.log(`  - exp: ${user?.exp}`);
    console.log(`  - displayedTitleKey: ${user?.displayedTitleKey}`);
    console.log(`  - has level: ${'level' in (user || {})}`);
    console.log(`  - has title: ${'title' in (user || {})}`);

    // 检查UserTitle表
    const userTitles = await prisma.userTitle.findMany();
    console.log(`\n✅ UserTitle: ${userTitles.length} records`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();