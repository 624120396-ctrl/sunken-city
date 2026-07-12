export function canViewerSeeActor(input: {
  visibility: 'PUBLIC' | 'KP_ONLY' | 'PRIVATE_TARGETS';
  viewerUserId: string;
  viewerCanManageStage: boolean;
  targetUserIds?: string[];
}) {
  if (input.visibility === 'PUBLIC') return true;
  if (input.viewerCanManageStage) return true;
  if (input.visibility === 'PRIVATE_TARGETS') return (input.targetUserIds ?? []).includes(input.viewerUserId);
  return false;
}

export function trimStageAssetRefs<T extends {
  visibility: string;
  proxyUrl: string;
  storageKey?: string;
  allowedUserIds?: string[];
}>(input: {
  assets: T[];
  viewerUserId: string;
  viewerCanManageStage: boolean;
}) {
  return input.assets
    .filter((asset) => (
      asset.visibility === 'PUBLIC' ||
      input.viewerCanManageStage ||
      (asset.allowedUserIds ?? []).includes(input.viewerUserId)
    ))
    .map(({ storageKey: _storageKey, allowedUserIds: _allowedUserIds, ...safe }) => safe);
}

export function serializeStageSnapshot(input: {
  contractVersion: 'stage.d1a.v1';
  channel: { id: string; kind: 'MAIN_ROOM' | 'SUB_ROOM' | 'PRIVATE_THREAD'; roomId: string };
  revision: number;
  projection: unknown;
}) {
  return {
    contractVersion: input.contractVersion,
    channel: input.channel,
    revision: input.revision,
    projection: input.projection,
  };
}
