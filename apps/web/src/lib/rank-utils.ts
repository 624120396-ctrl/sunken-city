/**
 * 位阶计算工具函数
 * 
 * 注意：这些函数仅用于前端展示计算，实际的位阶判定由后端完成
 * 后端返回的用户数据中已经包含了计算后的位阶信息
 */

import type { RankConfig } from '../types/rank-title';

/**
 * 根据灵魂碎片数获取当前位阶
 */
export function getCurrentRank(exp: number, ranks: RankConfig[]): RankConfig {
  // 按等级降序排列，找到第一个灵魂碎片要求小于等于当前碎片的
  const sortedRanks = [...ranks]
    .filter(r => r.isActive)
    .sort((a, b) => b.level - a.level);
  
  for (const rank of sortedRanks) {
    if (exp >= rank.expRequired) {
      return rank;
    }
  }
  
  // 如果没有匹配的，返回最低位阶
  return sortedRanks[sortedRanks.length - 1] || {
    id: '',
    level: 1,
    name: '初入深渊',
    expRequired: 0,
    description: '你刚刚踏入这个疯狂的世界',
    privileges: [],
    icon: '🕯️',
    color: '#6b6558',
    isActive: true,
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
  };
}

/**
 * 获取下一级位阶
 */
export function getNextRank(exp: number, ranks: RankConfig[]): RankConfig | null {
  const currentRank = getCurrentRank(exp, ranks);
  const sortedRanks = [...ranks]
    .filter(r => r.isActive)
    .sort((a, b) => a.level - b.level);
  
  const currentIndex = sortedRanks.findIndex(r => r.level === currentRank.level);
  return sortedRanks[currentIndex + 1] || null;
}

/**
 * 获取升级到下一级所需灵魂碎片
 */
export function getExpToNextLevel(exp: number, ranks: RankConfig[]): number {
  const nextRank = getNextRank(exp, ranks);
  if (!nextRank) return 0;
  return nextRank.expRequired - exp;
}

/**
 * 获取当前位阶的进度百分比（到下一级）
 */
export function getLevelProgress(exp: number, ranks: RankConfig[]): number {
  const currentRank = getCurrentRank(exp, ranks);
  const nextRank = getNextRank(exp, ranks);
  
  if (!nextRank) return 100;
  
  const expInCurrentLevel = exp - currentRank.expRequired;
  const expNeededForLevel = nextRank.expRequired - currentRank.expRequired;
  
  return Math.min(100, Math.floor((expInCurrentLevel / expNeededForLevel) * 100));
}

/**
 * 获取位阶总数
 */
export function getTotalRanks(ranks: RankConfig[]): number {
  return ranks.filter(r => r.isActive).length;
}

/**
 * 获取灵魂碎片范围对应的位阶分布
 * 用于统计图表
 */
export function getRankDistribution(ranks: RankConfig[]): {
  level: number;
  name: string;
  expRange: string;
  color: string;
}[] {
  const sortedRanks = [...ranks]
    .filter(r => r.isActive)
    .sort((a, b) => a.level - b.level);
  
  return sortedRanks.map((rank, index) => {
    const nextRank = sortedRanks[index + 1];
    const expRange = nextRank 
      ? `${rank.expRequired} - ${nextRank.expRequired - 1}`
      : `${rank.expRequired}+`;
    
    return {
      level: rank.level,
      name: rank.name,
      expRange,
      color: rank.color,
    };
  });
}

/**
 * 格式化灵魂碎片显示
 * 超过1000显示为 1.2k
 */
export function formatExp(exp: number): string {
  if (exp >= 1000000) {
    return (exp / 1000000).toFixed(1) + 'M';
  }
  if (exp >= 1000) {
    return (exp / 1000).toFixed(1) + 'k';
  }
  return String(exp);
}

/**
 * 检查用户是否达到指定位阶
 */
export function hasReachedRank(exp: number, targetLevel: number, ranks: RankConfig[]): boolean {
  const currentRank = getCurrentRank(exp, ranks);
  return currentRank.level >= targetLevel;
}

/**
 * 获取指定位阶的信息
 */
export function getRankByLevel(level: number, ranks: RankConfig[]): RankConfig | null {
  return ranks.find(r => r.level === level && r.isActive) || null;
}

/**
 * 获取某灵魂碎片数在总进度中的百分比
 * 用于展示用户在整个位阶体系中的进度
 */
export function getOverallProgress(exp: number, ranks: RankConfig[]): number {
  const sortedRanks = [...ranks]
    .filter(r => r.isActive)
    .sort((a, b) => a.level - b.level);
  
  if (sortedRanks.length === 0) return 0;
  
  const maxExp = sortedRanks[sortedRanks.length - 1].expRequired;
  const minExp = sortedRanks[0].expRequired;
  
  if (maxExp === minExp) return 100;
  
  return Math.min(100, Math.floor(((exp - minExp) / (maxExp - minExp)) * 100));
}
