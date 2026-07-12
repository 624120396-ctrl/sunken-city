import { createHash, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { createStageAssetDeliverySignature } from './stage-assets';

export function verifyStageAssetDeliverySignature(input: {
  assetId: string;
  version: number;
  viewerUserId: string;
  expiresAt: number;
  signature: string;
  secret: string;
  deliveryBaseUrl: string;
  nowMs?: number;
}) {
  const now = Math.floor((input.nowMs ?? Date.now()) / 1_000);
  if (!Number.isSafeInteger(input.expiresAt) || input.expiresAt < now || input.expiresAt > now + 600) return false;
  let deliveryOrigin: string;
  try {
    deliveryOrigin = new URL(input.deliveryBaseUrl).origin;
  } catch {
    return false;
  }
  const expected = createStageAssetDeliverySignature({ ...input, deliveryOrigin });
  const supplied = Buffer.from(input.signature, 'hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  return supplied.length === expectedBytes.length && timingSafeEqual(supplied, expectedBytes);
}

export function isStageAssetDeliveryRequestAllowed(input: { protocol: string; hostname: string; deliveryBaseUrl?: string }) {
  if (!input.deliveryBaseUrl) return false;
  try {
    const delivery = new URL(input.deliveryBaseUrl);
    return input.protocol.toLowerCase() === delivery.protocol.slice(0, -1).toLowerCase()
      && input.hostname.toLowerCase() === delivery.hostname.toLowerCase();
  } catch {
    return false;
  }
}

export function isStageAssetDeliveryPath(pathname: string) {
  return pathname.startsWith('/api/stage-assets/delivery/');
}

function pathnameWithoutQuery(value?: string) {
  if (!value) return '';
  const rawPath = value.split('?', 1)[0];
  try {
    return new URL(rawPath).pathname;
  } catch {
    return rawPath;
  }
}

/** Morgan runs before routers; use raw URL fields so mounts and query strings cannot bypass the skip. */
export function shouldSkipStageAssetDeliveryAccessLog(req: { originalUrl?: string; url?: string; path?: string }) {
  return [req.originalUrl, req.url, req.path]
    .some((value) => isStageAssetDeliveryPath(pathnameWithoutQuery(value)));
}

export function stageAssetDeliveryAuditMetadata(input: { assetId: string; status: number }) {
  return {
    status: input.status,
    assetIdDigest: createHash('sha256').update(input.assetId).digest('hex').slice(0, 16),
  };
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
