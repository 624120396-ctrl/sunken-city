import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilitiesFor } from '../src/modules/rooms/room-auth.ts';
import {
  authorizeStageActorCommand,
  authorizeStageChannelAccess,
} from '../src/modules/rooms/stage/stage-auth.ts';

test('stage capabilities are projected from service-side room role and lifecycle', () => {
  const kp = capabilitiesFor('OWNER_KP', 'IN_PROGRESS');
  assert.equal(kp.canUseStage, true);
  assert.equal(kp.canManageStage, true);
  assert.equal(kp.canManageStageAssets, true);
  assert.equal(kp.canExportStageReplay, true);

  const player = capabilitiesFor('PLAYER', 'IN_PROGRESS');
  assert.equal(player.canUseStage, true);
  assert.equal(player.canControlOwnStageActor, true);
  assert.equal(player.canManageStage, false);

  const observer = capabilitiesFor('OBSERVER', 'IN_PROGRESS');
  assert.equal(observer.canUseStage, true);
  assert.equal(observer.canControlOwnStageActor, false);
  assert.equal(observer.canManageStage, false);

  const closed = capabilitiesFor('PLAYER', 'FINISHED');
  assert.equal(closed.canUseStage, false);
  assert.equal(closed.canControlOwnStageActor, false);
});

test('stage channel access trims sub-room and private-thread viewers on the server', () => {
  const playerCaps = { canUseStage: true, canManageStage: false };
  assert.equal(authorizeStageChannelAccess({
    channel: { kind: 'MAIN_ROOM', roomId: 'r1' },
    userId: 'pl1',
    role: 'PLAYER',
    capabilities: playerCaps,
  }).allowed, true);

  assert.equal(authorizeStageChannelAccess({
    channel: { kind: 'SUB_ROOM', roomId: 'r1', subRoomId: 's1' },
    userId: 'pl1',
    role: 'PLAYER',
    capabilities: playerCaps,
    subRoomMemberUserIds: ['pl2'],
  }).reason, 'NOT_SUB_ROOM_MEMBER');

  assert.equal(authorizeStageChannelAccess({
    channel: { kind: 'PRIVATE_THREAD', roomId: 'r1', privateThreadId: 'p1', participantUserIds: ['kp1', 'pl2'] },
    userId: 'pl1',
    role: 'PLAYER',
    capabilities: playerCaps,
  }).reason, 'NOT_PRIVATE_PARTICIPANT');
});

test('stage actor commands allow own player character and kp managed objects only', () => {
  assert.equal(authorizeStageActorCommand({
    actorKind: 'PLAYER_CHARACTER',
    ownerUserId: 'pl1',
    userId: 'pl1',
    capabilities: { canControlOwnStageActor: true, canManageStage: false },
  }).allowed, true);

  assert.equal(authorizeStageActorCommand({
    actorKind: 'NPC',
    userId: 'pl1',
    capabilities: { canControlOwnStageActor: true, canManageStage: false },
  }).allowed, false);

  assert.equal(authorizeStageActorCommand({
    actorKind: 'NPC',
    userId: 'kp1',
    capabilities: { canControlOwnStageActor: false, canManageStage: true },
  }).allowed, true);
}
);
