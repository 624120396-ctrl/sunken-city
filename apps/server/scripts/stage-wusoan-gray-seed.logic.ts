export type WusoanSeedMember = {
  userId: string;
  role: string;
  leftAt: Date | null;
  characterId: string | null;
};

export type WusoanSeedAsset = {
  id: string;
  roomId: string;
  uploadedById: string;
  kind: string;
  visibility: string;
};

export function validateWusoanGraySeedPlan(input: {
  room: { id: string; roomId: string; creatorId: string; members: WusoanSeedMember[] };
  kpUserId: string;
  plUserId: string;
  assets: WusoanSeedAsset[];
  assetIds: { background: string; kpPortrait: string; plPortrait: string; bgm: string };
}) {
  if (input.room.roomId !== 'WUSOAN') throw new Error('this gray seed is locked to WUSOAN');
  if (input.kpUserId === input.plUserId) throw new Error('KP and PL must be different users');
  const active = new Map(input.room.members.filter((member) => !member.leftAt).map((member) => [member.userId, member]));
  const kp = active.get(input.kpUserId);
  const pl = active.get(input.plUserId);
  if (!kp || (kp.role !== 'KP' && input.room.creatorId !== kp.userId)) throw new Error('KP must be an active KP room member');
  if (!pl || pl.role !== 'PLAYER' || !pl.characterId) throw new Error('PL must be an active PLAYER with a bound character');
  if (!kp.characterId) throw new Error('KP must be an active member with a bound character');

  const required = [
    ['background', input.assetIds.background, 'BACKGROUND', input.kpUserId],
    ['kp portrait', input.assetIds.kpPortrait, 'PORTRAIT', input.kpUserId],
    ['pl portrait', input.assetIds.plPortrait, 'PORTRAIT', input.plUserId],
    ['bgm', input.assetIds.bgm, 'BGM', input.kpUserId],
  ] as const;
  if (new Set(required.map(([, id]) => id)).size !== required.length) throw new Error('each seed asset must be distinct');
  const assets = new Map(input.assets.map((asset) => [asset.id, asset]));
  for (const [label, id, kind, ownerUserId] of required) {
    const asset = assets.get(id);
    if (!asset || asset.roomId !== input.room.id) throw new Error(`${label} asset must belong to the WUSOAN room`);
    if (asset.kind !== kind) throw new Error(`${label} asset must be ${kind}`);
    if (asset.visibility !== 'PRIVATE_ROOM') throw new Error(`${label} asset must use PRIVATE_ROOM visibility`);
    if (asset.uploadedById !== ownerUserId) throw new Error(`${label} asset must be owned by its stage participant`);
  }
  return { kp, pl, assets };
}
