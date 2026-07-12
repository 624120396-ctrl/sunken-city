import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TrackSource } from 'livekit-server-sdk';
import {
  assertRoomVoiceCapacity,
  buildLiveKitRoomName,
  buildRoomVoiceGrant,
  buildRoomVoiceParticipant,
  buildRoomVoiceRuntimeConfig,
  canPublishRoomVoice,
  isRoomVoiceLifecycleAllowed,
  RoomVoiceCapacityError,
  roomVoiceConfigStatus,
} from '../src/modules/rooms/room-voice.service';
import type { RoomCapabilities, RoomRoleView } from '../src/modules/rooms/room-auth';

const roomVoiceRoutes = readFileSync(
  new URL('../src/modules/rooms/room-voice.routes.ts', import.meta.url),
  'utf8',
);

const baseCapabilities: RoomCapabilities = {
  canEnterRoom: true,
  canJoinAsPlayer: false,
  canJoinAsObserver: false,
  canChangeCharacter: false,
  canRequestCharacterChange: false,
  canStartRoom: false,
  canPauseRoom: false,
  canResumeRoom: false,
  canEnterFinishing: false,
  canFinalizeRoom: false,
  canCancelRoom: false,
  canCloseRoom: false,
  canUseKPTools: false,
  canManageMembers: false,
  canManageScene: false,
  canManageClues: false,
  canManageNpcs: false,
  canManageCombat: false,
  canSendPublicMessage: true,
  canSendPrivateMessage: false,
  canRollPublicDice: false,
  canRollSecretDice: false,
  canViewSecretEvents: false,
  canViewPublicContent: true,
};

function capabilities(overrides: Partial<RoomCapabilities> = {}): RoomCapabilities {
  return { ...baseCapabilities, ...overrides };
}

test('room voice config reports missing LiveKit environment without exposing secrets', () => {
  const config = buildRoomVoiceRuntimeConfig({});

  assert.equal(config.enabled, false);
  assert.equal(config.serverUrl, null);
  assert.equal(roomVoiceConfigStatus(config), 'MISSING_CONFIG');
  assert.deepEqual(config.missing, ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET']);
  assert.equal('apiSecret' in config, false);
});

test('room voice admits only playable room lifecycles', () => {
  for (const lifecycle of ['PREPARING', 'READY', 'IN_PROGRESS', 'PAUSED']) {
    assert.equal(isRoomVoiceLifecycleAllowed(lifecycle), true, lifecycle);
  }

  for (const lifecycle of ['FINISHING', 'FINISHED', 'CANCELLED']) {
    assert.equal(isRoomVoiceLifecycleAllowed(lifecycle), false, lifecycle);
  }
});

test('room voice status and token share the lifecycle gate before token issuance', () => {
  const authStart = roomVoiceRoutes.indexOf('async function getRoomVoiceAuth');
  const authEnd = roomVoiceRoutes.indexOf("router.get('/:roomId/voice/status'");
  const statusStart = authEnd;
  const tokenStart = roomVoiceRoutes.indexOf("router.get('/:roomId/voice/token'");
  const tokenEnd = roomVoiceRoutes.indexOf('export default router;');

  assert.ok(authStart >= 0 && authEnd > authStart);
  assert.match(roomVoiceRoutes.slice(authStart, authEnd), /isRoomVoiceLifecycleAllowed\(auth\.lifecycle\)/);
  assert.match(roomVoiceRoutes.slice(statusStart, tokenStart), /await getRoomVoiceAuth\(req\.params\.roomId, userId\)/);
  assert.match(roomVoiceRoutes.slice(tokenStart, tokenEnd), /await getRoomVoiceAuth\(req\.params\.roomId, userId\)/);

  const tokenRoute = roomVoiceRoutes.slice(tokenStart, tokenEnd);
  assert.match(tokenRoute, /const participant = buildRoomVoiceParticipant\(/);
  assert.match(tokenRoute, /participantIdentity: participant\.identity/);
  assert.match(tokenRoute, /participant,/);
  assert.ok(tokenRoute.indexOf('assertRoomVoiceCapacity') < tokenRoute.indexOf('createRoomVoiceToken'));
});

test('room voice lets a full room member refresh or reconnect with its exact identity', async () => {
  const config = buildRoomVoiceRuntimeConfig({
    LIVEKIT_URL: 'wss://voice.example.com',
    LIVEKIT_API_KEY: 'test-key',
    LIVEKIT_API_SECRET: 'test-secret',
    ROOM_VOICE_MAX_PARTICIPANTS: '3',
  });
  const members = [
    buildRoomVoiceParticipant({ roomId: 'AB12CD', userId: 'kp', role: 'OWNER_KP', roomMemberId: 'member-kp' }),
    buildRoomVoiceParticipant({ roomId: 'AB12CD', userId: 'player', role: 'PLAYER', roomMemberId: 'member-player' }),
    buildRoomVoiceParticipant({ roomId: 'AB12CD', userId: 'observer', role: 'OBSERVER', roomMemberId: 'member-observer' }),
  ];

  for (const requester of members) {
    const result = await assertRoomVoiceCapacity({
      config,
      roomName: 'sunken-room-AB12CD',
      participantIdentity: requester.identity,
      client: { listParticipants: async () => members.map((member) => ({ identity: member.identity })) },
    });

    assert.equal(result.participantCount, 3);
    assert.equal(result.otherParticipantCount, 2);
    assert.equal(result.includesRequester, true);
  }
});

test('room voice refuses a new identity once the configured participant limit is reached', async () => {
  const config = buildRoomVoiceRuntimeConfig({
    LIVEKIT_URL: 'wss://voice.example.com',
    LIVEKIT_API_KEY: 'test-key',
    LIVEKIT_API_SECRET: 'test-secret',
    ROOM_VOICE_MAX_PARTICIPANTS: '2',
  });

  await assert.rejects(
    () => assertRoomVoiceCapacity({
      config,
      roomName: 'sunken-room-AB12CD',
      participantIdentity: 'room:AB12CD:user:newcomer',
      client: {
        listParticipants: async () => [
          { identity: 'room:AB12CD:user:one' },
          { identity: 'room:AB12CD:user:two' },
        ],
      },
    }),
    (error: unknown) => error instanceof RoomVoiceCapacityError
      && error.code === 'VOICE_ROOM_FULL'
      && error.statusCode === 409,
  );
});

test('room voice admits a new identity while the configured participant limit has spare capacity', async () => {
  const config = buildRoomVoiceRuntimeConfig({
    LIVEKIT_URL: 'wss://voice.example.com',
    LIVEKIT_API_KEY: 'test-key',
    LIVEKIT_API_SECRET: 'test-secret',
    ROOM_VOICE_MAX_PARTICIPANTS: '2',
  });

  const result = await assertRoomVoiceCapacity({
    config,
    roomName: 'sunken-room-AB12CD',
    participantIdentity: 'room:AB12CD:user:newcomer',
    client: { listParticipants: async () => [{ identity: 'room:AB12CD:user:one' }] },
  });

  assert.equal(result.participantCount, 1);
  assert.equal(result.otherParticipantCount, 1);
  assert.equal(result.includesRequester, false);
});

test('room voice fails closed when LiveKit returns missing or duplicate participant identities', async () => {
  const config = buildRoomVoiceRuntimeConfig({
    LIVEKIT_URL: 'wss://voice.example.com',
    LIVEKIT_API_KEY: 'test-key',
    LIVEKIT_API_SECRET: 'test-secret',
  });

  for (const participants of [
    [{}],
    [{ identity: 'room:AB12CD:user:one' }, { identity: 'room:AB12CD:user:one' }],
  ]) {
    await assert.rejects(
      () => assertRoomVoiceCapacity({
        config,
        roomName: 'sunken-room-AB12CD',
        participantIdentity: 'room:AB12CD:user:newcomer',
        client: { listParticipants: async () => participants },
      }),
      (error: unknown) => error instanceof RoomVoiceCapacityError
        && error.code === 'VOICE_CAPACITY_CHECK_FAILED'
        && error.statusCode === 503,
    );
  }
});

test('room voice fails closed when LiveKit participant lookup fails', async () => {
  const config = buildRoomVoiceRuntimeConfig({
    LIVEKIT_URL: 'wss://voice.example.com',
    LIVEKIT_API_KEY: 'test-key',
    LIVEKIT_API_SECRET: 'test-secret',
  });

  await assert.rejects(
    () => assertRoomVoiceCapacity({
      config,
      roomName: 'sunken-room-AB12CD',
      participantIdentity: 'room:AB12CD:user:newcomer',
      client: { listParticipants: async () => { throw new Error('network unavailable'); } },
    }),
    (error: unknown) => error instanceof RoomVoiceCapacityError
      && error.code === 'VOICE_CAPACITY_CHECK_FAILED'
      && error.statusCode === 503,
  );
});

test('room voice grants allow KP and players to publish microphone audio only', () => {
  const roomName = buildLiveKitRoomName('AB12CD');
  const grant = buildRoomVoiceGrant({
    roomName,
    role: 'PLAYER',
    capabilities: capabilities({ canSendPublicMessage: true }),
    observerCanSpeak: false,
  });

  assert.equal(grant.room, 'sunken-room-AB12CD');
  assert.equal(grant.roomJoin, true);
  assert.equal(grant.canSubscribe, true);
  assert.equal(grant.canPublish, true);
  assert.deepEqual(grant.canPublishSources, [TrackSource.MICROPHONE]);
  assert.equal(grant.canPublishData, false);
});

test('room voice grants keep observers subscribe-only unless room setting permits speech', () => {
  const silentObserver = buildRoomVoiceGrant({
    roomName: buildLiveKitRoomName('AB12CD'),
    role: 'OBSERVER',
    capabilities: capabilities(),
    observerCanSpeak: false,
  });

  const speakingObserver = buildRoomVoiceGrant({
    roomName: buildLiveKitRoomName('AB12CD'),
    role: 'OBSERVER',
    capabilities: capabilities(),
    observerCanSpeak: true,
  });

  assert.equal(canPublishRoomVoice('OBSERVER', capabilities(), false), false);
  assert.equal(silentObserver.canPublish, false);
  assert.equal(silentObserver.canSubscribe, true);
  assert.equal(speakingObserver.canPublish, true);
  assert.deepEqual(speakingObserver.canPublishSources, [TrackSource.MICROPHONE]);
});

test('room voice participant identity is stable and role-scoped', () => {
  const participant = buildRoomVoiceParticipant({
    roomId: 'AB12CD',
    userId: 'user-1',
    nickname: '林中人',
    role: 'OWNER_KP' as RoomRoleView,
    roomMemberId: 'member-1',
  });

  assert.equal(participant.identity, 'room:AB12CD:user:user-1');
  assert.equal(participant.name, '林中人');
  assert.deepEqual(participant.metadata, {
    roomId: 'AB12CD',
    role: 'OWNER_KP',
    roomMemberId: 'member-1',
    voiceVersion: 'v1',
  });
});
