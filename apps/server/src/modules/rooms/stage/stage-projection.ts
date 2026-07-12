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
  contractVersion: 'stage.d1a.v1.1';
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

/**
 * Advances the stored projection together with the immutable event log.  The
 * result is what the snapshot endpoint returns after a revision conflict.
 */
export function applyStageCommandToProjection(input: {
  projection: any;
  revision: number;
  commandType: string;
  payload: Record<string, unknown>;
}) {
  const projection = {
    ...input.projection,
    contractVersion: 'stage.d1a.v1.1',
    revision: input.revision,
    serverTime: new Date().toISOString(),
    scene: { ...(input.projection.scene ?? { title: '共享舞台' }) },
    actors: [...(input.projection.actors ?? [])],
  };
  const actorId = typeof input.payload.actorId === 'string' ? input.payload.actorId : undefined;
  const actorIndex = actorId ? projection.actors.findIndex((actor: { actorId: string }) => actor.actorId === actorId) : -1;
  if (input.commandType === 'ACTOR_ENTER' && actorIndex >= 0) {
    projection.actors[actorIndex] = { ...projection.actors[actorIndex], entered: true, zone: input.payload.zone, ...(input.payload.expression ? { expression: input.payload.expression } : {}), ...(input.payload.action ? { action: input.payload.action } : {}) };
  }
  if (input.commandType === 'ACTOR_EXIT' && actorIndex >= 0) {
    projection.actors[actorIndex] = { ...projection.actors[actorIndex], entered: false };
  }
  if (input.commandType === 'ACTOR_PERFORM' && actorIndex >= 0) {
    projection.actors[actorIndex] = { ...projection.actors[actorIndex], action: input.payload.action, ...(input.payload.expression ? { expression: input.payload.expression } : {}) };
  }
  if (input.commandType === 'SCENE_SET') {
    projection.scene = { ...input.payload };
  }
  if (input.commandType === 'SCENE_CLEAR') {
    projection.scene = { title: '共享舞台' };
  }
  return projection;
}
