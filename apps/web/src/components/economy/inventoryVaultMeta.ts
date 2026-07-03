export type InventoryVaultTabKey = 'general' | 'titles' | 'relics';
export type InventoryVaultTone = 'gold' | 'ocean' | 'blood';

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

const vaultTabs: Array<Omit<InventoryVaultTab, 'active'>> = [
  { key: 'general', label: '道具', seal: 'I', tone: 'gold' },
  { key: 'titles', label: '印记', seal: 'II', tone: 'ocean' },
  { key: 'relics', label: '遗物', seal: 'III', tone: 'blood' },
];

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
