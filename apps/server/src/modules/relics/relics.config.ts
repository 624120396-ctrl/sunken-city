export type RelicEffectType = 'narrative' | 'micro_buff' | 'tool' | 'consumable';

export interface RelicEffect {
  key: string;
  type: RelicEffectType;
  name: string;
  description: string;
  iconUrl?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythical';
  tags?: string[];
  skill?: string;
  value?: number;
  threshold?: number;
  dice?: string;
  maxUsePerRoom?: number;
  maxDurability?: number;
  sideEffect?: string; // 副作用描述
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

  // ===== 普通级·聊胜于无遗物 =====
  cracked_pocket_watch: {
    key: 'cracked_pocket_watch',
    type: 'micro_buff',
    name: '裂口的旧怀表',
    description: '侦查检定+1%，但仅在「室外且正值正午」时生效。表盖内侧刻着一行褪色的名字，指针早已停在某次不可名状的日落之前。',
    rarity: 'common',
    skill: 'spot_hidden',
    value: 1,
  },
  placebo_pills: {
    key: 'placebo_pills',
    type: 'consumable',
    name: '安慰剂药片',
    description: '恢复0点HP。使用后你会觉得自己好了一些。瓶身标签写着「高效止痛药」，但生产日期被水渍完全糊掉了。',
    rarity: 'common',
    maxUsePerRoom: 1,
  },
  wet_matchbox: {
    key: 'wet_matchbox',
    type: 'tool',
    name: '不可燃的火柴盒',
    description: '在进行生火或点燃相关检定时，可要求重掷一次骰子——但KP有最终解释权决定是否允许。',
    rarity: 'common',
    tags: ['fire'],
  },
  grandfather_compass: {
    key: 'grandfather_compass',
    type: 'tool',
    name: '祖父的罗盘',
    description: '导航或定向检定时，失败惩罚从-20%降低为-19%。罗盘指针永远微微颤抖，似乎被某种磁力干扰。',
    rarity: 'common',
    tags: ['navigate'],
  },
  yesterdays_newspaper: {
    key: 'yesterdays_newspaper',
    type: 'narrative',
    name: '来自未来的报纸',
    description: '无实际效果。头版永远印着今天的日期，头条是「世界尚未末日」。玩家会以为它预示了什么，其实没有。',
    rarity: 'common',
    tags: ['time', 'red_herring'],
  },
  rusted_badge: {
    key: 'rusted_badge',
    type: 'micro_buff',
    name: '生锈的警徽',
    description: '话术检定+2%，但仅在对方也是「执法人员」时生效。它曾让三名混混当即投降——但那上面连警号都磨平了。',
    rarity: 'common',
    skill: 'fast_talk',
    value: 2,
  },

  // ===== 传说级·叙事遗物 =====
  caruncle_of_time: {
    key: 'caruncle_of_time',
    type: 'narrative',
    name: '时之脓疮啊，冀以千目窥视万古',
    description: '时间本身化作溃烂的肉赘（Caruncle），从永恒的伤口中垂下盲目之目。此物并非观测历史，而是以增殖的视线将使用者钉死在每一秒的夹缝中——正如██·███乃「█」与「█匙」，此遗物是钉入门扉的锈钉。',
    rarity: 'legendary',
    tags: ['lore', 'time'],
  },
  anima_putris: {
    key: 'anima_putris',
    type: 'narrative',
    name: '无色的天秤啊，汝之魂肉溃烂生目',
    description: '拉丁语「腐烂之魂」。典当业的称量在此异化为活体腐化——当灵魂置于那无色的托盘，并非被衡量价值，而是开始增殖与溃烂，生出密集的眼球与菌丝。越是珍贵的记忆，其腐坏后长出的肉芽触须越是繁密，最终吞噬鉴定者自身。',
    rarity: 'legendary',
    tags: ['lore', 'judgement'],
  },
  maledictio_twins: {
    key: 'maledictio_twins',
    type: 'narrative',
    name: '深梦的双子啊，以触须之舌低诵那不可名状',
    description: '拉丁语「触须之诅咒」。那白色与橘色的█，其形态在此扭曲为拉莱耶深渊中的双生旧主，其舌头已异化为吸盘触须，低诵的真名并非传播信息，而是直接刻入听者脑髓的寄生卵。每一次「██」的传播，都是在现实布下一张血肉蛛网，直至听者的颅骨内孵出相同的双生触须。',
    rarity: 'legendary',
    tags: ['lore', 'dream'],
  },
};

// ===== 运行时覆盖缓存（支持后台编辑图鉴） =====
let overrideCache: Record<string, Partial<RelicEffect>> = {};

export async function loadRelicOverrides(prisma: any) {
  const rows = await prisma.relicOverride.findMany();
  overrideCache = {};
  for (const row of rows) {
    overrideCache[row.key] = {
      ...(row.name !== null && row.name !== undefined && { name: row.name }),
      ...(row.description !== null && row.description !== undefined && { description: row.description }),
      ...(row.type !== null && row.type !== undefined && { type: row.type as RelicEffectType }),
      ...(row.iconUrl !== null && row.iconUrl !== undefined && { iconUrl: row.iconUrl }),
    };
  }
}

export async function refreshRelicOverrides(prisma: any) {
  await loadRelicOverrides(prisma);
}

export function getRelicEffect(key: string): RelicEffect | undefined {
  const base = RELIC_REGISTRY[key];
  if (!base) return undefined;
  const ov = overrideCache[key];
  if (!ov) return base;
  return { ...base, ...ov };
}

export function getAllRelics(): RelicEffect[] {
  return Object.keys(RELIC_REGISTRY).map((k) => getRelicEffect(k)!).filter(Boolean);
}

export const MAX_VAULT_SIZE = 5; // 每个角色保险箱最大容量
export const MAX_RELICS_PER_ROOM = 2; // 每场最多携带遗物数

export const rarityOrder: Record<string, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythical: 5,
};
