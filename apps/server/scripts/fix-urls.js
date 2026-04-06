const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  // 1. 修复用户头像 URL: http://43.254.167.183/uploads/xxx -> /uploads/xxx
  const users = await prisma.user.findMany({
    where: { avatarUrl: { startsWith: 'http://43.254.167.183' } },
    select: { id: true, avatarUrl: true },
  });
  for (const u of users) {
    const newUrl = u.avatarUrl.replace('http://43.254.167.183', '');
    await prisma.user.update({ where: { id: u.id }, data: { avatarUrl: newUrl } });
  }
  console.log(`Fixed ${users.length} user avatar URLs`);

  // 2. 修复商店图标 URL: http://43.254.167.183/frames/xxx -> /frames/xxx
  const items = await prisma.shopItem.findMany({
    where: { iconUrl: { startsWith: 'http://43.254.167.183' } },
    select: { id: true, iconUrl: true },
  });
  for (const item of items) {
    const newUrl = item.iconUrl.replace('http://43.254.167.183', '');
    await prisma.shopItem.update({ where: { id: item.id }, data: { iconUrl: newUrl } });
  }
  console.log(`Fixed ${items.length} shop item icon URLs`);

  // 3. 修复 Upload 表 URL（如果存在）
  const uploads = await prisma.upload.findMany({
    where: { url: { startsWith: 'http://43.254.167.183' } },
    select: { id: true, url: true },
  });
  for (const up of uploads) {
    const newUrl = up.url.replace('http://43.254.167.183', '');
    await prisma.upload.update({ where: { id: up.id }, data: { url: newUrl } });
  }
  console.log(`Fixed ${uploads.length} upload URLs`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
