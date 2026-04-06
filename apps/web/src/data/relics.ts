export type RelicEffectType = 'narrative' | 'micro_buff' | 'tool' | 'consumable';

export interface RelicEffect {
  key: string;
  type: RelicEffectType;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythical';
  tags?: string[];
  skill?: string;
  value?: number;
  threshold?: number;
  dice?: string;
  maxUsePerRoom?: number;
  maxDurability?: number;
  sideEffect?: string;
}

export const RELIC_REGISTRY: Record<string, RelicEffect> = {
  damp_shell: {
    key: 'damp_shell',
    type: 'narrative',
    name: '湿透的贝壳',
    description: '一枚带着咸腥气息的贝壳。在某些沿海地带，持有它的人会听到本不该存在的声音。',
    rarity: 'common',
    tags: ['coastal'],
  },
  moldy_old_sign: {
    key: 'moldy_old_sign',
    type: 'micro_buff',
    name: '发霉的旧印',
    description: '神秘学检定+3%，但仅在当前SAN值不高于30时生效。',
    rarity: 'rare',
    skill: 'occult',
    value: 3,
    threshold: 30,
  },
  field_bandage: {
    key: 'field_bandage',
    type: 'consumable',
    name: '急救绷带',
    description: '恢复1D3点HP。每局游戏中仅限使用一次。',
    rarity: 'common',
    dice: '1d3',
    maxUsePerRoom: 1,
  },
  climbing_rope: {
    key: 'climbing_rope',
    type: 'tool',
    name: '登山绳索',
    description: '在进行攀爬相关检定时，失败惩罚从-20%降低为-10%。',
    rarity: 'common',
    tags: ['climb'],
  },
  sepia_photo: {
    key: 'sepia_photo',
    type: 'narrative',
    name: '泛黄照片',
    description: '一张旧照片，背面写着模糊的名字。与特定NPC同名时，会触发意料之外的反应。',
    rarity: 'rare',
    tags: ['npc'],
  },
  bloody_medal: {
    key: 'bloody_medal',
    type: 'micro_buff',
    name: '染血勋章',
    description: '意志检定+5%，但每场游戏结束后SAN值永久-1。',
    rarity: 'legendary',
    skill: 'pow',
    value: 5,
    sideEffect: '每场结束后SAN -1',
  },
};

export function getRelicEffect(key: string): RelicEffect | undefined {
  return RELIC_REGISTRY[key];
}

export function getAllRelics(): RelicEffect[] {
  return Object.values(RELIC_REGISTRY);
}

export const MAX_VAULT_SIZE = 5;
export const MAX_RELICS_PER_ROOM = 2;

export const rarityOrder: Record<string, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythical: 5,
};
