// 投骰结果解释映射
export const diceResultExplanations: Record<string, string> = {
  '大成功': '极罕见的好运！获得额外信息或意外好处',
  '极难成功': '在极端困难下成功，效果远超预期',
  '困难成功': '虽然困难但仍成功，获得良好结果',
  '成功': '目标达成，获得预期结果',
  '失败': '未能达成目标，可能获得部分信息或无功而返',
  '大失败': '灾难性的失败！可能遭遇意外危险或严重后果',
};

// 技能说明映射
export const skillExplanations: Record<string, string> = {
  '侦查': '发现隐藏物品、暗门、血迹、足迹等线索',
  '聆听': '听到门后的声音、悄悄靠近的脚步、窃窃私语',
  '图书馆': '在书籍、档案、图书馆中查找特定信息',
  '心理学': '判断对方是否说谎，洞察情绪状态',
  '话术': '通过哄骗、劝说、共情改变他人想法',
  '格斗': '近战攻击，使用拳头或近战武器',
  '闪避': '躲避攻击，成功后本回合不受伤害',
  '射击': '使用枪械射击，包括手枪、步枪等',
  '投掷': '投掷石头、手雷或其他物品',
  '潜行': '悄悄移动不被发现，跟踪或埋伏',
  '追踪': '跟随足迹、痕迹或线索',
  '生存': '野外求生，找食物、水源、庇护所',
  '急救': '稳定伤势，恢复1点HP，不能治疗自己',
  '医学': '专业治疗，恢复1d3点HP，需要药物',
  '精神分析': '治疗精神疾病，恢复理智值',
  '攀爬': '攀爬墙壁、悬崖、建筑物',
  '跳跃': '跨越障碍、跳过裂缝',
  '游泳': '在水中移动，避免溺水',
  '汽车驾驶': '驾驶汽车等现代交通工具',
  '骑术': '骑马或骑乘其他动物',
  '机械维修': '修理机械装置、车辆',
  '电气维修': '修理电器、电子设备',
  '锁匠': '开锁，包括机械锁和电子锁',
  '手艺': '制作或修理物品的手艺技能',
  '估价': '判断物品价值，识别赝品',
  '会计': '管理账目，发现财务异常',
  '法律': '了解法律知识，利用法律漏洞',
  '历史': '了解历史事件、人物、文化',
  '神秘学': '了解魔法、神秘传说、邪教知识',
  '科学': '各个科学领域的专业知识',
};

// 获取投骰结果解释
export function getSuccessExplanation(successLevel: string): string {
  return diceResultExplanations[successLevel] || '';
}

// 获取技能说明
export function getSkillExplanation(skillName: string): string {
  // 尝试直接匹配
  if (skillExplanations[skillName]) {
    return skillExplanations[skillName];
  }
  // 尝试部分匹配
  for (const [key, value] of Object.entries(skillExplanations)) {
    if (skillName.includes(key) || key.includes(skillName)) {
      return value;
    }
  }
  return '';
}
