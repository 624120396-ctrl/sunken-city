// COC7e 标准技能列表与基础值
// 数据来源：《克苏鲁的呼唤》第七版规则书第四章

export interface SkillDefinition {
  key: string;
  name: string;
  baseValue: number;
  category: 'combat' | 'communication' | 'investigation' | 'knowledge' | 'survival' | 'magic' | 'language' | 'science' | 'art' | 'general';
  isSpecialization: boolean;
  specializations?: string[]; // 常见专攻示例
}

// 核心58项技能（含专攻展开后的实际名称格式）
export const COC7_SKILLS: SkillDefinition[] = [
  { key: 'accounting', name: '会计', baseValue: 5, category: 'general', isSpecialization: false },
  { key: 'animal_handling', name: '动物驯养', baseValue: 5, category: 'general', isSpecialization: false },
  { key: 'anthropology', name: '人类学', baseValue: 1, category: 'knowledge', isSpecialization: false },
  { key: 'appraise', name: '估价', baseValue: 5, category: 'general', isSpecialization: false },
  { key: 'archaeology', name: '考古学', baseValue: 1, category: 'knowledge', isSpecialization: false },
  { key: 'art_craft', name: '艺术与手艺', baseValue: 5, category: 'art', isSpecialization: true, specializations: ['写作', '表演', '摄影', '伪造', '美术', '音乐', '舞蹈', '烹饪', '设计图纸'] },
  { key: 'charm', name: '取悦', baseValue: 15, category: 'communication', isSpecialization: false },
  { key: 'climb', name: '攀爬', baseValue: 20, category: 'survival', isSpecialization: false },
  { key: 'computer_use', name: '计算机使用', baseValue: 5, category: 'general', isSpecialization: false },
  { key: 'credit_rating', name: '信用评级', baseValue: 0, category: 'general', isSpecialization: false },
  { key: 'cthulhu_mythos', name: '克苏鲁神话', baseValue: 0, category: 'magic', isSpecialization: false },
  { key: 'disguise', name: '乔装', baseValue: 5, category: 'general', isSpecialization: false },
  { key: 'dodge', name: '闪避', baseValue: 0, category: 'combat', isSpecialization: false }, // 基础值 = DEX/2
  { key: 'drive_auto', name: '汽车驾驶', baseValue: 20, category: 'general', isSpecialization: false },
  { key: 'elec_repair', name: '电气维修', baseValue: 10, category: 'general', isSpecialization: false },
  { key: 'electronics', name: '电子学', baseValue: 1, category: 'general', isSpecialization: false },
  { key: 'fast_talk', name: '话术', baseValue: 5, category: 'communication', isSpecialization: false },
  { key: 'fighting', name: '格斗', baseValue: 0, category: 'combat', isSpecialization: true, specializations: ['斗殴', '斧', '链锯', '连枷', '绞索', '矛', '剑', '鞭'] },
  { key: 'firearms', name: '射击', baseValue: 0, category: 'combat', isSpecialization: true, specializations: ['弓', '手枪', '步枪/霰弹枪', '冲锋枪', '重武器', '火焰喷射器', '机枪'] },
  { key: 'first_aid', name: '急救', baseValue: 30, category: 'general', isSpecialization: false },
  { key: 'history', name: '历史', baseValue: 5, category: 'knowledge', isSpecialization: false },
  { key: 'intimidate', name: '恐吓', baseValue: 15, category: 'communication', isSpecialization: false },
  { key: 'jump', name: '跳跃', baseValue: 20, category: 'survival', isSpecialization: false },
  { key: 'language_other', name: '其他语言', baseValue: 1, category: 'language', isSpecialization: true },
  { key: 'language_own', name: '母语', baseValue: 0, category: 'language', isSpecialization: false }, // 基础值 = EDU
  { key: 'law', name: '法律', baseValue: 5, category: 'knowledge', isSpecialization: false },
  { key: 'library_use', name: '图书馆使用', baseValue: 20, category: 'investigation', isSpecialization: false },
  { key: 'listen', name: '聆听', baseValue: 20, category: 'investigation', isSpecialization: false },
  { key: 'locksmith', name: '锁匠', baseValue: 1, category: 'general', isSpecialization: false },
  { key: 'mech_repair', name: '机械维修', baseValue: 10, category: 'general', isSpecialization: false },
  { key: 'medicine', name: '医学', baseValue: 1, category: 'knowledge', isSpecialization: false },
  { key: 'natural_world', name: '博物学', baseValue: 10, category: 'knowledge', isSpecialization: false },
  { key: 'navigate', name: '导航', baseValue: 10, category: 'survival', isSpecialization: false },
  { key: 'occult', name: '神秘学', baseValue: 5, category: 'knowledge', isSpecialization: false },
  { key: 'heavy_machinery', name: '操作重型机械', baseValue: 1, category: 'general', isSpecialization: false },
  { key: 'persuade', name: '说服', baseValue: 10, category: 'communication', isSpecialization: false },
  { key: 'pilot', name: '驾驶', baseValue: 1, category: 'general', isSpecialization: true, specializations: ['飞机', '船'] },
  { key: 'psychoanalysis', name: '精神分析', baseValue: 1, category: 'knowledge', isSpecialization: false },
  { key: 'psychology', name: '心理学', baseValue: 10, category: 'communication', isSpecialization: false },
  { key: 'ride', name: '骑术', baseValue: 5, category: 'general', isSpecialization: false },
  { key: 'science', name: '科学', baseValue: 1, category: 'science', isSpecialization: true, specializations: ['天文学', '生物学', '植物学', '化学', '密码学', '工程学', '司法科学', '地质学', '数学', '气象学', '药学', '物理学', '动物学'] },
  { key: 'sleight_of_hand', name: '妙手', baseValue: 10, category: 'general', isSpecialization: false },
  { key: 'spot_hidden', name: '侦查', baseValue: 25, category: 'investigation', isSpecialization: false },
  { key: 'stealth', name: '潜行', baseValue: 20, category: 'survival', isSpecialization: false },
  { key: 'survival', name: '生存', baseValue: 10, category: 'survival', isSpecialization: true, specializations: ['沙漠', '极地', '海洋', '森林'] },
  { key: 'swim', name: '游泳', baseValue: 20, category: 'survival', isSpecialization: false },
  { key: 'throw', name: '投掷', baseValue: 20, category: 'combat', isSpecialization: false },
  { key: 'track', name: '追踪', baseValue: 10, category: 'survival', isSpecialization: false },
  // 稀有不常规技能（简版规则书中部分）
  { key: 'diving', name: '潜水', baseValue: 1, category: 'survival', isSpecialization: false },
  { key: 'demolitions', name: '爆破', baseValue: 1, category: 'general', isSpecialization: false },
];

// 生成默认技能对象（key -> baseValue）
export function getDefaultSkills(): Record<string, number> {
  const skills: Record<string, number> = {};
  for (const s of COC7_SKILLS) {
    skills[s.key] = s.baseValue;
  }
  return skills;
}

// 根据属性计算动态基础值
export function resolveDynamicBaseValues(attrs: { dex: number; edu: number }): Record<string, number> {
  return {
    dodge: Math.floor(attrs.dex / 2),
    language_own: attrs.edu,
  };
}

// 技能分类（用于前端展示）
export const SKILL_CATEGORIES: Record<string, string> = {
  combat: '战斗',
  communication: '社交',
  investigation: '调查',
  knowledge: '学识',
  survival: '生存',
  magic: '神秘',
  language: '语言',
  science: '科学',
  art: '艺术',
  general: '通用',
};
