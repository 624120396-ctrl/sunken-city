import { getOracleRarityMeta } from './dreamingOracleMeta.ts';

export interface DreamArchiveCardInput {
  key?: string;
  name?: string;
  rarity: string;
  unlocked: boolean;
  drawCount: number;
}

export interface DreamArchiveCardMeta {
  title: string;
  subtitle: string;
  lockLabel: string;
  seal: string;
  rarityLabel: string;
  tone: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface DreamHistoryInput {
  position: 'upright' | 'reversed';
  isRevealed: boolean;
  isDeepRevealed: boolean;
}

export interface DreamHistoryMeta {
  positionLabel: string;
  statusLabel: string;
  statusTone: 'sealed' | 'revealed' | 'deep';
  seal: string;
}

export interface DreamArchiveSummaryInput {
  unlocked: boolean;
}

export interface DreamArchiveSummary {
  unlocked: number;
  sealed: number;
  total: number;
  progressLabel: string;
}

export function getDreamArchiveCardMeta(card: DreamArchiveCardInput): DreamArchiveCardMeta {
  const rarity = getOracleRarityMeta(card.rarity);

  return {
    title: card.unlocked ? card.name || '未知牌面' : '封存牌面',
    subtitle: card.unlocked
      ? card.drawCount > 0
        ? `已抽中 ${card.drawCount} 次`
        : '已归档，未重复抽中'
      : '等待梦境解锁',
    lockLabel: card.unlocked ? '已归档' : '未解锁',
    seal: rarity.seal,
    rarityLabel: rarity.label,
    tone: rarity.tone,
  };
}

export function getDreamHistoryMeta(entry: DreamHistoryInput): DreamHistoryMeta {
  if (entry.isDeepRevealed) {
    return {
      positionLabel: entry.position === 'upright' ? '正位' : '逆位',
      statusLabel: '深层封缄',
      statusTone: 'deep',
      seal: 'III',
    };
  }

  if (entry.isRevealed) {
    return {
      positionLabel: entry.position === 'upright' ? '正位' : '逆位',
      statusLabel: '基础解读',
      statusTone: 'revealed',
      seal: 'II',
    };
  }

  return {
    positionLabel: entry.position === 'upright' ? '正位' : '逆位',
    statusLabel: '尚未解读',
    statusTone: 'sealed',
    seal: 'I',
  };
}

export function getDreamArchiveSummary(cards: DreamArchiveSummaryInput[]): DreamArchiveSummary {
  const unlocked = cards.filter((card) => card.unlocked).length;
  const total = cards.length;
  return {
    unlocked,
    sealed: total - unlocked,
    total,
    progressLabel: `${unlocked}/${total} 已记录`,
  };
}
