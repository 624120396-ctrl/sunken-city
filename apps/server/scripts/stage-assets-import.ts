import { chmod, copyFile, mkdir, open, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { decideStageAssetImport, validateStageAssetImportAccess } from './stage-assets-import.logic';

const prisma = new PrismaClient();
const allowed = new Map([
  ['.png', { mimeType: 'image/png', media: 'image' }],
  ['.jpg', { mimeType: 'image/jpeg', media: 'image' }],
  ['.jpeg', { mimeType: 'image/jpeg', media: 'image' }],
  ['.webp', { mimeType: 'image/webp', media: 'image' }],
  ['.mp3', { mimeType: 'audio/mpeg', media: 'audio' }],
  ['.ogg', { mimeType: 'audio/ogg', media: 'audio' }],
  ['.wav', { mimeType: 'audio/wav', media: 'audio' }],
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

async function copyAtomically(source: string, destination: string) {
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await copyFile(source, temporary);
    await chmod(temporary, 0o640);
    const handle = await open(temporary, 'r');
    try { await handle.sync(); } finally { await handle.close(); }
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
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
  if ((requestedKind === 'BGM' && format.media !== 'audio') || (requestedKind !== 'BGM' && format.media !== 'image')) throw new Error('kind does not match source media type');
  const room = await prisma.room.findUnique({ where: { roomId }, include: { members: true } });
  if (!room) throw new Error('room not found');
  const normalizedTargetUserIds = validateStageAssetImportAccess({ uploadedById, visibility, targetUserIds, members: room.members });
  const hash = await sha256(source);
  const existing = await prisma.stageAsset.findMany({
    where: { roomId: room.id, kind: requestedKind, hash, deletedAt: null },
    select: { id: true, roomId: true, kind: true, hash: true, uploadedById: true, visibility: true, metadataJson: true },
  });
  const decision = decideStageAssetImport({
    existing,
    request: { roomId: room.id, kind: requestedKind, hash, uploadedById, visibility, targetUserIds: normalizedTargetUserIds },
  });
  if (decision.action === 'reuse') {
    console.log(JSON.stringify({ assetId: decision.assetId, kind: requestedKind, roomId, reused: true }));
    return;
  }
  const assetId = randomUUID();
  const storageKey = path.posix.join(room.id, requestedKind.toLowerCase(), `${assetId}${extension}`);
  const root = process.env.STAGE_ASSET_ROOT || '/opt/coc-platform-data/stage-assets';
  const destination = path.resolve(root, storageKey);
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o750 });
  await copyAtomically(source, destination);
  try {
    await prisma.stageAsset.create({ data: {
      id: assetId, roomId: room.id, uploadedById, kind: requestedKind, visibility,
      originalName: path.basename(source), mimeType: format.mimeType, size: sourceInfo.size, hash,
      storageKey, metadataJson: JSON.stringify({ targetUserIds: normalizedTargetUserIds, importedBy: 'stage-assets-import' }),
    } });
  } catch (error) {
    await unlink(destination).catch(() => undefined);
    throw error;
  }
  console.log(JSON.stringify({ assetId, kind: requestedKind, roomId, size: sourceInfo.size }));
}

main().finally(() => prisma.$disconnect());
