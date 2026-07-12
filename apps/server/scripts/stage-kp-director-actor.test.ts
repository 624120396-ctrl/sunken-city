import test from 'node:test';
import assert from 'node:assert/strict';
import { stageKpDirectorScopeKey } from '../src/modules/rooms/stage/stage-actors.ts';

test('KP director actors use a stable owner scope without a character binding', () => {
  assert.equal(stageKpDirectorScopeKey({ userId: 'kp-1' }), 'director:kp-1');
  assert.notEqual(stageKpDirectorScopeKey({ userId: 'kp-1' }), stageKpDirectorScopeKey({ userId: 'kp-2' }));
});
