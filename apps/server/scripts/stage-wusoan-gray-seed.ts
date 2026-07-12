/**
 * Controlled one-room seed. Defaults to dry-run; production execution requires
 * --apply and is deliberately separate from the global ROOM_STAGE_ENABLED flag.
 */
import { PrismaClient } from '@prisma/client';
import { stageActorBindingScopeKey } from '../src/modules/rooms/stage/stage-actors';
import { validateWusoanGraySeedPlan } from './stage-wusoan-gray-seed.logic';

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

  await prisma.$transaction(async (tx) => {
    // Refresh every authorization/ownership check inside the mutation transaction.
    const currentRoom = await tx.room.findUnique({ where: { roomId: 'WUSOAN' }, include: { members: true } });
    if (!currentRoom) throw new Error('room not found');
    const currentAssets = await tx.stageAsset.findMany({ where: { id: { in: Object.values(assetIds) }, roomId: currentRoom.id, deletedAt: null } });
    const validated = validateWusoanGraySeedPlan({ room: currentRoom, kpUserId: kpUserId!, plUserId: plUserId!, assets: currentAssets, assetIds });
    let channel = await tx.stageChannel.findFirst({ where: { roomId: currentRoom.id, scopeKey: 'main' } });
    if (!channel) channel = await tx.stageChannel.create({ data: { roomId: currentRoom.id, kind: 'MAIN_ROOM', scopeKey: 'main', status: 'ACTIVE', revision: 0, participantUserIds: '[]' } });
    const eventCount = await tx.stageEvent.count({ where: { channelId: channel.id } });
    if (eventCount > 0) throw new Error('refusing to overwrite a live stage timeline');
    const participantRows = [
      { userId: kpUserId!, member: validated.kp, portraitAssetId: kpPortraitAssetId!, zone: 'left' },
      { userId: plUserId!, member: validated.pl, portraitAssetId: plPortraitAssetId!, zone: 'right' },
    ] as const;
    const actorRows = [];
    for (const participant of participantRows) {
      const packName = `WUSOAN-D1-${participant.userId}`;
      let pack = await tx.portraitPack.findFirst({ where: { roomId: currentRoom.id, ownerUserId: participant.userId, characterId: participant.member.characterId!, name: packName } });
      if (!pack) pack = await tx.portraitPack.create({ data: { roomId: currentRoom.id, ownerUserId: participant.userId, characterId: participant.member.characterId!, name: packName } });
      let variant = await tx.portraitVariant.findFirst({ where: { packId: pack.id, label: 'stage-default' } });
      if (variant && variant.assetId !== participant.portraitAssetId) throw new Error('existing WUSOAN portrait variant references a different asset');
      if (!variant) variant = await tx.portraitVariant.create({ data: { packId: pack.id, assetId: participant.portraitAssetId, label: 'stage-default', expression: 'neutral' } });
      if (!pack.defaultVariantId) await tx.portraitPack.update({ where: { id: pack.id }, data: { defaultVariantId: variant.id } });
      const actor = await tx.stageActorState.upsert({
        where: { channelId_scopeKey: { channelId: channel.id, scopeKey: stageActorBindingScopeKey({ userId: participant.userId, characterId: participant.member.characterId! }) } },
        update: { zone: participant.zone, entered: true, portraitPackId: pack.id, portraitVariantId: variant.id },
        create: { channelId: channel.id, scopeKey: stageActorBindingScopeKey({ userId: participant.userId, characterId: participant.member.characterId! }), actorKind: 'PLAYER_CHARACTER', ownerUserId: participant.userId, characterId: participant.member.characterId!, zone: participant.zone, entered: true, visibility: 'PUBLIC', portraitPackId: pack.id, portraitVariantId: variant.id, stateJson: '{}' },
      });
      actorRows.push(actor);
    }
    const characters = await tx.character.findMany({ where: { id: { in: actorRows.map((actor) => actor.characterId).filter(Boolean) as string[] } }, select: { id: true, name: true } });
    const characterNames = new Map(characters.map((character) => [character.id, character.name]));
    const theme = await tx.stageThemePack.findFirst({ where: { roomId: currentRoom.id, name: 'WUSOAN-D1-ARCHIVE-V1' } })
      ?? await tx.stageThemePack.create({ data: { roomId: currentRoom.id, name: 'WUSOAN-D1-ARCHIVE-V1', createdById: kpUserId!, manifestJson: JSON.stringify({ palette: 'deep-sea-cyan-and-ritual-gold', version: 1 }), assetIdsJson: JSON.stringify([backgroundAssetId, kpPortraitAssetId, plPortraitAssetId, bgmAssetId]) } });
    const projection = {
      contractVersion: 'stage.d1a.v1.1', channel: { id: channel.id, kind: 'MAIN_ROOM', roomId }, revision: channel.revision,
      serverTime: new Date().toISOString(), viewer: { userId: kpUserId, kind: 'KP', roomRole: 'OWNER_KP' },
      capabilities: { canUseStage: true, canControlOwnStageActor: false, canManageStage: true, canManageStageAssets: true, canExportStageReplay: true },
      scene: { title: '深海秘仪档案馆', backgroundAssetId, bgmAssetId, themePackId: theme.id },
      actors: actorRows.map((actor, index) => ({ actorId: actor.id, actorKind: 'PLAYER_CHARACTER', ownerUserId: actor.ownerUserId!, characterId: actor.characterId!, name: characterNames.get(actor.characterId!) ?? '调查员', zone: index === 0 ? 'left' : 'right', entered: true, portraitAssetId: index === 0 ? kpPortraitAssetId : plPortraitAssetId, visibility: 'PUBLIC' })),
      assetRefs: currentAssets.map((asset) => ({ assetId: asset.id, kind: asset.kind, version: asset.version, proxyUrl: '', hash: asset.hash })),
    };
    await tx.stageSnapshot.upsert({ where: { channelId_revision: { channelId: channel.id, revision: channel.revision } }, update: { contractVersion: 'stage.d1a.v1.1', projectionJson: JSON.stringify(projection) }, create: { channelId: channel.id, roomId: currentRoom.id, revision: channel.revision, contractVersion: 'stage.d1a.v1.1', projectionJson: JSON.stringify(projection) } });
    if (enableRoomStage) {
      // Enable is a separately requested mutation and repeats the same gate.
      validateWusoanGraySeedPlan({ room: currentRoom, kpUserId: kpUserId!, plUserId: plUserId!, assets: currentAssets, assetIds });
      await tx.room.update({ where: { id: currentRoom.id }, data: { stageEnabled: true } });
    }
  });
  console.log(JSON.stringify({ applied: true, roomId, stageEnabled: enableRoomStage }));
}

main().finally(() => prisma.$disconnect());
