import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  parseStageAssetByteRange,
  resolveStageAssetFile,
  verifyStageAssetDeliverySignature,
} from '../src/modules/rooms/stage/stage-asset-delivery.ts';
import { issueStageAssetDeliveryUrl } from '../src/modules/rooms/stage/stage-assets.ts';

test('stage asset delivery accepts a valid unexpired HMAC URL and rejects tampering', () => {
  const url = issueStageAssetDeliveryUrl({
    assetId: 'asset-1', version: 2, viewerUserId: 'user-1', nowMs: 1_000,
    baseUrl: 'https://stage-assets.example/delivery', secret: 'test-secret',
  })!;
  const params = new URL(url).searchParams;
  assert.equal(verifyStageAssetDeliverySignature({ assetId: 'asset-1', version: 2, viewerUserId: 'user-1', expiresAt: Number(params.get('e')), signature: params.get('sig')!, secret: 'test-secret', nowMs: 1_001 }), true);
  assert.equal(verifyStageAssetDeliverySignature({ assetId: 'asset-1', version: 3, viewerUserId: 'user-1', expiresAt: Number(params.get('e')), signature: params.get('sig')!, secret: 'test-secret', nowMs: 1_001 }), false);
  assert.equal(verifyStageAssetDeliverySignature({ assetId: 'asset-1', version: 2, viewerUserId: 'user-1', expiresAt: Number(params.get('e')), signature: params.get('sig')!, secret: 'test-secret', nowMs: 999_999_999_000 }), false);
});

test('stage asset delivery resolves only normalized paths below the persistent asset root', () => {
  const root = path.resolve('C:/stage-assets');
  assert.equal(resolveStageAssetFile(root, 'WUSOAN/backgrounds/archive.webp'), path.join(root, 'WUSOAN', 'backgrounds', 'archive.webp'));
  assert.equal(resolveStageAssetFile(root, '../server.env'), null);
  assert.equal(resolveStageAssetFile(root, '/etc/passwd'), null);
});

test('stage asset delivery supports valid single ranges for BGM and rejects malformed ranges', () => {
  assert.deepEqual(parseStageAssetByteRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(parseStageAssetByteRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.equal(parseStageAssetByteRange('bytes=100-101', 100), null);
  assert.equal(parseStageAssetByteRange('bytes=0-1,3-4', 100), null);
});
