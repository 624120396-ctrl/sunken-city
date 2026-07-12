type StageActorStore = {
  stageActorState: {
    upsert: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
  };
};

export function stageActorBindingScopeKey(input: { userId: string; characterId: string }) {
  return `binding:${input.userId}:${input.characterId}`;
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
