/**
 * Controlled one-room seed. Defaults to dry-run; production execution requires
 * --apply and is deliberately separate from the global ROOM_STAGE_ENABLED flag.
 */
import { PrismaClient } from '@prisma/client';
import { stageActorBindingScopeKey, stageKpDirectorScopeKey } from '../src/modules/rooms/stage/stage-actors';
import { resolveWusoanThemeAssetUpdate, validateWusoanGraySeedPlan } from './stage-wusoan-gray-seed.logic';

const prisma = new PrismaClient();
const option = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

async function main() {
  const roomId = option('--room') ?? 'WUSOAN';
  const kpUserId = option('--kp-user');
  const plUserId = option('--pl-user');
  const backgroundAssetId = option('--background');
  const kpPortraitAssetId = option('--kp-portrait');
  const plPortraitAssetId = option('--pl-portrait');
  const bgmAssetId = option('--bgm');
  const apply = process.argv.includes('--apply');
  const enableRoomStage = process.argv.includes('--enable-room-stage');
  if (roomId !== 'WUSOAN') throw new Error('this gray seed is locked to WUSOAN; --room cannot target another room');
  if (![kpUserId, plUserId, backgroundAssetId, kpPortraitAssetId, plPortraitAssetId, bgmAssetId].every(Boolean)) {
    throw new Error('usage: --room WUSOAN --kp-user <id> --pl-user <id> --background <assetId> --kp-portrait <assetId> --pl-portrait <assetId> --bgm <assetId> [--apply --enable-room-stage]');
  }
  const room = await prisma.room.findUnique({ where: { roomId }, include: { members: true } });
  if (!room) throw new Error('room not found');
  const assets = await prisma.stageAsset.findMany({ where: { id: { in: [backgroundAssetId!, kpPortraitAssetId!, plPortraitAssetId!, bgmAssetId!] }, roomId: room.id, deletedAt: null } });
  const assetIds = { background: backgroundAssetId!, kpPortrait: kpPortraitAssetId!, plPortrait: plPortraitAssetId!, bgm: bgmAssetId! };
  validateWusoanGraySeedPlan({ room, kpUserId: kpUserId!, plUserId: plUserId!, assets, assetIds });
  const plan = { roomId, roomStageEnabled: enableRoomStage, assets: assets.map((asset) => ({ id: asset.id, kind: asset.kind })), theme: 'WUSOAN-D1-ARCHIVE-V1' };
  if (!apply) return console.log(JSON.stringify({ dryRun: true, plan }, null, 2));

  const result = await prisma.$transaction(async (tx) => {
    // Refresh every authorization/ownership check inside the mutation transaction.
    const currentRoom = await tx.room.findUnique({ where: { roomId: 'WUSOAN' }, include: { members: true } });
    if (!currentRoom) throw new Error('room not found');
    const currentAssets = await tx.stageAsset.findMany({ where: { id: { in: Object.values(assetIds) }, roomId: currentRoom.id, deletedAt: null } });
    const validated = validateWusoanGraySeedPlan({ room: currentRoom, kpUserId: kpUserId!, plUserId: plUserId!, assets: currentAssets, assetIds });
    let channel = await tx.stageChannel.findFirst({ where: { roomId: currentRoom.id, scopeKey: 'main' } });
    if (!channel) channel = await tx.stageChannel.create({ data: { roomId: currentRoom.id, kind: 'MAIN_ROOM', scopeKey: 'main', status: 'ACTIVE', revision: 0, participantUserIds: '[]' } });
    const eventCount = await tx.stageEvent.count({ where: { channelId: channel.id } });
    if (eventCount > 0) throw new Error('refusing to overwrite a live stage timeline');
    const kpUser = await tx.user.findUnique({ where: { id: kpUserId! }, select: { nickname: true } });
    const kpDirectorName = kpUser?.nickname?.trim() ? `${kpUser.nickname.trim()}（导演）` : 'KP 导演';
    const director = await tx.stageActorState.upsert({
      where: { channelId_scopeKey: { channelId: channel.id, scopeKey: stageKpDirectorScopeKey({ userId: kpUserId! }) } },
      update: { actorKind: 'TEMPORARY', ownerUserId: kpUserId!, characterId: null, temporaryName: kpDirectorName, zone: 'backstage', entered: false, visibility: 'KP_ONLY', portraitPackId: null, portraitVariantId: null },
      create: { channelId: channel.id, scopeKey: stageKpDirectorScopeKey({ userId: kpUserId! }), actorKind: 'TEMPORARY', ownerUserId: kpUserId!, temporaryName: kpDirectorName, zone: 'backstage', entered: false, visibility: 'KP_ONLY', stateJson: '{}' },
    });
    // Only the bound PLAYER receives a portrait pack, variant, and player actor.
    const plMember = validated.pl;
    const packName = `WUSOAN-D1-${plUserId!}`;
    let pack = await tx.portraitPack.findFirst({ where: { roomId: currentRoom.id, ownerUserId: plUserId!, characterId: plMember.characterId!, name: packName } });
    if (!pack) pack = await tx.portraitPack.create({ data: { roomId: currentRoom.id, ownerUserId: plUserId!, characterId: plMember.characterId!, name: packName } });
    let variant = await tx.portraitVariant.findFirst({ where: { packId: pack.id, label: 'stage-default' } });
    if (variant && variant.assetId !== plPortraitAssetId) throw new Error('existing WUSOAN portrait variant references a different asset');
    if (!variant) variant = await tx.portraitVariant.create({ data: { packId: pack.id, assetId: plPortraitAssetId!, label: 'stage-default', expression: 'neutral' } });
    if (!pack.defaultVariantId) await tx.portraitPack.update({ where: { id: pack.id }, data: { defaultVariantId: variant.id } });
    const plActor = await tx.stageActorState.upsert({
      where: { channelId_scopeKey: { channelId: channel.id, scopeKey: stageActorBindingScopeKey({ userId: plUserId!, characterId: plMember.characterId! }) } },
      update: { zone: 'right', entered: true, portraitPackId: pack.id, portraitVariantId: variant.id },
      create: { channelId: channel.id, scopeKey: stageActorBindingScopeKey({ userId: plUserId!, characterId: plMember.characterId! }), actorKind: 'PLAYER_CHARACTER', ownerUserId: plUserId!, characterId: plMember.characterId!, zone: 'right', entered: true, visibility: 'PUBLIC', portraitPackId: pack.id, portraitVariantId: variant.id, stateJson: '{}' },
    });
    const character = await tx.character.findUnique({ where: { id: plMember.characterId! }, select: { name: true } });
    const themeAssetIds = [backgroundAssetId!, kpPortraitAssetId!, plPortraitAssetId!, bgmAssetId!];
    let theme = await tx.stageThemePack.findFirst({ where: { roomId: currentRoom.id, name: 'WUSOAN-D1-ARCHIVE-V1' } });
    let themeAction: 'created' | 'noop' | 'updated' = 'created';
    if (!theme) {
      theme = await tx.stageThemePack.create({ data: { roomId: currentRoom.id, name: 'WUSOAN-D1-ARCHIVE-V1', createdById: kpUserId!, manifestJson: JSON.stringify({ palette: 'deep-sea-cyan-and-ritual-gold', version: 1 }), assetIdsJson: JSON.stringify(themeAssetIds) } });
    } else {
      const update = resolveWusoanThemeAssetUpdate(theme.assetIdsJson, themeAssetIds);
      if (update.action === 'update') {
        theme = await tx.stageThemePack.update({ where: { id: theme.id }, data: { assetIdsJson: update.assetIdsJson, version: { increment: 1 } } });
        themeAction = 'updated';
      } else {
        themeAction = 'noop';
      }
    }
    const projection = {
      contractVersion: 'stage.d1a.v1.1', channel: { id: channel.id, kind: 'MAIN_ROOM', roomId }, revision: channel.revision,
      serverTime: new Date().toISOString(), viewer: { userId: kpUserId, kind: 'KP', roomRole: 'OWNER_KP' },
      capabilities: { canUseStage: true, canControlOwnStageActor: false, canManageStage: true, canManageStageAssets: true, canExportStageReplay: true },
      scene: { title: '深海秘仪档案馆', backgroundAssetId, bgmAssetId, themePackId: theme.id },
      actors: [
        { actorId: director.id, actorKind: 'TEMPORARY', ownerUserId: kpUserId!, name: kpDirectorName, zone: 'backstage', entered: false, visibility: 'KP_ONLY' },
        { actorId: plActor.id, actorKind: 'PLAYER_CHARACTER', ownerUserId: plUserId!, characterId: plMember.characterId!, name: character?.name ?? '调查员', zone: 'right', entered: true, portraitAssetId: plPortraitAssetId, visibility: 'PUBLIC' },
      ],
      assetRefs: currentAssets.map((asset) => ({ assetId: asset.id, kind: asset.kind, version: asset.version, proxyUrl: '', hash: asset.hash })),
    };
    await tx.stageSnapshot.upsert({ where: { channelId_revision: { channelId: channel.id, revision: channel.revision } }, update: { contractVersion: 'stage.d1a.v1.1', projectionJson: JSON.stringify(projection) }, create: { channelId: channel.id, roomId: currentRoom.id, revision: channel.revision, contractVersion: 'stage.d1a.v1.1', projectionJson: JSON.stringify(projection) } });
    if (enableRoomStage) {
      // Enable is a separately requested mutation and repeats the same gate.
      validateWusoanGraySeedPlan({ room: currentRoom, kpUserId: kpUserId!, plUserId: plUserId!, assets: currentAssets, assetIds });
      await tx.room.update({ where: { id: currentRoom.id }, data: { stageEnabled: true } });
    }
    return { themeAction, themeId: theme.id };
  });
  console.log(JSON.stringify({ applied: true, roomId, stageEnabled: enableRoomStage, ...result }));
}

main().finally(() => prisma.$disconnect());
