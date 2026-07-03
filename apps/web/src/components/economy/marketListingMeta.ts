export type MarketListingTone = 'neutral' | 'gold' | 'blood';

export interface MarketListingPresentationInput {
  rarity: string;
  currency: 'coin' | 'stardust';
  price: number;
  durability: number | null;
  sellerName: string;
  isMine: boolean;
}

export interface MarketListingPresentation {
  rarityLabel: string;
  seal: string;
  tone: MarketListingTone;
  currencyLabel: string;
  priceLabel: string;
  durabilityLabel: string | null;
  sellerLabel: string;
  actionLabel: string;
}

const rarityMeta: Record<string, Pick<MarketListingPresentation, 'rarityLabel' | 'seal' | 'tone'>> = {
  common: { rarityLabel: '普通', seal: 'I', tone: 'neutral' },
  uncommon: { rarityLabel: '罕见', seal: 'II', tone: 'gold' },
  rare: { rarityLabel: '稀有', seal: 'II', tone: 'gold' },
  epic: { rarityLabel: '史诗', seal: 'III', tone: 'blood' },
  legendary: { rarityLabel: '传说', seal: 'IV', tone: 'blood' },
};

export function getMarketListingPresentation(input: MarketListingPresentationInput): MarketListingPresentation {
  const rarity = rarityMeta[input.rarity] ?? rarityMeta.common;
  const currencyLabel = input.currency === 'coin' ? '锈蚀硬币' : '虚银';

  return {
    ...rarity,
    currencyLabel,
    priceLabel: `${input.price} ${currencyLabel}`,
    durabilityLabel: input.durability === null ? null : `耐久 ${input.durability}`,
    sellerLabel: `卖方 · ${input.sellerName}`,
    actionLabel: input.isMine ? '撤下契约' : '签订契约',
  };
}
