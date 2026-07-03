import type { CatchRarity } from './catchRevealMeta';

type LedgerRarity = CatchRarity | string;

export interface FishingLedgerMetaInput {
  rarity: LedgerRarity;
  isSold: boolean;
  sellPrice: number;
  sellCurrency: string;
}

export interface FishingLedgerMeta {
  rarityLabel: string;
  tone: 'junk' | 'common' | 'uncommon' | 'rare' | 'eldritch';
  statusLabel: string;
  priceLabel: string;
  sealLabel: string;
}

const rarityMeta: Record<CatchRarity, Pick<FishingLedgerMeta, 'rarityLabel' | 'tone' | 'sealLabel'>> = {
  JUNK: { rarityLabel: '残物', tone: 'junk', sealLabel: 'I' },
  COMMON: { rarityLabel: '普通', tone: 'common', sealLabel: 'II' },
  UNCOMMON: { rarityLabel: '异常', tone: 'uncommon', sealLabel: 'II' },
  RARE: { rarityLabel: '稀有', tone: 'rare', sealLabel: 'III' },
  ELDRITCH: { rarityLabel: '邪异', tone: 'eldritch', sealLabel: 'V' },
};

function normalizeRarity(rarity: LedgerRarity): CatchRarity {
  const normalized = String(rarity).toUpperCase();
  if (normalized === 'JUNK' || normalized === 'COMMON' || normalized === 'UNCOMMON' || normalized === 'RARE' || normalized === 'ELDRITCH') {
    return normalized;
  }
  return 'COMMON';
}

function getCurrencyLabel(currency: string) {
  return currency === 'coin' ? '锈蚀硬币' : '虚银';
}

export function getFishingLedgerMeta({ rarity, isSold, sellPrice, sellCurrency }: FishingLedgerMetaInput): FishingLedgerMeta {
  const base = rarityMeta[normalizeRarity(rarity)];
  return {
    ...base,
    statusLabel: isSold ? '已归档' : base.tone === 'junk' ? '待清理' : '待封存',
    priceLabel: `${sellPrice} ${getCurrencyLabel(sellCurrency)}`,
  };
}
