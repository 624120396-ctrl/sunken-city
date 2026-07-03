import assert from 'node:assert/strict';
import test from 'node:test';
import { getShopItemPresentation } from '../src/components/economy/shopItemMeta.ts';

test('legendary shop items receive high ceremony presentation', () => {
  assert.deepEqual(getShopItemPresentation({
    rarity: 'legendary',
    currency: 'stardust',
    price: 12,
    category: 'relic',
    balance: { coins: 100, stardust: 30 },
  }), {
    rarityLabel: '传说',
    seal: 'IV',
    tone: 'legendary',
    categoryLabel: '遗物',
    currencyLabel: '虚银',
    priceLabel: '12 虚银',
    affordLabel: '契约可签',
    canAfford: true,
  });
});

test('coin items report insufficient balance when coins are low', () => {
  assert.equal(getShopItemPresentation({
    rarity: 'rare',
    currency: 'coin',
    price: 200,
    category: 'dice_skin',
    balance: { coins: 40, stardust: 0 },
  }).affordLabel, '硬币不足');
});

test('unknown categories keep a stable fallback label', () => {
  assert.equal(getShopItemPresentation({
    rarity: 'common',
    currency: 'coin',
    price: 1,
    category: 'unknown',
    balance: { coins: 1, stardust: 0 },
  }).categoryLabel, '藏品');
});
