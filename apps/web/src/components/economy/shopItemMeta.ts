export type ShopItemTone = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical';

export interface ShopItemPresentationInput {
  rarity: string;
  currency: 'coin' | 'stardust';
  price: number;
  category: string;
  balance: {
    coins: number;
    stardust: number;
  };
}

export interface ShopItemPresentation {
  rarityLabel: string;
  seal: string;
  tone: ShopItemTone;
  categoryLabel: string;
  currencyLabel: string;
  priceLabel: string;
  affordLabel: string;
  canAfford: boolean;
}

const rarityMeta: Record<string, Pick<ShopItemPresentation, 'rarityLabel' | 'seal' | 'tone'>> = {
  common: { rarityLabel: '普通', seal: 'I', tone: 'common' },
  rare: { rarityLabel: '稀有', seal: 'II', tone: 'rare' },
  epic: { rarityLabel: '史诗', seal: 'III', tone: 'epic' },
  legendary: { rarityLabel: '传说', seal: 'IV', tone: 'legendary' },
  mythical: { rarityLabel: '神话', seal: 'V', tone: 'mythical' },
};

const categoryLabels: Record<string, string> = {
  consumable: '消耗品',
  avatar_frame: '头像框',
  dice_skin: '骰子皮肤',
  card_skin: '卡面皮肤',
  room_theme: '房间主题',
  title: '印记',
  relic: '遗物',
};

export function getShopItemPresentation(input: ShopItemPresentationInput): ShopItemPresentation {
  const rarity = rarityMeta[input.rarity] ?? rarityMeta.common;
  const currencyLabel = input.currency === 'coin' ? '锈蚀硬币' : '虚银';
  const currentBalance = input.currency === 'coin' ? input.balance.coins : input.balance.stardust;
  const canAfford = currentBalance >= input.price;

  return {
    ...rarity,
    categoryLabel: categoryLabels[input.category] ?? '藏品',
    currencyLabel,
    priceLabel: `${input.price} ${currencyLabel}`,
    affordLabel: canAfford ? '契约可签' : input.currency === 'coin' ? '硬币不足' : '虚银不足',
    canAfford,
  };
}
