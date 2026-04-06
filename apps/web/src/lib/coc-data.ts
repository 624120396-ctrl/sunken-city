// COC7 技能数据
export const COC7_SKILLS = {
  // 战斗技能 (3)
  combat: [
    { name: '格斗(斗殴)', base: 25, icon: '👊' },
    { name: '格斗(剑)', base: 20, icon: '⚔️' },
    { name: '格斗(矛)', base: 20, icon: '🔱' },
    { name: '格斗(斧)', base: 15, icon: '🪓' },
    { name: '格斗(鞭)', base: 5, icon: '' },
    { name: '格斗(链枷)', base: 10, icon: '' },
    { name: '格斗(盾)', base: 15, icon: '🛡️' },
    { name: '射击(手枪)', base: 20, icon: '🔫' },
    { name: '射击(步枪/霰弹枪)', base: 25, icon: '' },
    { name: '射击(弓)', base: 15, icon: '🏹' },
    { name: '投掷', base: 20, icon: '🎯' },
    { name: '闪避', base: 0, icon: '💨', formula: 'DEX/2' },
  ],

  // 学术技能 (9)
  academic: [
    { name: '人类学', base: 1, icon: '🏛️' },
    { name: '考古学', base: 1, icon: '⛏️' },
    { name: '生物学', base: 1, icon: '🧬' },
    { name: '植物学', base: 1, icon: '🌿' },
    { name: '地质学', base: 1, icon: '🪨' },
    { name: '历史学', base: 5, icon: '📜' },
    { name: '物理学', base: 1, icon: '⚛️' },
    { name: '化学', base: 1, icon: '⚗️' },
    { name: '数学', base: 10, icon: '📐' },
    { name: '天文学', base: 1, icon: '🔭' },
    { name: '法律', base: 5, icon: '⚖️' },
    { name: '图书馆使用', base: 20, icon: '📚' },
    { name: '神秘学', base: 5, icon: '🔮' },
    { name: '心理学', base: 10, icon: '🧠' },
  ],

  // 实用技能 (18)
  practical: [
    { name: '攀爬', base: 20, icon: '🧗' },
    { name: '跳跃', base: 20, icon: '⬆️' },
    { name: '游泳', base: 20, icon: '🏊' },
    { name: '驾驶(汽车)', base: 20, icon: '🚗' },
    { name: '驾驶(马车)', base: 15, icon: '🐴' },
    { name: '驾驶(飞行器)', base: 1, icon: '✈️' },
    { name: '机械维修', base: 10, icon: '🔧' },
    { name: '电气维修', base: 10, icon: '⚡' },
    { name: '锁匠', base: 1, icon: '🔐' },
    { name: '潜行', base: 20, icon: '🥷' },
    { name: '追踪', base: 10, icon: '👣' },
    { name: '生存(森林)', base: 10, icon: '🌲' },
    { name: '生存(沙漠)', base: 10, icon: '🏜️' },
    { name: '生存(极地)', base: 10, icon: '❄️' },
    { name: '生存(海洋)', base: 10, icon: '🌊' },
    { name: '骑术', base: 15, icon: '🐎' },
    { name: '摄影', base: 5, icon: '📷' },
    { name: '无线电操作', base: 5, icon: '📡' },
  ],

  // 社交技能 (6)
  social: [
    { name: '话术', base: 5, icon: '💬' },
    { name: '恐吓', base: 15, icon: '😠' },
    { name: '说服', base: 10, icon: '🗣️' },
    { name: '魅惑', base: 15, icon: '💋' },
    { name: '取悦', base: 15, icon: '😊' },
    { name: '快速交谈', base: 5, icon: '💨' },
  ],

  // 语言技能 (6)
  language: [
    { name: '母语', base: 0, icon: '🗣️', formula: 'EDU' },
    { name: '英语', base: 0, icon: '🇬🇧' },
    { name: '法语', base: 0, icon: '🇫🇷' },
    { name: '德语', base: 0, icon: '🇩🇪' },
    { name: '拉丁语', base: 0, icon: '📜' },
    { name: '其他语言', base: 0, icon: '🌍' },
  ],

  // 医疗技能 (3)
  medical: [
    { name: '急救', base: 30, icon: '🚑' },
    { name: '医学', base: 1, icon: '🩺' },
    { name: '精神分析', base: 1, icon: '🛋️' },
  ],

  // 侦查/洞察
  investigative: [
    { name: '侦查', base: 25, icon: '👁️' },
    { name: '聆听', base: 20, icon: '👂' },
    { name: '图书馆使用', base: 20, icon: '📖' },
    { name: '追踪', base: 10, icon: '🔍' },
    { name: '估价', base: 5, icon: '💰' },
    { name: '会计', base: 5, icon: '📊' },
    { name: '信用评分', base: 0, icon: '💳' },
    { name: '乔装', base: 5, icon: '🎭' },
    { name: '演技', base: 5, icon: '🎬' },
    { name: '手艺(绘画)', base: 5, icon: '🎨' },
    { name: '手艺(摄影)', base: 5, icon: '📸' },
    { name: '手艺(木工)', base: 5, icon: '🪚' },
  ],
};

// 技能分类显示名称
export const SKILL_CATEGORIES = {
  combat: { name: '战斗技能', icon: '⚔️' },
  academic: { name: '学术技能', icon: '📚' },
  practical: { name: '实用技能', icon: '🛠️' },
  social: { name: '社交技能', icon: '💬' },
  language: { name: '语言技能', icon: '🗣️' },
  medical: { name: '医疗技能', icon: '🏥' },
  investigative: { name: '侦查技能', icon: '🔍' },
};

// 获取所有技能列表
export function getAllSkills(): Array<{ name: string; base: number; category?: string }> {
  const allSkills: Array<{ name: string; base: number; category?: string }> = [];
  for (const [category, skills] of Object.entries(COC7_SKILLS)) {
    skills.forEach(skill => {
      allSkills.push({ ...skill, category });
    });
  }
  return allSkills;
}

// 计算技能成功率
export function calculateSkillValue(skill: any, attributes: any) {
  let value = skill.base;
  
  if (skill.formula === 'DEX/2') {
    value = Math.floor(attributes.dex / 2);
  } else if (skill.formula === 'EDU') {
    value = attributes.edu;
  }
  
  return value;
}

// 计算派生属性
export function calculateDerivedAttributes(attrs: any) {
  const hp = Math.floor((attrs.con + attrs.siz) / 10);
  const mp = Math.floor(attrs.pow / 5);
  const san = attrs.pow;
  
  // 移动力计算
  let mov = 8;
  if (attrs.dex < attrs.siz && attrs.str < attrs.siz) mov = 7;
  if (attrs.dex > attrs.siz && attrs.str > attrs.siz) mov = 9;
  
  // 体格计算
  const sum = attrs.str + attrs.siz;
  let build = 0;
  if (sum >= 164) build = 2;
  else if (sum >= 124) build = 1;
  else if (sum >= 84) build = 0;
  else if (sum >= 64) build = -1;
  else build = -2;
  
  // DB伤害加值
  let db = '-2';
  if (sum >= 164) db = '+1d6';
  else if (sum >= 124) db = '+1d4';
  else if (sum >= 84) db = '0';
  else if (sum >= 64) db = '-1d6';
  
  return { hp, mp, san, mov, build, db };
}

// 预设职业列表
export const OCCUPATIONS = [
  { name: '私家侦探', skills: ['图书馆使用', '侦查', '心理学', '话术', '法律', '射击(手枪)', '格斗(斗殴)', '乔装'] },
  { name: '医生', skills: ['医学', '急救', '生物学', '化学', '心理学', '语言(拉丁语)', '侦查', '聆听'] },
  { name: '教授', skills: ['图书馆使用', '历史学', '心理学', '英语', '话术', '说服', '任意学术技能*2'] },
  { name: '警察', skills: ['格斗(斗殴)', '射击(手枪)', '射击(步枪/霰弹枪)', '法律', '心理学', '侦查', '追踪', '聆听'] },
  { name: '作家', skills: ['艺术(写作)', '历史学', '图书馆使用', '自然学', '神秘学', '心理学', '英语', '任意其他语言'] },
  { name: '记者', skills: ['话术', '图书馆使用', '英语', '聆听', '说服', '心理学', '侦查', '摄影'] },
  { name: '士兵', skills: ['攀爬', '格斗(斗殴)', '射击(步枪/霰弹枪)', '射击(手枪)', '潜行', '生存', '游泳', '投掷'] },
  { name: '罪犯', skills: ['格斗(斗殴)', '射击(手枪)', '锁匠', '话术', '潜行', '侦查', '乔装', '追踪'] },
  { name: '艺术家', skills: ['艺术(任意)', '历史', '图书馆使用', '自然学', '侦查', '外语', '心理学', '侦查'] },
  { name: '神职人员', skills: ['历史', '图书馆使用', '聆听', '语言(任意)', '心理学', '话术', '英语', '神秘学'] },
];