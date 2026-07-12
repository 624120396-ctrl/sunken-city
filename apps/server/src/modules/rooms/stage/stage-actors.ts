type StageActorStore = {
  stageActorState: {
    upsert: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
  };
};

export function stageActorBindingScopeKey(input: { userId: string; characterId: string }) {
  return `binding:${input.userId}:${input.characterId}`;
}

type StageActorProjection = {
  actorId: string;
  actorKind: string;
  ownerUserId?: string;
  characterId?: string;
  name?: string;
  zone?: string;
  entered?: boolean;
  visibility?: string;
  [key: string]: unknown;
};

function bindingScopeForActor(actor: StageActorProjection) {
  return actor.actorKind === 'PLAYER_CHARACTER' && actor.ownerUserId && actor.characterId
    ? stageActorBindingScopeKey({ userId: actor.ownerUserId, characterId: actor.characterId })
    : undefined;
}

/**
 * Snapshot actors are only actionable while backed by a current StageActorState.
 * A persisted snapshot may predate a dedupe migration, so resolve old binding
 * ids onto the live state and drop every actor without a current state.
 */
export function canonicalizeStageActors(stored: StageActorProjection[], active: StageActorProjection[]) {
  const activeById = new Map(active.map((actor) => [actor.actorId, actor]));
  const activeByBinding = new Map(active.flatMap((actor) => {
    const scope = bindingScopeForActor(actor);
    return scope ? [[scope, actor] as const] : [];
  }));
  const overrides = new Map<string, StageActorProjection>();
  for (const actor of stored) {
    const current = bindingScopeForActor(actor)
      ? activeByBinding.get(bindingScopeForActor(actor)!)
      : activeById.get(actor.actorId);
    if (!current) continue;
    const previous = overrides.get(current.actorId);
    if (!previous || actor.actorId === current.actorId) overrides.set(current.actorId, actor);
  }
  return active.map((current) => {
    const storedActor = overrides.get(current.actorId);
    if (!storedActor) return current;
    const merged: StageActorProjection = {
      ...current,
      ...storedActor,
      actorId: current.actorId,
      actorKind: current.actorKind,
      name: current.name,
      visibility: current.visibility,
    };
    if (current.ownerUserId) merged.ownerUserId = current.ownerUserId;
    else delete merged.ownerUserId;
    if (current.characterId) merged.characterId = current.characterId;
    else delete merged.characterId;
    return merged;
  });
}

export function findCanonicalStageActor(actors: StageActorProjection[], actorId: string) {
  return actors.find((actor) => actor.actorId === actorId);
}

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === 'P2002');
}

/**
 * The compound non-null scope key makes a bound player actor idempotent across
 * parallel tabs. The P2002 read is retained for Prisma engines that emulate
 * compound upsert with a read/create sequence.
 */
export async function ensureBoundStageActor(input: {
  client: StageActorStore;
  channelId: string;
  member?: { userId: string; characterId?: string | null } | null;
}) {
  if (!input.member?.characterId) return null;
  const scopeKey = stageActorBindingScopeKey({ userId: input.member.userId, characterId: input.member.characterId });
  const where = { channelId_scopeKey: { channelId: input.channelId, scopeKey } };
  try {
    return await input.client.stageActorState.upsert({
      where,
      update: {},
      create: {
        channelId: input.channelId,
        scopeKey,
        actorKind: 'PLAYER_CHARACTER',
        ownerUserId: input.member.userId,
        characterId: input.member.characterId,
        zone: 'center',
        entered: false,
        visibility: 'PUBLIC',
        stateJson: '{}',
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const existing = await input.client.stageActorState.findUnique({ where });
    if (existing) return existing;
    throw error;
  }
}
