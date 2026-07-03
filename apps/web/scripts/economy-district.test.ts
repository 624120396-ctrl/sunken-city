import assert from 'node:assert/strict';
import test from 'node:test';
import { getEconomyDistrictNav } from '../src/components/economy/economyDistrictMeta.ts';

test('market district navigation marks the active stall', () => {
  const nav = getEconomyDistrictNav('market');
  assert.equal(nav.find((item) => item.key === 'market')?.active, true);
  assert.equal(nav.find((item) => item.key === 'market')?.tone, 'blood');
});

test('shop district uses ritual acquisition copy', () => {
  assert.deepEqual(getEconomyDistrictNav('shop')[0], {
    key: 'shop',
    label: '拉莱耶遗珍',
    district: 'I',
    description: '购买藏品、外观与旧日补给',
    to: '/shop',
    tone: 'gold',
    active: true,
  });
});

test('inventory district remains separate from the player market', () => {
  const nav = getEconomyDistrictNav('inventory');
  assert.equal(nav.find((item) => item.key === 'inventory')?.district, 'II');
  assert.equal(nav.find((item) => item.key === 'market')?.active, false);
});
