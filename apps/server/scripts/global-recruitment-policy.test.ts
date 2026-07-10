import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canManageGlobalRecruitmentPost,
  canViewGlobalRecruitmentContact,
  getEffectiveGlobalRecruitmentStatus,
  normalizeGlobalRecruitmentTags,
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
