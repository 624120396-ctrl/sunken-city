import { PrismaClient } from '@prisma/client';
import { saveImageFromUrl } from '../apps/server/src/utils/image-downloader';

const prisma = new PrismaClient();

async function main() {
  const characters = await prisma.character.findMany({
    where: {
      portraitUrl: {
        contains: 'volces.com',
      },
    },
    select: {
      id: true,
      name: true,
      portraitUrl: true,
    },
  });

  if (characters.length === 0) {
    console.log('没有需要修复的远程 portraitUrl');
    return;
  }

  console.log(`发现 ${characters.length} 条远程 portraitUrl 需要修复`);

  for (const char of characters) {
    if (!char.portraitUrl) continue;
    console.log(`[${char.name}] 正在下载: ${char.portraitUrl.slice(0, 80)}...`);
    const localUrl = await saveImageFromUrl(char.portraitUrl, 'portraits');
    if (localUrl) {
      await prisma.character.update({
        where: { id: char.id },
        data: { portraitUrl: localUrl, portraitPreviewUrl: localUrl },
      });
      console.log(`[${char.name}] 已更新为本地 URL: ${localUrl}`);
    } else {
      console.error(`[${char.name}] 下载失败，跳过`);
    }
  }

  console.log('修复完成');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
