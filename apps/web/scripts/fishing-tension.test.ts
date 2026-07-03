import assert from 'node:assert/strict';
import test from 'node:test';
import { createTensionSnapshot, isTensionCatchReady } from '../src/components/fishing/tensionGame.ts';

test('tension rises while reeling and drifts down while released', () => {
  const charged = createTensionSnapshot({ previous: 42, elapsedMs: 400, isReeling: true, phaseMs: 0 });
  const released = createTensionSnapshot({ previous: charged.value, elapsedMs: 400, isReeling: false, phaseMs: 400 });

  assert.equal(charged.value, 58);
  assert.equal(charged.zone, 'safe');
  assert.equal(released.value, 46);
  assert.equal(released.zone, 'safe');
});

test('tension is clamped and danger zones are explicit', () => {
  assert.deepEqual(createTensionSnapshot({ previous: 96, elapsedMs: 800, isReeling: true, phaseMs: 0 }), {
    value: 100,
    zone: 'snap',
    safeStart: 38,
    safeEnd: 72,
  });
  assert.deepEqual(createTensionSnapshot({ previous: 8, elapsedMs: 800, isReeling: false, phaseMs: 0 }), {
    value: 0,
    zone: 'slack',
    safeStart: 38,
    safeEnd: 72,
  });
});

test('catch is ready only after enough stable safe tension', () => {
  assert.equal(isTensionCatchReady({ safeMs: 1799, elapsedMs: 4200 }), false);
  assert.equal(isTensionCatchReady({ safeMs: 1800, elapsedMs: 4200 }), true);
  assert.equal(isTensionCatchReady({ safeMs: 2000, elapsedMs: 1500 }), false);
});
