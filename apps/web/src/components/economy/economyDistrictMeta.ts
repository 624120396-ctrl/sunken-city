export type EconomySection = 'shop' | 'inventory' | 'market';
export type EconomyDistrictTone = 'gold' | 'ocean' | 'blood';

export interface EconomyDistrictNavItem {
  key: EconomySection;
  label: string;
  district: string;
  description: string;
  to: string;
  tone: EconomyDistrictTone;
  active: boolean;
}

const districtNav: Array<Omit<EconomyDistrictNavItem, 'active'>> = [
  {
    key: 'shop',
    label: '拉莱耶遗珍',
    district: 'I',
    description: '购买藏品、外观与旧日补给',
    to: '/shop',
    tone: 'gold',
  },
  {
    key: 'inventory',
    label: '背包',
    district: 'II',
    description: '管理道具、印记与遗物绑定',
    to: '/inventory',
    tone: 'ocean',
  },
  {
    key: 'market',
    label: '遗物市场',
    district: 'III',
    description: '交易遗物并查看自己的挂单',
    to: '/market',
    tone: 'blood',
  },
];

export function getEconomyDistrictNav(active: EconomySection): EconomyDistrictNavItem[] {
  return districtNav.map((item) => ({
    ...item,
    active: item.key === active,
  }));
}
