export type InventoryVaultTabKey = 'general' | 'titles' | 'relics';
export type InventoryVaultTone = 'gold' | 'ocean' | 'blood';
export type LootboxRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical';

export interface InventoryVaultTab {
  key: InventoryVaultTabKey;
  label: string;
  seal: string;
  tone: InventoryVaultTone;
  active: boolean;
}

export interface InventoryVaultSummaryInput {
  general: number;
  titles: number;
  relics: number;
}

export interface InventoryVaultSummaryItem {
  label: string;
  value: number;
  seal: string;
}

export interface LootboxRevealPresentation {
  maxRarity: LootboxRarity;
  rarityLabel: string;
  tone: InventoryVaultTone;
  flash: boolean;
  flavor: string;
}

const vaultTabs: Array<Omit<InventoryVaultTab, 'active'>> = [
  { key: 'general', label: '道具', seal: 'I', tone: 'gold' },
  { key: 'titles', label: '印记', seal: 'II', tone: 'ocean' },
  { key: 'relics', label: '遗物', seal: 'III', tone: 'blood' },
];

const rarityOrder: LootboxRarity[] = ['common', 'rare', 'epic', 'legendary', 'mythical'];

const rarityMeta: Record<LootboxRarity, Pick<LootboxRevealPresentation, 'rarityLabel' | 'tone' | 'flash' | 'flavor'>> = {
  common: {
    rarityLabel: '普通',
    tone: 'gold',
    flash: false,
    flavor: '盒中传出微弱的呢喃。你得到了一些来自过去的碎片。',
  },
  rare: {
    rarityLabel: '稀有',
    tone: 'gold',
    flash: false,
    flavor: '盒中传出微弱的呢喃。你得到了一些来自过去的碎片。',
  },
  epic: {
    rarityLabel: '史诗',
    tone: 'blood',
    flash: false,
    flavor: '深渊的褶皱里滑出几道流光，它们选择在此刻为你停留。',
  },
  legendary: {
    rarityLabel: '传说',
    tone: 'blood',
    flash: true,
    flavor: '雾气翻涌，某种古老的存在向你瞥了一眼。珍贵的回响落入掌心。',
  },
  mythical: {
    rarityLabel: '神话',
    tone: 'blood',
    flash: true,
    flavor: '时间凝滞了一瞬。你感觉有千只眼睛同时睁开，又同时闭上。——祂记住了你。',
  },
};

export function getInventoryVaultTabs(active: InventoryVaultTabKey): InventoryVaultTab[] {
  return vaultTabs.map((tab) => ({
    ...tab,
    active: tab.key === active,
  }));
}

export function getInventoryVaultSummary(counts: InventoryVaultSummaryInput): InventoryVaultSummaryItem[] {
  return [
    { label: '道具', value: counts.general, seal: 'I' },
    { label: '印记', value: counts.titles, seal: 'II' },
    { label: '遗物', value: counts.relics, seal: 'III' },
  ];
}

export function getLootboxRevealPresentation(rarities: string[]): LootboxRevealPresentation {
  const maxRarity = rarities.reduce<LootboxRarity>((max, rarity) => {
    const normalized = rarityOrder.includes(rarity as LootboxRarity) ? (rarity as LootboxRarity) : 'common';
    return rarityOrder.indexOf(normalized) > rarityOrder.indexOf(max) ? normalized : max;
  }, 'common');

  return {
    maxRarity,
    ...rarityMeta[maxRarity],
  };
}
