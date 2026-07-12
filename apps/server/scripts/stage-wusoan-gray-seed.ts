/**
 * Controlled one-room seed. Defaults to dry-run; production execution requires
 * --apply and is deliberately separate from the global ROOM_STAGE_ENABLED flag.
 */
import { PrismaClient } from '@prisma/client';
import { stageActorBindingScopeKey } from '../src/modules/rooms/stage/stage-actors';

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
  if (![kpUserId, plUserId, backgroundAssetId, kpPortraitAssetId, plPortraitAssetId, bgmAssetId].every(Boolean)) {
    throw new Error('usage: --room WUSOAN --kp-user <id> --pl-user <id> --background <assetId> --kp-portrait <assetId> --pl-portrait <assetId> --bgm <assetId> [--apply --enable-room-stage]');
  }
  const room = await prisma.room.findUnique({ where: { roomId }, include: { members: { where: { leftAt: null } } } });
  if (!room) throw new Error('room not found');
  const users = [kpUserId!, plUserId!];
  const members = room.members.filter((member) => users.includes(member.userId));
  if (members.length !== 2 && room.creatorId !== kpUserId) throw new Error('KP/PL must be active room participants');
  const assets = await prisma.stageAsset.findMany({ where: { id: { in: [backgroundAssetId!, kpPortraitAssetId!, plPortraitAssetId!, bgmAssetId!] }, roomId: room.id, deletedAt: null } });
  if (assets.length !== 4) throw new Error('all four assets must exist in this room before seeding');
  const plan = { roomId, roomStageEnabled: enableRoomStage, assets: assets.map((asset) => ({ id: asset.id, kind: asset.kind })), theme: 'WUSOAN-D1-ARCHIVE-V1' };
  if (!apply) return console.log(JSON.stringify({ dryRun: true, plan }, null, 2));

  await prisma.$transaction(async (tx) => {
    let channel = await tx.stageChannel.findFirst({ where: { roomId: room.id, scopeKey: 'main' } });
    if (!channel) channel = await tx.stageChannel.create({ data: { roomId: room.id, kind: 'MAIN_ROOM', scopeKey: 'main', status: 'ACTIVE', revision: 0, participantUserIds: '[]' } });
    const eventCount = await tx.stageEvent.count({ where: { channelId: channel.id } });
    if (eventCount > 0) throw new Error('refusing to overwrite a live stage timeline');
    const memberByUserId = new Map(members.map((member) => [member.userId, member]));
    const actorRows = await Promise.all([kpUserId!, plUserId!].map(async (userId, index) => {
      const member = memberByUserId.get(userId);
      if (!member?.characterId) throw new Error('both seed users need a bound room character');
      return tx.stageActorState.upsert({
        where: { channelId_scopeKey: { channelId: channel!.id, scopeKey: stageActorBindingScopeKey({ userId, characterId: member.characterId }) } },
        update: { zone: index === 0 ? 'left' : 'right', entered: true, portraitVariantId: index === 0 ? kpPortraitAssetId : plPortraitAssetId },
        create: { channelId: channel!.id, scopeKey: stageActorBindingScopeKey({ userId, characterId: member.characterId }), actorKind: 'PLAYER_CHARACTER', ownerUserId: userId, characterId: member.characterId, zone: index === 0 ? 'left' : 'right', entered: true, visibility: 'PUBLIC', portraitVariantId: index === 0 ? kpPortraitAssetId : plPortraitAssetId, stateJson: '{}' },
      });
    }));
    const characters = await tx.character.findMany({ where: { id: { in: actorRows.map((actor) => actor.characterId).filter(Boolean) as string[] } }, select: { id: true, name: true } });
    const characterNames = new Map(characters.map((character) => [character.id, character.name]));
    const theme = await tx.stageThemePack.findFirst({ where: { roomId: room.id, name: 'WUSOAN-D1-ARCHIVE-V1' } })
      ?? await tx.stageThemePack.create({ data: { roomId: room.id, name: 'WUSOAN-D1-ARCHIVE-V1', createdById: kpUserId!, manifestJson: JSON.stringify({ palette: 'deep-sea-cyan-and-ritual-gold', version: 1 }), assetIdsJson: JSON.stringify([backgroundAssetId, kpPortraitAssetId, plPortraitAssetId, bgmAssetId]) } });
    const projection = {
      contractVersion: 'stage.d1a.v1.1', channel: { id: channel.id, kind: 'MAIN_ROOM', roomId }, revision: channel.revision,
      serverTime: new Date().toISOString(), viewer: { userId: kpUserId, kind: 'KP', roomRole: 'OWNER_KP' },
      capabilities: { canUseStage: true, canControlOwnStageActor: false, canManageStage: true, canManageStageAssets: true, canExportStageReplay: true },
      scene: { title: '深海秘仪档案馆', backgroundAssetId, bgmAssetId, themePackId: theme.id },
      actors: actorRows.map((actor, index) => ({ actorId: actor.id, actorKind: 'PLAYER_CHARACTER', ownerUserId: actor.ownerUserId!, characterId: actor.characterId!, name: characterNames.get(actor.characterId!) ?? '调查员', zone: index === 0 ? 'left' : 'right', entered: true, portraitAssetId: index === 0 ? kpPortraitAssetId : plPortraitAssetId, visibility: 'PUBLIC' })),
      assetRefs: assets.map((asset) => ({ assetId: asset.id, kind: asset.kind, version: asset.version, proxyUrl: '', hash: asset.hash })),
    };
    await tx.stageSnapshot.upsert({ where: { channelId_revision: { channelId: channel.id, revision: channel.revision } }, update: { contractVersion: 'stage.d1a.v1.1', projectionJson: JSON.stringify(projection) }, create: { channelId: channel.id, roomId: room.id, revision: channel.revision, contractVersion: 'stage.d1a.v1.1', projectionJson: JSON.stringify(projection) } });
    if (enableRoomStage) await tx.room.update({ where: { id: room.id }, data: { stageEnabled: true } });
  });
  console.log(JSON.stringify({ applied: true, roomId, stageEnabled: enableRoomStage }));
}

main().finally(() => prisma.$disconnect());
