import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWusoanGraySeedPlan } from './stage-wusoan-gray-seed.logic.ts';

const members = [
  { userId: 'kp', role: 'KP', leftAt: null, characterId: 'kp-character' },
  { userId: 'pl', role: 'PLAYER', leftAt: null, characterId: 'pl-character' },
];

const assets = [
  { id: 'background', roomId: 'room-1', uploadedById: 'kp', kind: 'BACKGROUND', visibility: 'PRIVATE_ROOM' },
  { id: 'kp-portrait', roomId: 'room-1', uploadedById: 'kp', kind: 'PORTRAIT', visibility: 'PRIVATE_ROOM' },
  { id: 'pl-portrait', roomId: 'room-1', uploadedById: 'pl', kind: 'PORTRAIT', visibility: 'PRIVATE_ROOM' },
  { id: 'bgm', roomId: 'room-1', uploadedById: 'kp', kind: 'BGM', visibility: 'PRIVATE_ROOM' },
];

const input = () => ({ room: { id: 'room-1', roomId: 'WUSOAN', creatorId: 'kp', members }, kpUserId: 'kp', plUserId: 'pl', assets, assetIds: { background: 'background', kpPortrait: 'kp-portrait', plPortrait: 'pl-portrait', bgm: 'bgm' } });

test('WUSOAN gray seed validates an idempotent complete active KP/PL plan', () => {
  const first = validateWusoanGraySeedPlan(input());
  const second = validateWusoanGraySeedPlan(input());
  assert.equal(first.kp.userId, second.kp.userId);
  assert.equal(first.pl.characterId, second.pl.characterId);
});

test('WUSOAN gray seed rejects another room, missing or departed PL, and wrong player role', () => {
  assert.throws(() => validateWusoanGraySeedPlan({ ...input(), room: { ...input().room, roomId: 'OTHER' } }), /WUSOAN/);
  assert.throws(() => validateWusoanGraySeedPlan({ ...input(), room: { ...input().room, members: [members[0]] } }), /active PLAYER/);
  assert.throws(() => validateWusoanGraySeedPlan({ ...input(), room: { ...input().room, members: [members[0], { ...members[1], leftAt: new Date() }] } }), /active PLAYER/);
  assert.throws(() => validateWusoanGraySeedPlan({ ...input(), room: { ...input().room, members: [members[0], { ...members[1], role: 'OBSERVER' }] } }), /PLAYER/);
});

test('WUSOAN gray seed rejects wrong kind, room, uploader, and visibility', () => {
  assert.throws(() => validateWusoanGraySeedPlan({ ...input(), assets: assets.map((asset) => asset.id === 'bgm' ? { ...asset, kind: 'PORTRAIT' } : asset) }), /BGM/);
  assert.throws(() => validateWusoanGraySeedPlan({ ...input(), assets: assets.map((asset) => asset.id === 'pl-portrait' ? { ...asset, roomId: 'other-room' } : asset) }), /room/);
  assert.throws(() => validateWusoanGraySeedPlan({ ...input(), assets: assets.map((asset) => asset.id === 'pl-portrait' ? { ...asset, uploadedById: 'kp' } : asset) }), /owned/);
  assert.throws(() => validateWusoanGraySeedPlan({ ...input(), assets: assets.map((asset) => asset.id === 'background' ? { ...asset, visibility: 'KP_ONLY' } : asset) }), /PRIVATE_ROOM/);
});
