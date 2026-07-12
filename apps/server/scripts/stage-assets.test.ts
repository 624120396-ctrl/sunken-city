import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizeStageAssetRead,
  buildStageAssetProxyUrl,
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

test('stage proxy urls do not expose storage keys', () => {
  assert.equal(buildStageAssetProxyUrl({ publicRoomId: 'abc', assetId: 'asset-1', version: 2 }), '/api/rooms/abc/stage/assets/asset-1/proxy?v=2');
});

test('theme manifests are declarative and reject executable fields', () => {
  assert.equal(validateThemeManifest({ dialogBox: { padding: 16 } }).ok, true);
  assert.equal(validateThemeManifest({ script: 'alert(1)' }).ok, false);
});
