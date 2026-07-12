import test from 'node:test';
import assert from 'node:assert/strict';
import { isStageAccessEnabled, stageGlobalEnabled } from '../src/modules/rooms/stage/stage-flags.ts';

test('stage read and subscription gate fails closed when the global flag is absent or false', () => {
  const prior = process.env.ROOM_STAGE_ENABLED;
  try {
    delete process.env.ROOM_STAGE_ENABLED;
    assert.equal(stageGlobalEnabled(), false);
    assert.equal(isStageAccessEnabled({ globalEnabled: stageGlobalEnabled(), roomStageEnabled: true }), false);

    process.env.ROOM_STAGE_ENABLED = 'false';
    assert.equal(stageGlobalEnabled(), false);
    assert.equal(isStageAccessEnabled({ globalEnabled: stageGlobalEnabled(), roomStageEnabled: true }), false);
  } finally {
    if (prior === undefined) delete process.env.ROOM_STAGE_ENABLED;
    else process.env.ROOM_STAGE_ENABLED = prior;
  }
});

test('stage read and subscription gate rejects a room with stage disabled', () => {
  assert.equal(isStageAccessEnabled({ globalEnabled: true, roomStageEnabled: false }), false);
  assert.equal(isStageAccessEnabled({ globalEnabled: true, roomStageEnabled: true }), true);
});
