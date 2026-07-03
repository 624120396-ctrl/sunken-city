import assert from 'node:assert/strict';
import test from 'node:test';
import { getDreamReadingMeta } from '../src/components/dreaming/dreamingReadingMeta.ts';

test('basic revealed readings use first-layer archive ceremony', () => {
  assert.deepEqual(getDreamReadingMeta({ isDeepRevealed: false, hasDeepText: false, hasBuff: false }), {
    tierLabel: '第一层梦兆',
    headline: '盐雾档案已开启',
    seal: 'II',
    tone: 'basic',
    deepActionLabel: '进入深层解牌',
    buffLabel: null,
  });
});

test('deep revealed readings use sealed ritual completion language', () => {
  assert.deepEqual(getDreamReadingMeta({ isDeepRevealed: true, hasDeepText: true, hasBuff: false }), {
    tierLabel: '深层梦兆',
    headline: '梦境完成封缄',
    seal: 'III',
    tone: 'deep',
    deepActionLabel: null,
    buffLabel: null,
  });
});

test('buff readings expose a separate effect label', () => {
  assert.deepEqual(getDreamReadingMeta({ isDeepRevealed: true, hasDeepText: true, hasBuff: true }).buffLabel, '触须效应已写入');
});
