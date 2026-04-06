/**
 * 位阶与印记系统 - 类型定义 v2.0
 * 
 * 可配置化的位阶和印记系统类型定义
 */

// ========== 位阶相关 ==========

export interface RankConfig {
  id: string;
  level: number;
  name: string;
  expRequired: number;
  description: string;
  privileges: string[];
  icon: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RankWithStats extends RankConfig {
  userCount: number;  // 当前位阶的用户数量
}

// ========== 印记相关 ==========

export type TitleCategory = 'exploration' | 'combat' | 'social' | 'madness' | 'special' | 'hidden';
export type TitleRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical';

export interface TitleConfig {
  id: string;
  key: string;
  name: string;
  description: string;
  category: TitleCategory;
  rarity: TitleRarity;
  condition: string;
  conditionCode?: string;
  expReward: number;
  icon: string;
  color: string;
  hint?: string;
  isActive: boolean;
  isHidden: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TitleWithStats extends TitleConfig {
  unlockedCount: number;  // 解锁该印记的用户数量
}

// 印记分类配置（用于UI展示）
export const CATEGORY_CONFIG: Record<TitleCategory, { name: string; icon: string; description: string }> = {
  exploration: { name: '探索', icon: '🗺️', description: '在探索中展现出的勇气与智慧' },
  combat: { name: '战斗', icon: '⚔️', description: '面对恐怖时的英勇表现' },
  social: { name: '社交', icon: '🗣️', description: '与人打交道的能力和影响力' },
  madness: { name: '疯狂', icon: '🌀', description: '理智边缘的疯狂经历' },
  special: { name: '特殊', icon: '⭐', description: '特殊贡献和独特成就' },
  hidden: { name: '隐藏', icon: '❓', description: '未知条件的神秘印记' },
};

// 印记稀有度配置
export const RARITY_CONFIG: Record<TitleRarity, { name: string; color: string; bgColor: string }> = {
  common: { name: '普通', color: '#a69b85', bgColor: 'rgba(166, 155, 133, 0.1)' },
  rare: { name: '稀有', color: '#c9a227', bgColor: 'rgba(201, 162, 39, 0.1)' },
  epic: { name: '史诗', color: '#8b2635', bgColor: 'rgba(139, 38, 53, 0.1)' },
  legendary: { name: '传说', color: '#6b4c7a', bgColor: 'rgba(107, 76, 122, 0.1)' },
  mythical: { name: '神话', color: '#e8d4a0', bgColor: 'rgba(232, 212, 160, 0.1)' },
};

// ========== 用户相关 ==========

export interface UserTitle {
  id: string;
  userId: string;
  titleKey: string;
  titleConfig: TitleConfig;  // 关联的印记配置
  unlockedAt: string;
  unlockedBy: 'system' | 'manual' | 'admin';
  grantedBy?: string;
  note?: string;
}

export interface UserRankInfo {
  exp: number;
  currentRank: RankConfig;
  nextRank?: RankConfig;
  progressToNext: number;  // 0-100
  expToNext: number;
}

export interface UserTitleInfo {
  displayedTitle: TitleConfig | null;  // 当前展示的印记
  unlockedTitles: UserTitle[];
  unlockedCount: number;
  totalCount: number;
}

// ========== 用户完整信息（聚合） ==========

export interface UserWithRankAndTitle {
  id: string;
  email: string;
  nickname: string;
  exp: number;
  isAdmin: boolean;
  
  // 计算后的位阶信息
  rank: {
    level: number;
    name: string;
    icon: string;
    color: string;
    expRequired: number;
    description: string;
  };
  
  // 展示的印记（如果没有则展示位阶名称）
  displayBadge: {
    type: 'rank' | 'title';
    name: string;
    icon: string;
    color: string;
  };
  
  // 印记统计
  titleStats: {
    unlockedCount: number;
    totalCount: number;
    displayedTitleKey: string | null;
  };
}

// ========== 管理后台相关 ==========

export interface RankFormData {
  level: number;
  name: string;
  expRequired: number;
  description: string;
  privileges: string[];
  icon: string;
  color: string;
}

export interface TitleFormData {
  key: string;
  name: string;
  description: string;
  category: TitleCategory;
  rarity: TitleRarity;
  condition: string;
  conditionCode?: string;
  expReward: number;
  icon: string;
  color: string;
  hint?: string;
  isHidden: boolean;
}

// 条件代码选项（用于下拉选择）
export const CONDITION_CODE_OPTIONS = [
  { value: 'manual', label: '仅手动授予', description: '管理员手动授予，不自动触发' },
  { value: 'first_game', label: '完成首场游戏', description: '用户完成第一场跑团' },
  { value: 'games_10', label: '完成10场游戏', description: '累计完成10场跑团' },
  { value: 'games_50', label: '完成50场游戏', description: '累计完成50场跑团' },
  { value: 'games_100', label: '完成100场游戏', description: '累计完成100场跑团' },
  { value: 'critical_success', label: '大成功', description: '投出01-05' },
  { value: 'fumble', label: '大失败', description: '投出96-00' },
  { value: 'san_loss_5', label: '失去5点SAN', description: '单场失去5点以上理智' },
  { value: 'san_loss_30', label: '累计失去30点SAN', description: '累计失去30点理智' },
  { value: 'san_loss_99', label: '累计失去99点SAN', description: '完全疯狂' },
  { value: 'character_create', label: '创建首个角色', description: '创建第一个调查员' },
  { value: 'character_5', label: '创建5个角色', description: '创建5个调查员' },
  { value: 'clue_50', label: '标记50条线索', description: '累计标记50条线索' },
  { value: 'kp_10', label: '主持10场游戏', description: '作为KP完成10场跑团' },
  { value: 'kp_50', label: '主持50场游戏', description: '作为KP完成50场跑团' },
  { value: 'consecutive_login_7', label: '连续登录7天', description: '连续7天登录' },
  { value: 'invite_friend', label: '邀请好友', description: '邀请的好友完成首场游戏' },
  { value: 'survive_20', label: '连续存活20场', description: '连续20场游戏未死亡或疯狂' },
] as const;

// ========== 日志相关 ==========

export interface UserRankHistory {
  id: string;
  userId: string;
  oldLevel: number;
  newLevel: number;
  oldExp: number;
  newExp: number;
  reason: string;
  changedBy?: string;
  createdAt: string;
}

export interface TitleUnlockLog {
  id: string;
  userId: string;
  titleKey: string;
  titleConfig: TitleConfig;
  expReward: number;
  unlockedBy: string;
  grantedBy?: string;
  note?: string;
  createdAt: string;
}
