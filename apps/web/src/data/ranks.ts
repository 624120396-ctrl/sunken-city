/**
 * 位阶系统配置 v1.1
 * 
 * 灵魂碎片（SP）是调查员在探索过程中积累的神秘残留
 * 随着碎片增多，调查员的位阶提升，解锁更多权限和称号
 */

export interface Rank {
  level: number;
  name: string;
  expRequired: number;
  description: string;
  privileges: string[];
  icon: string;
  color: string;
}

export const RANKS: Rank[] = [
  {
    level: 1,
    name: "海岸漫步者",
    expRequired: 0,
    description: "你站在悬崖边缘，脚下的海水拍打着礁石，远处有什么在呼唤。",
    privileges: [],
    icon: "🕯️",
    color: "#6b6558",
  },
  {
    level: 2,
    name: "雾气识途人",
    expRequired: 100,
    description: "浓雾中，你学会了辨认那些被遗忘的路标。",
    privileges: [],
    icon: "🌫️",
    color: "#8b7355",
  },
  {
    level: 3,
    name: "低语聆听者",
    expRequired: 300,
    description: "风中的低语不再只是噪音，它们诉说着古老的故事。",
    privileges: [],
    icon: "👁️",
    color: "#a69b85",
  },
  {
    level: 4,
    name: "禁卷翻阅者",
    expRequired: 600,
    description: "那些被封存的典籍向你敞开，知识是有重量的。",
    privileges: [],
    icon: "📜",
    color: "#c9a227",
  },
  {
    level: 5,
    name: "边界徘徊者",
    expRequired: 1000,
    description: "你游走在理智与疯狂的边缘，两者都向你敞开大门。",
    privileges: [],
    icon: "🕸️",
    color: "#d4c5a8",
  },
  {
    level: 6,
    name: "深渊潜行者",
    expRequired: 1500,
    description: "深海之下，你学会了在压力下呼吸。",
    privileges: [],
    icon: "🐙",
    color: "#8b2635",
  },
  {
    level: 7,
    name: "异界穿行客",
    expRequired: 2200,
    description: "维度的壁垒对你而言不再绝对，你知道裂缝在哪里。",
    privileges: [],
    icon: "🌊",
    color: "#a63848",
  },
  {
    level: 8,
    name: "真理窥视者",
    expRequired: 3000,
    description: "真相灼伤你的眼睛，但你已无法回头。",
    privileges: [],
    icon: "🔮",
    color: "#6b4c7a",
  },
  {
    level: 9,
    name: "群星归位使",
    expRequired: 4000,
    description: "当星辰排列成正确的图案，你是那个举起火炬的人。",
    privileges: [],
    icon: "✨",
    color: "#9b7aad",
  },
  {
    level: 10,
    name: "深渊凝视者",
    expRequired: 5500,
    description: "你凝视深渊如此之久，终于，深渊也凝视了你。",
    privileges: [],
    icon: "👑",
    color: "#e8d4a0",
  },
];

/**
 * 获取当前位阶信息
 */
export function getCurrentRank(exp: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (exp >= RANKS[i].expRequired) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

/**
 * 获取下一级位阶信息
 */
export function getNextRank(exp: number): Rank | null {
  const currentRank = getCurrentRank(exp);
  const nextLevel = currentRank.level + 1;
  return RANKS.find(r => r.level === nextLevel) || null;
}

/**
 * 获取升级所需灵魂碎片
 */
export function getExpToNextLevel(exp: number): number {
  const nextRank = getNextRank(exp);
  if (!nextRank) return 0;
  return nextRank.expRequired - exp;
}

/**
 * 获取升级进度百分比
 */
export function getLevelProgress(exp: number): number {
  const currentRank = getCurrentRank(exp);
  const nextRank = getNextRank(exp);
  
  if (!nextRank) return 100;
  
  const expInCurrentLevel = exp - currentRank.expRequired;
  const expNeededForLevel = nextRank.expRequired - currentRank.expRequired;
  
  return Math.min(100, Math.floor((expInCurrentLevel / expNeededForLevel) * 100));
}

/**
 * 获取灵魂碎片获取方式
 */
export const EXP_SOURCES = [
  {
    action: "完成一场跑团",
    exp: "10-50",
    description: "根据游戏时长和参与度获得",
  },
  {
    action: "创建调查员",
    exp: "5",
    description: "每创建一个新角色",
  },
  {
    action: "首次完成角色卡",
    exp: "20",
    description: "填写完整角色信息",
  },
  {
    action: "投掷骰子",
    exp: "1",
    description: "每次检定（上限20/天）",
  },
  {
    action: "大成功",
    exp: "5",
    description: "投出01-05",
  },
  {
    action: "发现线索",
    exp: "3",
    description: "标记重要线索",
  },
  {
    action: "连续登录",
    exp: "5-20",
    description: "每日递增，7天封顶",
  },
  {
    action: "邀请好友",
    exp: "30",
    description: "好友完成首局游戏",
  },
  {
    action: "撰写战报",
    exp: "15",
    description: "发布游戏回顾",
  },
  {
    action: "获得印记",
    exp: "10-100",
    description: "根据印记稀有度",
  },
];
