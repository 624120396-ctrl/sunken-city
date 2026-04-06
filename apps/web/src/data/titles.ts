/**
 * 印记（称号）系统配置 v1.1
 * 
 * 印记是调查员在探索过程中获得的特殊标记
 * 代表着特定的经历、成就或身份
 */

export type TitleRarity = "common" | "rare" | "epic" | "legendary" | "mythical";
export type TitleCategory = "exploration" | "combat" | "social" | "madness" | "special" | "hidden";

export interface Title {
  id: string;
  name: string;
  description: string;
  category: TitleCategory;
  rarity: TitleRarity;
  condition: string;
  expReward: number;
  icon: string;
  color: string;
  hint?: string; // 获取提示（隐藏印记用）
}

// 稀有度配置
export const RARITY_CONFIG: Record<TitleRarity, { name: string; color: string; bgColor: string }> = {
  common: { name: "普通", color: "#a69b85", bgColor: "rgba(166, 155, 133, 0.1)" },
  rare: { name: "稀有", color: "#c9a227", bgColor: "rgba(201, 162, 39, 0.1)" },
  epic: { name: "史诗", color: "#8b2635", bgColor: "rgba(139, 38, 53, 0.1)" },
  legendary: { name: "传说", color: "#6b4c7a", bgColor: "rgba(107, 76, 122, 0.1)" },
  mythical: { name: "神话", color: "#e8d4a0", bgColor: "rgba(232, 212, 160, 0.1)" },
};

// 分类配置
export const CATEGORY_CONFIG: Record<TitleCategory, { name: string; icon: string; description: string }> = {
  exploration: { name: "探索", icon: "🗺️", description: "在探索中展现出的勇气与智慧" },
  combat: { name: "战斗", icon: "⚔️", description: "面对恐怖时的英勇表现" },
  social: { name: "社交", icon: "🗣️", description: "与人打交道的能力和影响力" },
  madness: { name: "疯狂", icon: "🌀", description: "理智边缘的疯狂经历" },
  special: { name: "特殊", icon: "⭐", description: "特殊贡献和独特成就" },
  hidden: { name: "隐藏", icon: "❓", description: "未知条件的神秘印记" },
};

export const TITLES: Title[] = [
  // ========== 探索类 ==========
  {
    id: "first_step",
    name: "初次迈步",
    description: "完成你的第一次跑团",
    category: "exploration",
    rarity: "common",
    condition: "完成1场跑团",
    expReward: 10,
    icon: "👣",
    color: "#a69b85",
  },
  {
    id: "veteran_explorer",
    name: "资深探索者",
    description: "参与了10场不同的冒险",
    category: "exploration",
    rarity: "rare",
    condition: "完成10场跑团",
    expReward: 30,
    icon: "🧭",
    color: "#c9a227",
  },
  {
    id: "legend_seeker",
    name: "传说追寻者",
    description: "完成了50场跑团，见证了无数故事",
    category: "exploration",
    rarity: "epic",
    condition: "完成50场跑团",
    expReward: 100,
    icon: "📚",
    color: "#8b2635",
  },
  {
    id: "dimension_walker",
    name: "次元行者",
    description: "穿越了无数个世界线",
    category: "exploration",
    rarity: "legendary",
    condition: "完成100场跑团",
    expReward: 200,
    icon: "🌌",
    color: "#6b4c7a",
  },
  {
    id: "clue_hunter",
    name: "线索猎手",
    description: "善于发现隐藏的真相",
    category: "exploration",
    rarity: "rare",
    condition: "累计标记50条线索",
    expReward: 25,
    icon: "🔍",
    color: "#c9a227",
  },

  // ========== 战斗类 ==========
  {
    id: "lucky_shot",
    name: "幸运一击",
    description: "投出一次大成功",
    category: "combat",
    rarity: "common",
    condition: "投出01-05",
    expReward: 10,
    icon: "🎯",
    color: "#a69b85",
  },
  {
    id: "crisis_avoider",
    name: "危机规避者",
    description: "在关键时刻投出成功，化险为夷",
    category: "combat",
    rarity: "rare",
    condition: "在HP≤3时成功通过检定",
    expReward: 20,
    icon: "🎲",
    color: "#c9a227",
  },
  {
    id: "monster_slayer",
    name: "怪物猎手",
    description: "在战斗中击败过神话生物",
    category: "combat",
    rarity: "epic",
    condition: "参与击败神话生物",
    expReward: 50,
    icon: "⚔️",
    color: "#8b2635",
  },
  {
    id: "last_stand",
    name: "最后坚守",
    description: "濒死状态下完成关键行动",
    category: "combat",
    rarity: "epic",
    condition: "HP=1时完成关键检定",
    expReward: 40,
    icon: "🛡️",
    color: "#8b2635",
  },
  {
    id: "unstoppable",
    name: "势不可挡",
    description: "连续投出5次成功",
    category: "combat",
    rarity: "legendary",
    condition: "连续5次检定成功",
    expReward: 80,
    icon: "🔥",
    color: "#6b4c7a",
  },

  // ========== 社交类 ==========
  {
    id: "storyteller",
    name: "说书人",
    description: "善于讲述引人入胜的故事",
    category: "social",
    rarity: "rare",
    condition: "单场游戏发送100条消息",
    expReward: 20,
    icon: "📖",
    color: "#c9a227",
  },
  {
    id: "party_leader",
    name: "队伍领袖",
    description: "作为KP成功主持10场游戏",
    category: "social",
    rarity: "epic",
    condition: "作为KP完成10场跑团",
    expReward: 60,
    icon: "👑",
    color: "#8b2635",
  },
  {
    id: "social_butterfly",
    name: "社交蝴蝶",
    description: "与50位不同的玩家一起游戏",
    category: "social",
    rarity: "rare",
    condition: "与50位不同玩家同场",
    expReward: 30,
    icon: "🦋",
    color: "#c9a227",
  },
  {
    id: "mentor",
    name: "引导者",
    description: "帮助5位新手完成首次跑团",
    category: "social",
    rarity: "epic",
    condition: "带领5位新手完成游戏",
    expReward: 50,
    icon: "🕯️",
    color: "#8b2635",
  },
  {
    id: "legend_kp",
    name: "传说守秘人",
    description: "创造了令人难忘的故事",
    category: "social",
    rarity: "legendary",
    condition: "作为KP完成50场跑团",
    expReward: 150,
    icon: "📜",
    color: "#6b4c7a",
  },

  // ========== 疯狂类 ==========
  {
    id: "first_madness",
    name: "初尝疯狂",
    description: "经历了第一次理智丧失",
    category: "madness",
    rarity: "common",
    condition: "单场失去5点以上SAN",
    expReward: 5,
    icon: "🌀",
    color: "#6b4c7a",
  },
  {
    id: "mad_whisperer",
    name: "疯狂低语者",
    description: "SAN值低于30仍坚持调查",
    category: "madness",
    rarity: "rare",
    condition: "SAN<30时完成整场游戏",
    expReward: 30,
    icon: "👁️",
    color: "#6b4c7a",
  },
  {
    id: "insanity_edge",
    name: "疯狂边缘",
    description: "SAN值降至10以下并存活",
    category: "madness",
    rarity: "epic",
    condition: "SAN≤10时存活通关",
    expReward: 60,
    icon: "🎭",
    color: "#6b4c7a",
  },
  {
    id: "beyond_sanity",
    name: "超越理智",
    description: "完全理解了宇宙的真相",
    category: "madness",
    rarity: "legendary",
    condition: "累计失去99点SAN",
    expReward: 150,
    icon: "🌑",
    color: "#6b4c7a",
  },
  {
    id: "cultist",
    name: "秘教信徒",
    description: "你开始相信那些古老的传说",
    category: "madness",
    rarity: "rare",
    condition: "累计失去30点SAN",
    expReward: 25,
    icon: "⛧",
    color: "#6b4c7a",
  },

  // ========== 特殊类 ==========
  {
    id: "founder",
    name: "先驱者",
    description: "沉没之城的早期居民",
    category: "special",
    rarity: "legendary",
    condition: "在v1.0版本前注册",
    expReward: 100,
    icon: "🏛️",
    color: "#e8d4a0",
  },
  {
    id: "bug_hunter",
    name: "漏洞猎人",
    description: "帮助发现了平台的严重问题",
    category: "special",
    rarity: "epic",
    condition: "报告并确认重大Bug",
    expReward: 50,
    icon: "🐛",
    color: "#8b2635",
  },
  {
    id: "content_creator",
    name: "内容创作者",
    description: "为社区贡献了优质内容",
    category: "special",
    rarity: "rare",
    condition: "发布被推荐的战报/模组",
    expReward: 40,
    icon: "✍️",
    color: "#c9a227",
  },
  {
    id: "roleplay_master",
    name: "角色扮演大师",
    description: "完美的角色扮演表现",
    category: "special",
    rarity: "epic",
    condition: "获得其他玩家一致好评",
    expReward: 50,
    icon: "🎭",
    color: "#8b2635",
  },
  {
    id: "immortal",
    name: "不朽者",
    description: "从未在任何一场游戏中死亡或疯狂",
    category: "special",
    rarity: "legendary",
    condition: "连续20场存活",
    expReward: 200,
    icon: "💀",
    color: "#6b4c7a",
  },

  // ========== 隐藏类 ==========
  {
    id: "deep_one",
    name: "深潜者",
    description: "来自深海的呼唤...",
    category: "hidden",
    rarity: "mythical",
    condition: "???",
    expReward: 500,
    icon: "🐙",
    color: "#e8d4a0",
    hint: "在特定时间登录...",
  },
  {
    id: "time_traveler",
    name: "时间旅行者",
    description: "你似乎知道一些不该知道的事",
    category: "hidden",
    rarity: "mythical",
    condition: "???",
    expReward: 500,
    icon: "⏳",
    color: "#e8d4a0",
    hint: "尝试某种特定的操作序列...",
  },
  {
    id: "chosen_one",
    name: "被选中者",
    description: "命运选择了你",
    category: "hidden",
    rarity: "mythical",
    condition: "???",
    expReward: 999,
    icon: "⭐",
    color: "#e8d4a0",
    hint: "完成所有其他印记的收集...",
  },
];

/**
 * 按分类获取印记
 */
export function getTitlesByCategory(category: TitleCategory): Title[] {
  return TITLES.filter(t => t.category === category);
}

/**
 * 按稀有度获取印记
 */
export function getTitlesByRarity(rarity: TitleRarity): Title[] {
  return TITLES.filter(t => t.rarity === rarity);
}

/**
 * 获取用户已解锁的印记
 */
export function getUnlockedTitles(userTitles: string[]): Title[] {
  return TITLES.filter(t => userTitles.includes(t.id));
}

/**
 * 获取用户未解锁的印记
 */
export function getLockedTitles(userTitles: string[]): Title[] {
  return TITLES.filter(t => !userTitles.includes(t.id));
}

/**
 * 获取总印记数
 */
export function getTotalTitleCount(): number {
  return TITLES.length;
}

/**
 * 获取某分类的印记数量
 */
export function getTitleCountByCategory(category: TitleCategory): number {
  return TITLES.filter(t => t.category === category).length;
}
