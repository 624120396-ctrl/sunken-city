import type { StageViewModel } from './stage-view-model';

export function selectStageMessageTargets(model: StageViewModel) {
  const seen = new Set<string>();
  return model.actors.flatMap((actor) => {
    if (!actor.ownerUserId || actor.ownerUserId === model.viewer.userId || seen.has(actor.ownerUserId)) return [];
    seen.add(actor.ownerUserId);
    return [{ userId: actor.ownerUserId, label: actor.name }];
  });
}

export function canSubmitStageComposer(input: { content: string; channelKind: StageViewModel['channelKind']; targetUserId?: string }) {
  return Boolean(input.content.trim()) && (input.channelKind !== 'PRIVATE_THREAD' || Boolean(input.targetUserId));
}

export function shouldClearStageComposer(result: unknown) {
  return Boolean(result && typeof result === 'object' && (result as { accepted?: boolean }).accepted);
}
