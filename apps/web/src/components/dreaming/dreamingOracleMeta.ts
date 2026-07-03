export type OraclePhaseKey = 'ready' | 'selecting' | 'sealed' | 'revealed' | 'deep';

export interface OraclePhaseInput {
  canDraw: boolean;
  hasTodayDraw: boolean;
  candidateCount: number;
  isRevealed: boolean;
  isDeepRevealed: boolean;
}

export interface OraclePhaseMeta {
  key: OraclePhaseKey;
  title: string;
  prompt: string;
  actionLabel: string;
}

export interface OracleCandidateInput {
  key: string;
  rarity: string;
}

export interface OracleCandidateSlot extends OracleCandidateInput {
  label: string;
  translateY: number;
  rotate: number;
  selected: boolean;
}

export interface OracleRarityMeta {
  label: string;
  seal: string;
  tone: 'common' | 'rare' | 'epic' | 'legendary';
  accent: string;
}

const phaseMeta: Record<OraclePhaseKey, OraclePhaseMeta> = {
  ready: {
    key: 'ready',
    title: '今晚可入梦',
    prompt: '三枚封印尚未点亮，深渊牌阵正在等待第一次触碰。',
    actionLabel: '开启梦境牌阵',
  },
  selecting: {
    key: 'selecting',
    title: '三牌悬停',
    prompt: '选择一张暗牌，让今日梦境坠入固定轨道。',
    actionLabel: '选择你的牌',
  },
  sealed: {
    key: 'sealed',
    title: '等待解牌',
    prompt: '牌面已经落定，但梦境呓语仍被盐雾封存。',
    actionLabel: '解读牌面',
  },
  revealed: {
    key: 'revealed',
    title: '基础已解读',
    prompt: '第一层梦兆已经归档，仍可继续进入深层解牌。',
    actionLabel: '进入深层',
  },
  deep: {
    key: 'deep',
    title: '深层已解读',
    prompt: '触须效应已写入档案，今夜梦境完成封缄。',
    actionLabel: '查看记录',
  },
};

const rarityMeta: Record<string, OracleRarityMeta> = {
  common: { label: '普通', seal: 'I', tone: 'common', accent: '盐雾纸牌' },
  rare: { label: '稀有', seal: 'II', tone: 'rare', accent: '冷蓝封蜡' },
  epic: { label: '史诗', seal: 'III', tone: 'epic', accent: '紫雾圣印' },
  legendary: { label: '传说', seal: 'V', tone: 'legendary', accent: '辉金封缄' },
};

const slotLabels = ['左手封印', '潮汐主位', '右手封印'];
const slotOffsets = [
  { translateY: 18, rotate: -9 },
  { translateY: -10, rotate: 0 },
  { translateY: 18, rotate: 9 },
];

export function getDreamingOraclePhase(input: OraclePhaseInput): OraclePhaseMeta {
  if (!input.hasTodayDraw && input.candidateCount > 0) {
    return phaseMeta.selecting;
  }

  if (!input.hasTodayDraw && input.canDraw) {
    return phaseMeta.ready;
  }

  if (input.isDeepRevealed) {
    return phaseMeta.deep;
  }

  if (input.isRevealed) {
    return phaseMeta.revealed;
  }

  return phaseMeta.sealed;
}

export function getOracleCandidateSlots(candidates: OracleCandidateInput[], selectingKey: string | null): OracleCandidateSlot[] {
  return candidates.map((candidate, index) => {
    const offset = slotOffsets[index] ?? slotOffsets[1];
    return {
      ...candidate,
      label: slotLabels[index] ?? '梦境封印',
      translateY: offset.translateY,
      rotate: offset.rotate,
      selected: selectingKey === candidate.key,
    };
  });
}

export function getOracleRarityMeta(rarity: string): OracleRarityMeta {
  return rarityMeta[rarity] ?? rarityMeta.common;
}
