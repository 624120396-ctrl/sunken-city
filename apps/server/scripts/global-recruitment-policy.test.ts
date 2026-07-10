import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canManageGlobalRecruitmentPost,
  canViewGlobalRecruitmentContact,
  getEffectiveGlobalRecruitmentStatus,
  normalizeGlobalRecruitmentTags,
  requiresRoomForInternalGlobalRecruitment,
  shouldCreateGlobalRecruitmentRoomInvitation,
} from '../src/modules/global-recruitment/global-recruitment.policy';

test('global recruitment status turns open expired posts into expired', () => {
  const status = getEffectiveGlobalRecruitmentStatus('OPEN', new Date('2026-07-01T00:00:00.000Z'), new Date('2026-07-10T00:00:00.000Z'));

  assert.equal(status, 'EXPIRED');
});

test('global recruitment status keeps closed posts closed after expiry date', () => {
  const status = getEffectiveGlobalRecruitmentStatus('CLOSED', new Date('2026-07-01T00:00:00.000Z'), new Date('2026-07-10T00:00:00.000Z'));

  assert.equal(status, 'CLOSED');
});

test('global recruitment contact visibility is public, login-only, or responder scoped', () => {
  assert.equal(canViewGlobalRecruitmentContact({ authorId: 'author', visibility: 'PUBLIC', viewerId: undefined, hasOwnResponse: false }), true);
  assert.equal(canViewGlobalRecruitmentContact({ authorId: 'author', visibility: 'LOGGED_IN', viewerId: 'reader', hasOwnResponse: false }), true);
  assert.equal(canViewGlobalRecruitmentContact({ authorId: 'author', visibility: 'RESPONDERS', viewerId: 'reader', hasOwnResponse: false }), false);
  assert.equal(canViewGlobalRecruitmentContact({ authorId: 'author', visibility: 'RESPONDERS', viewerId: 'reader', hasOwnResponse: true }), true);
  assert.equal(canViewGlobalRecruitmentContact({ authorId: 'author', visibility: 'RESPONDERS', viewerId: 'author', hasOwnResponse: false }), true);
});

test('global recruitment author owns management but other users do not', () => {
  assert.equal(canManageGlobalRecruitmentPost('author', 'author'), true);
  assert.equal(canManageGlobalRecruitmentPost('author', 'reader'), false);
  assert.equal(canManageGlobalRecruitmentPost('author', undefined), false);
});

test('global recruitment tags are trimmed, deduplicated, and capped', () => {
  const tags = normalizeGlobalRecruitmentTags([' CoC7 ', '线上', '', 'CoC7', '长团']);

  assert.deepEqual(tags, ['CoC7', '线上', '长团']);
});

test('accepted responses create room invitations only for linked internal rooms', () => {
  assert.equal(
    shouldCreateGlobalRecruitmentRoomInvitation({
      sourceType: 'INTERNAL_ROOM',
      roomId: 'room-db-id',
      nextResponseStatus: 'ACCEPTED',
    }),
    true
  );
  assert.equal(
    shouldCreateGlobalRecruitmentRoomInvitation({
      sourceType: 'EXTERNAL_EVENT',
      roomId: null,
      nextResponseStatus: 'ACCEPTED',
    }),
    false
  );
  assert.equal(
    shouldCreateGlobalRecruitmentRoomInvitation({
      sourceType: 'INTERNAL_ROOM',
      roomId: 'room-db-id',
      nextResponseStatus: 'DECLINED',
    }),
    false
  );
});

test('internal room recruitment requires an explicit room binding', () => {
  assert.equal(requiresRoomForInternalGlobalRecruitment('INTERNAL_ROOM', 'SC-112233'), true);
  assert.equal(requiresRoomForInternalGlobalRecruitment('INTERNAL_ROOM', ''), false);
  assert.equal(requiresRoomForInternalGlobalRecruitment('EXTERNAL_EVENT', ''), true);
});
