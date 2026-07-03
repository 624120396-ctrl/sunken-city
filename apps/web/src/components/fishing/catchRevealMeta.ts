export type CatchRarity = 'JUNK' | 'COMMON' | 'UNCOMMON' | 'RARE' | 'ELDRITCH';

export interface CatchRevealMeta {
  label: string;
  headline: string;
  tone: 'junk' | 'common' | 'uncommon' | 'rare' | 'eldritch';
  seal: string;
  valueLabel: string;
}

const catchRevealMeta: Record<CatchRarity, CatchRevealMeta> = {
  JUNK: {
    label: '残物钓获',
    headline: '港务账本暂存残物',
    tone: 'junk',
    seal: 'I',
    valueLabel: '低值',
  },
  COMMON: {
    label: '普通钓获',
    headline: '港务账本已登记',
    tone: 'common',
    seal: 'II',
    valueLabel: '可售',
  },
  UNCOMMON: {
    label: '异常钓获',
    headline: '异物需要复核',
    tone: 'uncommon',
    seal: 'II',
    valueLabel: '异常',
  },
  RARE: {
    label: '稀有钓获',
    headline: '港务账本已记录异物',
    tone: 'rare',
    seal: 'III',
    valueLabel: '高价值',
  },
  ELDRITCH: {
    label: '邪异钓获',
    headline: '黑水正在回望',
    tone: 'eldritch',
    seal: 'V',
    valueLabel: '封存',
  },
};

export function getCatchRevealMeta(rarity: CatchRarity): CatchRevealMeta {
  return catchRevealMeta[rarity];
}
