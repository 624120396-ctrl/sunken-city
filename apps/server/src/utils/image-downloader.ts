import path from 'path';
import fs from 'fs';
import { URL } from 'url';

function isPrivateIp(ip: string): boolean {
  // IPv6 loopback
  if (ip === '::1') return true;
  // IPv4 parts
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
    const [a, b, c, d] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 0) return true; // 0.0.0.0
    if (a === 169 && b === 254) return true; // 169.254.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
  }
  return false;
}

function isAllowedUrl(urlStr: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }
  // Reject pure-IP URLs and resolve hostnames to check for private IPs
  const hostname = parsed.hostname;
  if (isPrivateIp(hostname)) return false;
  // Reject IPv6 addresses (simplification for safety)
  if (hostname.includes(':')) return false;
  return true;
}

/**
 * 从远程 URL 下载图片并保存到本地 public/uploads/{subDir}/
 * 返回相对于 public 的访问路径，如 /uploads/portraits/1234567890-abc.jpg
 */
export async function saveImageFromUrl(
  url: string,
  subDir: string
): Promise<string | null> {
  if (!isAllowedUrl(url)) {
    console.error(`Blocked potentially unsafe URL: ${url}`);
    return null;
  }

  // Validate subDir to prevent path traversal
  if (!subDir || !/^[a-zA-Z0-9_-]+$/.test(subDir)) {
    console.error(`Invalid subDir: ${subDir}`);
    return null;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Download image failed: ${response.status} ${url}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadRoot = path.resolve(process.cwd(), 'public', 'uploads');
    const targetDir = path.resolve(uploadRoot, subDir);

    // Ensure targetDir stays within uploadRoot
    if (!targetDir.startsWith(uploadRoot + path.sep)) {
      console.error(`Path traversal detected: ${targetDir}`);
      return null;
    }

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
