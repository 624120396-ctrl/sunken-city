import assert from 'node:assert/strict';
import test from 'node:test';
import { getMarketListingPresentation } from '../src/components/economy/marketListingMeta.ts';

test('legendary market listings use blood contract presentation', () => {
  assert.deepEqual(getMarketListingPresentation({
    rarity: 'legendary',
    currency: 'stardust',
    price: 30,
    durability: 7,
    sellerName: '管理员',
    isMine: false,
  }), {
    rarityLabel: '传说',
    seal: 'IV',
    tone: 'blood',
    currencyLabel: '虚银',
    priceLabel: '30 虚银',
    durabilityLabel: '耐久 7',
    sellerLabel: '卖方 · 管理员',
    actionLabel: '签订契约',
  });
});

test('own listings expose cancel action copy', () => {
  assert.equal(getMarketListingPresentation({
    rarity: 'rare',
    currency: 'coin',
    price: 10,
    durability: null,
    sellerName: '我',
    isMine: true,
  }).actionLabel, '撤下契约');
});

test('unknown rarity falls back to common contract metadata', () => {
  assert.equal(getMarketListingPresentation({
    rarity: 'unknown',
    currency: 'coin',
    price: 1,
    durability: null,
    sellerName: '无名者',
    isMine: false,
  }).seal, 'I');
});
