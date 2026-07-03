export type RankTitleTone = 'gold' | 'ocean' | 'blood';

export interface RankLike {
  id?: string;
  level: number;
  expRequired: number;
  name: string;
  color?: string;
  icon?: string;
}

export interface RankProgressSummaryInput {
  currentRank?: RankLike | null;
  nextRank?: RankLike | null;
  exp: number;
  expToNext: number;
}

export interface RankProgressSummaryItem {
  key: 'current' | 'next' | 'remaining';
  label: string;
  value: string | number;
  tone: RankTitleTone;
}

export interface RankLadderInput {
  ranks: RankLike[];
  currentLevel?: number;
  exp: number;
  selectedLevel?: number;
}

export interface RankLadderItem extends RankLike {
  current: boolean;
  locked: boolean;
  selected: boolean;
}

export interface TitleCollectionSummaryInput {
  total: number;
  unlocked: number;
  displayed: boolean;
  hidden: number;
}

export interface TitleCollectionSummaryItem {
  key: 'unlocked' | 'progress' | 'displayed' | 'hidden';
  label: string;
  value: string | number;
  tone: RankTitleTone;
}

export function getRankProgressSummary(input: RankProgressSummaryInput): RankProgressSummaryItem[] {
  return [
    {
      key: 'current',
      label: '当前位阶',
      value: input.currentRank?.name || '未登记',
      tone: 'gold',
    },
    {
      key: 'next',
      label: '下一位阶',
      value: input.nextRank?.name || '已达顶点',
      tone: 'ocean',
    },
    {
      key: 'remaining',
      label: '还需灵魂碎片',
      value: input.nextRank ? input.expToNext : 0,
      tone: 'blood',
    },
  ];
}

export function getRankLadderItems(input: RankLadderInput): RankLadderItem[] {
  return input.ranks.map((rank) => ({
    ...rank,
    current: rank.level === input.currentLevel,
    locked: rank.expRequired > input.exp,
    selected: rank.level === input.selectedLevel,
  }));
}

export function getTitleCollectionSummary(input: TitleCollectionSummaryInput): TitleCollectionSummaryItem[] {
  const progress = input.total > 0 ? `${Math.round((input.unlocked / input.total) * 100)}%` : '0%';

  return [
    { key: 'unlocked', label: '已解锁', value: input.unlocked, tone: 'gold' },
    { key: 'progress', label: '收集进度', value: progress, tone: 'ocean' },
    { key: 'displayed', label: '展示印记', value: input.displayed ? 1 : 0, tone: 'gold' },
    { key: 'hidden', label: '隐藏印记', value: input.hidden, tone: 'blood' },
  ];
}
