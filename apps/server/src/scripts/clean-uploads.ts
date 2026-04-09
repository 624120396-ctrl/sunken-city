import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// 删除未被数据库引用的 orphaned 图片（ portraits 和 ai-generated 目录）
async function cleanOrphanedImages() {
  const uploadRoot = path.join(process.cwd(), 'public', 'uploads');

  // 从数据库收集所有被引用的 portraitUrl
  const portraits = await prisma.character.findMany({
    where: { portraitUrl: { not: null } },
    select: { portraitUrl: true },
  });
  const previewUrls = await prisma.character.findMany({
    where: { portraitPreviewUrl: { not: null } },
    select: { portraitPreviewUrl: true },
  });
  const uploads = await prisma.upload.findMany({
    select: { url: true },
  });

  const validUrls = new Set<string>();
  portraits.forEach((p) => p.portraitUrl && validUrls.add(p.portraitUrl));
  previewUrls.forEach((p) => p.portraitPreviewUrl && validUrls.add(p.portraitPreviewUrl));
  uploads.forEach((u) => u.url && validUrls.add(u.url));

  const dirsToClean = ['portraits', 'ai-generated'];
  let removedCount = 0;
  let removedSize = 0;

  for (const dir of dirsToClean) {
    const absDir = path.join(uploadRoot, dir);
    if (!fs.existsSync(absDir)) continue;

    const files = fs.readdirSync(absDir);
    for (const file of files) {
      const filePath = path.join(absDir, file);
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      const relativeUrl = '/' + path.relative(path.join(process.cwd(), 'public'), filePath).replace(/\\/g, '/');
      if (!validUrls.has(relativeUrl)) {
        fs.unlinkSync(filePath);
        removedCount++;
        removedSize += stat.size;
        console.log('Removed orphaned:', relativeUrl);
      }
    }
  }

  console.log(`Cleaned ${removedCount} files, freed ${(removedSize / 1024 / 1024).toFixed(2)} MB`);
}

cleanOrphanedImages()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma['\$disconnect']();
  });
