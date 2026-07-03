import assert from 'node:assert/strict';
import test from 'node:test';
import { getInventoryVaultTabs, getInventoryVaultSummary } from '../src/components/economy/inventoryVaultMeta.ts';

test('inventory vault tabs mark relics as the active sealed vault', () => {
  assert.deepEqual(getInventoryVaultTabs('relics').find((tab) => tab.key === 'relics'), {
    key: 'relics',
    label: '遗物',
    seal: 'III',
    tone: 'blood',
    active: true,
  });
});

test('inventory summary reports all three vault counts', () => {
  assert.deepEqual(getInventoryVaultSummary({ general: 4, titles: 2, relics: 7 }), [
    { label: '道具', value: 4, seal: 'I' },
    { label: '印记', value: 2, seal: 'II' },
    { label: '遗物', value: 7, seal: 'III' },
  ]);
});

test('general vault remains gold while title vault uses ocean tone', () => {
  const tabs = getInventoryVaultTabs('general');
  assert.equal(tabs.find((tab) => tab.key === 'general')?.tone, 'gold');
  assert.equal(tabs.find((tab) => tab.key === 'titles')?.tone, 'ocean');
});
