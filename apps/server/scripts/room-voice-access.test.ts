import test from 'node:test';
import assert from 'node:assert/strict';
import { TrackSource } from 'livekit-server-sdk';
import {
  buildLiveKitRoomName,
  buildRoomVoiceGrant,
  buildRoomVoiceParticipant,
  buildRoomVoiceRuntimeConfig,
  canPublishRoomVoice,
  roomVoiceConfigStatus,
} from '../src/modules/rooms/room-voice.service';
import type { RoomCapabilities, RoomRoleView } from '../src/modules/rooms/room-auth';

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
