import path from 'path';
import fs from 'fs';

/**
 * 从远程 URL 下载图片并保存到本地 public/uploads/{subDir}/
 * 返回相对于 public 的访问路径，如 /uploads/portraits/1234567890-abc.jpg
 */
export async function saveImageFromUrl(
  url: string,
  subDir: string
): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Download image failed: ${response.status} ${url}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadRoot = path.join(process.cwd(), 'public', 'uploads');
    const targetDir = path.join(uploadRoot, subDir);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
    const filePath = path.join(targetDir, filename);

    fs.writeFileSync(filePath, buffer);

    const relativePath = path
      .relative(path.join(process.cwd(), 'public'), filePath)
      .replace(/\\/g, '/');

    return `/${relativePath}`;
  } catch (error) {
    console.error('saveImageFromUrl error:', error);
    return null;
  }
}
