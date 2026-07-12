import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { createStageAssetDeliverySignature } from './stage-assets';

export function verifyStageAssetDeliverySignature(input: {
  assetId: string;
  version: number;
  viewerUserId: string;
  expiresAt: number;
  signature: string;
  secret: string;
  nowMs?: number;
}) {
  const now = Math.floor((input.nowMs ?? Date.now()) / 1_000);
  if (!Number.isSafeInteger(input.expiresAt) || input.expiresAt < now || input.expiresAt > now + 600) return false;
  const expected = createStageAssetDeliverySignature(input);
  const supplied = Buffer.from(input.signature, 'hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  return supplied.length === expectedBytes.length && timingSafeEqual(supplied, expectedBytes);
}

export function resolveStageAssetFile(assetRoot: string, storageKey: string) {
  if (!storageKey || path.isAbsolute(storageKey)) return null;
  const root = path.resolve(assetRoot);
  const resolved = path.resolve(root, storageKey);
  return resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

export function parseStageAssetByteRange(value: string | undefined, size: number) {
  if (!value || !value.startsWith('bytes=') || value.includes(',')) return null;
  const [startText, endText] = value.slice('bytes='.length).split('-', 2);
  if (startText === '' && endText === '') return null;
  if (startText === '') {
    const length = Number(endText);
    if (!Number.isSafeInteger(length) || length <= 0) return null;
    return { start: Math.max(0, size - length), end: size - 1 };
  }
  const start = Number(startText);
  const end = endText === '' ? size - 1 : Number(endText);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

export function stageAssetContentType(mimeType: string) {
  const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav']);
  return allowed.has(mimeType) ? mimeType : 'application/octet-stream';
}
