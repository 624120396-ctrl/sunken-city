import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getInventoryVaultTabs,
  getInventoryVaultSummary,
  getLootboxRevealPresentation,
} from '../src/components/economy/inventoryVaultMeta.ts';

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

test('lootbox reveal presentation escalates with the strongest relic rarity', () => {
  assert.deepEqual(getLootboxRevealPresentation(['common', 'epic', 'rare']), {
    maxRarity: 'epic',
    rarityLabel: '史诗',
    tone: 'blood',
    flash: false,
    flavor: '深渊的褶皱里滑出几道流光，它们选择在此刻为你停留。',
  });

  assert.equal(getLootboxRevealPresentation(['common', 'mythical']).flash, true);
});
