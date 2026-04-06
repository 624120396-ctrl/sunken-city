const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ranks = [
  { level: 1, name: '海岸漫步者', expRequired: 0, description: '你刚刚听闻深海的低语', privileges: '', icon: '🕯️', color: '#6b6558', sortOrder: 1 },
  { level: 2, name: '雾气识途人', expRequired: 100, description: '你学会了在迷雾中辨认方向', privileges: '', icon: '🌫️', color: '#7a7568', sortOrder: 2 },
  { level: 3, name: '低语聆听者', expRequired: 300, description: '你能听见常人无法察觉的声音', privileges: '', icon: '👂', color: '#8b7355', sortOrder: 3 },
  { level: 4, name: '禁卷翻阅者', expRequired: 600, description: '你敢于触碰被尘封的知识', privileges: '', icon: '📜', color: '#a69b85', sortOrder: 4 },
  { level: 5, name: '边界徘徊者', expRequired: 1000, description: '你行走在现实与疯狂的边缘', privileges: '', icon: '🚪', color: '#c9a227', sortOrder: 5 },
  { level: 6, name: '深渊潜行者', expRequired: 2000, description: '你已深入那不可名状的深渊', privileges: '', icon: '🌊', color: '#8b2635', sortOrder: 6 },
  { level: 7, name: '异界穿行客', expRequired: 3000, description: '你能在不同维度间穿行', privileges: '', icon: '✨', color: '#6b4c7a', sortOrder: 7 },
  { level: 8, name: '真理窥视者', expRequired: 4000, description: '你窥见了宇宙的真实面目', privileges: '', icon: '👁️', color: '#9b7aad', sortOrder: 8 },
  { level: 9, name: '群星归位使', expRequired: 5000, description: '你等待古老者的归来', privileges: '', icon: '⭐', color: '#d4c5a8', sortOrder: 9 },
  { level: 10, name: '深渊凝视者', expRequired: 5500, description: '你已成为了深渊本身', privileges: '', icon: '🌑', color: '#e8d4a0', sortOrder: 10 },
];

const titles = [
  // 探索类
  { key: 'first_step', name: '初次迈步', description: '踏上调查员之路的第一步', category: 'exploration', rarity: 'common', condition: '创建第一个调查员', expReward: 10, icon: '🦶', color: '#a69b85' },
  { key: 'explorer', name: '传说追寻者', description: '你追寻着远古的传说', category: 'exploration', rarity: 'rare', condition: '完成10场跑团', expReward: 50, icon: '🗺️', color: '#c9a227' },
  { key: 'dimension_walker', name: '次元行者', description: '你已踏足异次元之地', category: 'exploration', rarity: 'epic', condition: '完成50场跑团', expReward: 200, icon: '🌀', color: '#8b2635' },
  { key: 'truth_seeker', name: '真理追寻者', description: '你渴望揭开真相的面纱', category: 'exploration', rarity: 'legendary', condition: '收集100条线索', expReward: 500, icon: '🔍', color: '#6b4c7a' },
  { key: 'first_contact', name: '首次接触', description: '你与不可名状之物相遇', category: 'exploration', rarity: 'common', condition: '遭遇第一种神话生物', expReward: 20, icon: '👽', color: '#a69b85' },
  
  // 战斗类
  { key: 'lucky_shot', name: '幸运一击', description: '命运眷顾了你的 dice', category: 'combat', rarity: 'common', condition: '投出一次大成功(01-05)', expReward: 15, icon: '🎯', color: '#a69b85' },
  { key: 'monster_hunter', name: '怪物猎手', description: '你是黑暗中的利刃', category: 'combat', rarity: 'rare', condition: '击败5只神话生物', expReward: 100, icon: '⚔️', color: '#c9a227' },
  { key: 'unstoppable', name: '势不可挡', description: '没有什么能阻挡你', category: 'combat', rarity: 'epic', condition: '连续10场战斗未受伤', expReward: 300, icon: '🛡️', color: '#8b2635' },
  { key: 'legendary_warrior', name: '传说战士', description: '你的名字令人闻风丧胆', category: 'combat', rarity: 'legendary', condition: '累计击败50只神话生物', expReward: 800, icon: '🏆', color: '#6b4c7a' },
  { key: 'last_stand', name: '背水一战', description: '在绝境中绽放光芒', category: 'combat', rarity: 'rare', condition: '在HP为1时击败敌人', expReward: 80, icon: '🔥', color: '#c9a227' },
  
  // 社交类
  { key: 'storyteller', name: '说书人', description: '你编织着恐怖的故事', category: 'social', rarity: 'common', condition: '作为KP完成首场游戏', expReward: 20, icon: '📖', color: '#a69b85' },
  { key: 'team_leader', name: '队伍领袖', description: '你是指引方向的灯塔', category: 'social', rarity: 'rare', condition: '创建并管理一个固定小队', expReward: 60, icon: '👑', color: '#c9a227' },
  { key: 'keeper_lore', name: '传说守秘人', description: '你守护着古老的秘密', category: 'social', rarity: 'epic', condition: '作为KP完成30场游戏', expReward: 300, icon: '🎭', color: '#8b2635' },
  { key: 'social_butterfly', name: '社交蝴蝶', description: '你穿梭于各个圈子', category: 'social', rarity: 'rare', condition: '与20位不同玩家组队', expReward: 100, icon: '🦋', color: '#c9a227' },
  { key: 'mentor', name: '引路人', description: '你指引新人前行', category: 'social', rarity: 'epic', condition: '帮助5位新人完成首场游戏', expReward: 250, icon: '🕯️', color: '#8b2635' },
  
  // 疯狂类
  { key: 'first_madness', name: '初尝疯狂', description: '疯狂第一次造访了你', category: 'madness', rarity: 'common', condition: '首次陷入临时疯狂', expReward: 10, icon: '😵', color: '#a69b85' },
  { key: 'edge_madness', name: '疯狂边缘', description: '你在理智的边缘起舞', category: 'madness', rarity: 'rare', condition: 'SAN值降到30以下', expReward: 50, icon: '⚠️', color: '#c9a227' },
  { key: 'beyond_sanity', name: '超越理智', description: '你已超越凡人的理智', category: 'madness', rarity: 'epic', condition: '累计失去99点SAN', expReward: 500, icon: '💀', color: '#8b2635' },
  { key: 'fumble_master', name: '厄运缠身', description: '坏运气追随着你', category: 'madness', rarity: 'rare', condition: '投出10次大失败', expReward: 100, icon: '💥', color: '#c9a227' },
  { key: 'survivor', name: '疯狂幸存者', description: '你从疯狂中生还', category: 'madness', rarity: 'epic', condition: '从永久性疯狂中恢复', expReward: 400, icon: '🌅', color: '#8b2635' },
  
  // 特殊类
  { key: 'pioneer', name: '先驱者', description: '你是探索未知的先锋', category: 'special', rarity: 'rare', condition: '平台首批用户', expReward: 200, icon: '🚀', color: '#c9a227' },
  { key: 'bug_hunter', name: '漏洞猎人', description: '你发现隐藏的缺陷', category: 'special', rarity: 'epic', condition: '发现并报告重大Bug', expReward: 300, icon: '🐛', color: '#8b2635' },
  { key: 'immortal', name: '不朽者', description: '你已超越生死', category: 'special', rarity: 'mythical', condition: '让调查员存活超过100场游戏', expReward: 2000, icon: '♾️', color: '#e8d4a0' },
  { key: 'completionist', name: '完美主义者', description: '你收集了所有印记', category: 'special', rarity: 'legendary', condition: '收集所有印记', expReward: 1000, icon: '💎', color: '#6b4c7a' },
  { key: 'veteran', name: '资深调查员', description: '你是经验丰富的老手', category: 'special', rarity: 'rare', condition: '游戏时长超过100小时', expReward: 150, icon: '⏳', color: '#c9a227' },
  
  // 隐藏类
  { key: 'deep_one', name: '深潜者', description: '来自深海的呼唤', category: 'hidden', rarity: 'mythical', condition: '???', expReward: 999, icon: '🐟', color: '#e8d4a0', hint: '在某些深夜，你会听见海洋的呼唤...', isHidden: true },
  { key: 'time_traveler', name: '时间旅行者', description: '你穿梭于时间之河', category: 'hidden', rarity: 'mythical', condition: '???', expReward: 999, icon: '⏰', color: '#e8d4a0', hint: '回到过去改变了什么...', isHidden: true },
  { key: 'chosen_one', name: '被选中者', description: '命运选择了你', category: 'hidden', rarity: 'mythical', condition: '???', expReward: 999, icon: '👑', color: '#e8d4a0', hint: '当群星归位之时...', isHidden: true },
];

async function main() {
  console.log('开始初始化数据...');
  
  // 插入位阶
  for (const rank of ranks) {
    await prisma.rankConfig.upsert({
      where: { level: rank.level },
      update: rank,
      create: rank,
    });
  }
  console.log(`✅ 已插入 ${ranks.length} 个位阶`);
  
  // 插入印记
  for (const title of titles) {
    await prisma.titleConfig.upsert({
      where: { key: title.key },
      update: title,
      create: { ...title, isActive: true, sortOrder: 0 },
    });
  }
  console.log(`✅ 已插入 ${titles.length} 个印记`);
  
  console.log('数据初始化完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
