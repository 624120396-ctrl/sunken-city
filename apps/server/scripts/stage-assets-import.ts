import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const allowed = new Map([
  ['.png', { mimeType: 'image/png', kind: 'BACKGROUND' }],
  ['.jpg', { mimeType: 'image/jpeg', kind: 'BACKGROUND' }],
  ['.jpeg', { mimeType: 'image/jpeg', kind: 'BACKGROUND' }],
  ['.webp', { mimeType: 'image/webp', kind: 'BACKGROUND' }],
  ['.mp3', { mimeType: 'audio/mpeg', kind: 'BGM' }],
  ['.ogg', { mimeType: 'audio/ogg', kind: 'BGM' }],
  ['.wav', { mimeType: 'audio/wav', kind: 'BGM' }],
]);

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function sha256(filePath: string) {
  const { createReadStream } = await import('node:fs');
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => createReadStream(filePath).on('data', (chunk) => hash.update(chunk)).on('error', reject).on('end', resolve));
  return hash.digest('hex');
}

async function main() {
  const roomId = option('--room');
  const uploadedById = option('--uploaded-by');
  const source = option('--source');
  const requestedKind = option('--kind');
  const visibility = option('--visibility') ?? 'PRIVATE_ROOM';
  const targetUserIds = process.argv.flatMap((value, index) => value === '--target-user' ? [process.argv[index + 1]] : []).filter(Boolean);
  if (!roomId || !uploadedById || !source || !requestedKind) throw new Error('usage: --room <publicRoomId> --uploaded-by <userId> --source <file> --kind BACKGROUND|PORTRAIT|BGM [--visibility ...] [--target-user <userId>]');
  if (!['BACKGROUND', 'PORTRAIT', 'BGM'].includes(requestedKind)) throw new Error('unsupported --kind');
  if (!['PUBLIC', 'PRIVATE_ROOM', 'KP_ONLY', 'PRIVATE_TARGETS'].includes(visibility)) throw new Error('unsupported --visibility');
  if (visibility === 'PRIVATE_TARGETS' && targetUserIds.length === 0) throw new Error('PRIVATE_TARGETS requires --target-user');
  const sourceInfo = await stat(source);
  if (!sourceInfo.isFile() || sourceInfo.size <= 0) throw new Error('source is not a non-empty file');
  const extension = path.extname(source).toLowerCase();
  const format = allowed.get(extension);
  if (!format) throw new Error('source extension is not an approved stage asset type');
  if ((requestedKind === 'BGM') !== format.mimeType.startsWith('audio/')) throw new Error('kind does not match source media type');
  const room = await prisma.room.findUnique({ where: { roomId }, select: { id: true } });
  if (!room) throw new Error('room not found');
  const assetId = randomUUID();
  const storageKey = path.posix.join(room.id, requestedKind.toLowerCase(), `${assetId}${extension}`);
  const root = process.env.STAGE_ASSET_ROOT || '/opt/coc-platform-data/stage-assets';
  const destination = path.resolve(root, storageKey);
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o750 });
  await copyFile(source, destination);
  const hash = await sha256(destination);
  await prisma.stageAsset.create({ data: {
    id: assetId, roomId: room.id, uploadedById, kind: requestedKind, visibility,
    originalName: path.basename(source), mimeType: format.mimeType, size: sourceInfo.size, hash,
    storageKey, metadataJson: JSON.stringify({ targetUserIds, importedBy: 'stage-assets-import' }),
  } });
  console.log(JSON.stringify({ assetId, kind: requestedKind, roomId, size: sourceInfo.size }));
}

main().finally(() => prisma.$disconnect());
