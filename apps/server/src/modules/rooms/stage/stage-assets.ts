export function authorizeStageAssetRead(input: {
  visibility: 'PUBLIC' | 'PRIVATE_ROOM' | 'KP_ONLY' | 'PRIVATE_TARGETS';
  viewerUserId: string;
  roomUserIds: string[];
  targetUserIds?: string[];
  canManageStage: boolean;
}) {
  if (input.visibility === 'PUBLIC') return true;
  if (input.canManageStage) return true;
  if (input.visibility === 'PRIVATE_ROOM') return input.roomUserIds.includes(input.viewerUserId);
  if (input.visibility === 'PRIVATE_TARGETS') return (input.targetUserIds ?? []).includes(input.viewerUserId);
  return false;
}

export function createStageAssetDeliverySignature(input: {
  assetId: string;
  version: number;
  viewerUserId: string;
  expiresAt: number;
  secret: string;
  deliveryOrigin: string;
}) {
  return createHmac('sha256', input.secret)
    .update(`${input.deliveryOrigin}:${input.assetId}:${input.version}:${input.viewerUserId}:${input.expiresAt}`)
    .digest('hex');
}

/**
 * Creates an expiring URL for a separately configured private asset delivery
 * service. The application never returns a storage key and cannot fall back to
 * the API endpoint itself as a fake proxy.
 */
export function issueStageAssetDeliveryUrl(input: {
  assetId: string;
  version: number;
  viewerUserId: string;
  nowMs?: number;
  baseUrl?: string;
  secret?: string;
}) {
  const baseUrl = input.baseUrl ?? process.env.STAGE_ASSET_DELIVERY_BASE_URL;
  const secret = input.secret ?? process.env.STAGE_ASSET_DELIVERY_SECRET;
  if (!baseUrl || !secret) return null;
  let deliveryOrigin: string;
  try {
    deliveryOrigin = new URL(baseUrl).origin;
  } catch {
    return null;
  }
  const expiresAt = Math.floor((input.nowMs ?? Date.now()) / 1_000) + 300;
  const signature = createStageAssetDeliverySignature({
    assetId: input.assetId,
    version: input.version,
    viewerUserId: input.viewerUserId,
    expiresAt,
    secret,
    deliveryOrigin,
  });
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(input.assetId)}`);
  url.searchParams.set('v', String(input.version));
  url.searchParams.set('e', String(expiresAt));
  url.searchParams.set('u', input.viewerUserId);
  url.searchParams.set('sig', signature);
  return url.toString();
}

const blockedThemeKeys = new Set(['html', 'script', 'javascript', 'remoteScriptUrl', 'styleTag']);

export function validateThemeManifest(input: Record<string, unknown>) {
  for (const key of Object.keys(input)) {
    if (blockedThemeKeys.has(key)) {
      return { ok: false as const, code: 'STAGE_INVALID_PAYLOAD' as const, field: key };
    }
  }
  return { ok: true as const };
}
import { createHmac } from 'node:crypto';
