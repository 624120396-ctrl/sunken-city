import assert from 'node:assert/strict';
import test from 'node:test';
import { getCatchRevealMeta } from '../src/components/fishing/catchRevealMeta.ts';

test('rare catches use gold archive ceremony language', () => {
  assert.deepEqual(getCatchRevealMeta('RARE'), {
    label: '稀有钓获',
    headline: '港务账本已记录异物',
    tone: 'rare',
    seal: 'III',
    valueLabel: '高价值',
  });
});

test('eldritch catches use blood warning language', () => {
  assert.deepEqual(getCatchRevealMeta('ELDRITCH'), {
    label: '邪异钓获',
    headline: '黑水正在回望',
    tone: 'eldritch',
    seal: 'V',
    valueLabel: '封存',
  });
});
