import test from 'node:test';
import assert from 'node:assert/strict';
import { decideStageAssetImport, validateStageAssetImportAccess } from './stage-assets-import.logic.ts';

const members = [
  { userId: 'kp', leftAt: null },
  { userId: 'pl', leftAt: null },
];

test('stage import requires active uploader and deduplicated active PRIVATE_TARGETS', () => {
  assert.deepEqual(validateStageAssetImportAccess({ uploadedById: 'kp', visibility: 'PRIVATE_TARGETS', targetUserIds: ['pl', 'pl'], members }), ['pl']);
  assert.throws(() => validateStageAssetImportAccess({ uploadedById: 'away', visibility: 'PRIVATE_ROOM', targetUserIds: [], members }), /active member/);
  assert.throws(() => validateStageAssetImportAccess({ uploadedById: 'kp', visibility: 'PRIVATE_TARGETS', targetUserIds: ['away'], members }), /active member/);
});

test('stage import reuses only a matching room-kind-hash record and fails closed on ACL conflict', () => {
  const request = { roomId: 'room-1', kind: 'PORTRAIT', hash: 'abc', uploadedById: 'kp', visibility: 'PRIVATE_ROOM', targetUserIds: [] };
  assert.deepEqual(decideStageAssetImport({ existing: [], request }), { action: 'create' });
  assert.deepEqual(decideStageAssetImport({ existing: [{ id: 'a1', ...request, metadataJson: JSON.stringify({ targetUserIds: [] }) }], request }), { action: 'reuse', assetId: 'a1' });
  assert.throws(() => decideStageAssetImport({ existing: [{ id: 'a1', ...request, visibility: 'KP_ONLY', metadataJson: JSON.stringify({ targetUserIds: [] }) }], request }), /conflicts/);
  assert.throws(() => decideStageAssetImport({ existing: [{ id: 'a1', ...request, metadataJson: JSON.stringify({ targetUserIds: [] }) }, { id: 'a2', ...request, metadataJson: JSON.stringify({ targetUserIds: [] }) }], request }), /multiple/);
});
