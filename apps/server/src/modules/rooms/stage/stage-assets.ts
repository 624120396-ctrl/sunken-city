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

export function buildStageAssetProxyUrl(input: { publicRoomId: string; assetId: string; version: number }) {
  return `/api/rooms/${encodeURIComponent(input.publicRoomId)}/stage/assets/${encodeURIComponent(input.assetId)}/proxy?v=${input.version}`;
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
