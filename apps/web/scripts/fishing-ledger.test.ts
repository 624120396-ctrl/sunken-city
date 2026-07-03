import assert from 'node:assert/strict';
import test from 'node:test';
import { getFishingLedgerMeta } from '../src/components/fishing/fishingLedgerMeta.ts';

test('rare unsold ledger entries read as sealed high value records', () => {
  assert.deepEqual(getFishingLedgerMeta({ rarity: 'RARE', isSold: false, sellPrice: 80, sellCurrency: 'coin' }), {
    rarityLabel: '稀有',
    tone: 'rare',
    statusLabel: '待封存',
    priceLabel: '80 锈蚀硬币',
    sealLabel: 'III',
  });
});

test('sold ledger entries read as archived records', () => {
  assert.deepEqual(getFishingLedgerMeta({ rarity: 'COMMON', isSold: true, sellPrice: 15, sellCurrency: 'coin' }), {
    rarityLabel: '普通',
    tone: 'common',
    statusLabel: '已归档',
    priceLabel: '15 锈蚀硬币',
    sealLabel: 'II',
  });
});
