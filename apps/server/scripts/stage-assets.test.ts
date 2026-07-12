import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizeStageAssetRead,
  issueStageAssetDeliveryUrl,
  validateThemeManifest,
} from '../src/modules/rooms/stage/stage-assets.ts';

test('stage assets require room membership or kp capability', () => {
  assert.equal(authorizeStageAssetRead({
    visibility: 'PRIVATE_ROOM',
    viewerUserId: 'pl1',
    roomUserIds: ['pl1'],
    canManageStage: false,
  }), true);

  assert.equal(authorizeStageAssetRead({
    visibility: 'PRIVATE_ROOM',
    viewerUserId: 'outsider',
    roomUserIds: ['pl1'],
    canManageStage: false,
  }), false);
});

test('stage private target assets only reach their target users or kp', () => {
  assert.equal(authorizeStageAssetRead({
    visibility: 'PRIVATE_TARGETS',
    viewerUserId: 'pl2',
    roomUserIds: ['pl1', 'pl2'],
    targetUserIds: ['pl1'],
    canManageStage: false,
  }), false);

  assert.equal(authorizeStageAssetRead({
    visibility: 'PRIVATE_TARGETS',
    viewerUserId: 'kp1',
    roomUserIds: ['kp1', 'pl1'],
    targetUserIds: ['pl1'],
    canManageStage: true,
  }), true);
});

test('stage delivery urls are signed and do not expose storage keys', () => {
  const url = issueStageAssetDeliveryUrl({
    assetId: 'asset-1',
    version: 2,
    viewerUserId: 'pl-1',
    nowMs: 1_000,
    baseUrl: 'https://assets.example.test/delivery',
    secret: 'test-secret',
  });
  assert.match(url!, /^https:\/\/assets\.example\.test\/delivery\/asset-1\?v=2&e=301&u=pl-1&sig=/);
  assert.equal(url!.includes('private/'), false);
  assert.equal(issueStageAssetDeliveryUrl({ assetId: 'asset-1', version: 2, viewerUserId: 'pl-1', nowMs: 1_000 }), null);
});

test('theme manifests are declarative and reject executable fields', () => {
  assert.equal(validateThemeManifest({ dialogBox: { padding: 16 } }).ok, true);
  assert.equal(validateThemeManifest({ script: 'alert(1)' }).ok, false);
});
