import type {
  StageAssetKind,
  StageAssetRef,
  StageEvent,
  StageSnapshot,
  StageZone,
} from '../../../../shared/stage/stage-contract';

type StageViewAsset = Pick<StageAssetRef, 'assetId' | 'proxyUrl' | 'kind' | 'durationMs'>;

export type StageViewModel = {
  channelId: string;
  channelKind: StageSnapshot['channel']['kind'];
  revision: number;
  scene: {
    title: string;
    description?: string;
    themePackId?: string;
    background?: StageViewAsset;
    bgm?: StageViewAsset;
    ambience?: StageViewAsset;
  };
  actors: Array<{
    actorId: string;
    ownerUserId?: string;
    name: string;
    zone: StageZone;
    entered: boolean;
    expression?: string;
    action?: string;
    portrait?: StageViewAsset;
    visibility: string;
  }>;
  capabilities: StageSnapshot['projection']['capabilities'];
  viewer: StageSnapshot['projection']['viewer'];
};

function findAsset(assetRefs: StageAssetRef[], assetId: string | undefined, kind: StageAssetKind) {
  if (!assetId) return undefined;
  const asset = assetRefs.find((entry) => entry.assetId === assetId && entry.kind === kind);
  return asset && { assetId: asset.assetId, proxyUrl: asset.proxyUrl, kind: asset.kind, durationMs: asset.durationMs };
}

export function createStageViewModel(snapshot: StageSnapshot): StageViewModel {
  const { projection } = snapshot;
  return {
    channelId: snapshot.channel.id,
    channelKind: snapshot.channel.kind,
    revision: snapshot.revision,
    scene: {
      title: projection.scene.title,
      description: projection.scene.description,
      themePackId: projection.scene.themePackId,
      background: findAsset(projection.assetRefs, projection.scene.backgroundAssetId, 'BACKGROUND'),
      bgm: findAsset(projection.assetRefs, projection.scene.bgmAssetId, 'BGM'),
      ambience: findAsset(projection.assetRefs, projection.scene.ambienceAssetId, 'AMBIENCE'),
    },
    actors: projection.actors.map((actor) => ({
      actorId: actor.actorId,
      ownerUserId: actor.ownerUserId,
      name: actor.name,
      zone: actor.zone,
      entered: actor.entered,
      expression: actor.expression,
      action: actor.action,
      portrait: findAsset(projection.assetRefs, actor.portraitAssetId, 'PORTRAIT'),
      visibility: actor.visibility,
    })),
    capabilities: projection.capabilities,
    viewer: projection.viewer,
  };
}

export function applyStageEvent(snapshot: StageSnapshot, event: StageEvent): StageSnapshot | undefined {
  if (event.channelId !== snapshot.channel.id || event.beforeRevision !== snapshot.revision || event.afterRevision !== snapshot.revision + 1) {
    return undefined;
  }

  const actors = snapshot.projection.actors.map((actor) => ({ ...actor }));
  const scene = { ...snapshot.projection.scene };
  switch (event.eventType) {
    case 'ACTOR_ENTER':
      const enterIndex = actors.findIndex((actor) => actor.actorId === event.payload.actorId);
      if (enterIndex < 0) return undefined;
      actors[enterIndex] = { ...actors[enterIndex], entered: true, zone: event.payload.zone, expression: event.payload.expression, action: event.payload.action };
      break;
    case 'ACTOR_EXIT':
      const exitIndex = actors.findIndex((actor) => actor.actorId === event.payload.actorId);
      if (exitIndex < 0) return undefined;
      actors[exitIndex] = { ...actors[exitIndex], entered: false };
      break;
    case 'ACTOR_PERFORM':
      const performIndex = actors.findIndex((actor) => actor.actorId === event.payload.actorId);
      if (performIndex < 0) return undefined;
      actors[performIndex] = { ...actors[performIndex], action: event.payload.action, expression: event.payload.expression ?? actors[performIndex].expression };
      break;
    case 'SCENE_SET':
      Object.assign(scene, event.payload);
      break;
    case 'SCENE_CLEAR':
      scene.description = undefined;
      scene.backgroundAssetId = undefined;
      scene.bgmAssetId = undefined;
      scene.ambienceAssetId = undefined;
      break;
    case 'CHANNEL_ENABLE':
    case 'CHANNEL_DISABLE':
      break;
  }

  return {
    ...snapshot,
    revision: event.afterRevision,
    projection: { ...snapshot.projection, revision: event.afterRevision, actors, scene },
  };
}
