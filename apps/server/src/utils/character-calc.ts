// COC7e 角色计算核心工具
// 涵盖：属性投骰、年龄修正、衍生属性计算、资产计算、成功等级判定

import { COC7_OCCUPATIONS, calculateSkillPoints } from '../data/occupations';
import { getDefaultSkills, resolveDynamicBaseValues } from '../data/coc7-skills';

// ========== 属性投骰 ==========

function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function rollDice(count: number, sides: number): number {
  let sum = 0;
  for (let i = 0; i < count; i++) {
    sum += Math.floor(Math.random() * sides) + 1;
  }
  return sum;
}

/** 3D6 x 5 */
export function roll3D6x5(): number {
  return (rollD6() + rollD6() + rollD6()) * 5;
}

/** 2D6+6 x 5 */
export function roll2D6plus6x5(): number {
  return (rollD6() + rollD6() + 6) * 5;
}

/** 生成全套基础属性 */
export function rollCoreAttributes(): {
  str: number; con: number; siz: number; dex: number;
  app: number; int: number; pow: number; edu: number;
} {
  return {
    str: roll3D6x5(),
    con: roll3D6x5(),
    siz: roll2D6plus6x5(),
    dex: roll3D6x5(),
    app: roll3D6x5(),
    int: roll2D6plus6x5(),
    pow: roll3D6x5(),
    edu: roll2D6plus6x5(),
  };
}

/** 购点制：460点分配到8项属性，每项15-90 */
export function generateAttributesByPointBuy(points: number[]): {
  str: number; con: number; siz: number; dex: number;
  app: number; int: number; pow: number; edu: number;
} {
  const attrs = ['str', 'con', 'siz', 'dex', 'app', 'int', 'pow', 'edu'] as const;
  const result = {
    str: 50, con: 50, siz: 50, dex: 50,
    app: 50, int: 50, pow: 50, edu: 50,
  };
  for (let i = 0; i < 8; i++) {
    const key = attrs[i];
    const val = Math.max(15, Math.min(90, points[i] || 50));
    (result as any)[key] = val;
  }
  return result;
}

// ========== 年龄修正 ==========

export interface AgeAdjustment {
  strPenalty: number;
  conPenalty: number;
  dexPenalty: number;
  appPenalty: number;
  movPenalty: number;
  eduRolls: number;
  luckRolls: number; // 15-19岁幸运投2次
}

export function getAgeAdjustment(age: number): AgeAdjustment {
  if (age >= 15 && age <= 19) {
    return { strPenalty: 0, conPenalty: 0, dexPenalty: 0, appPenalty: 0, movPenalty: 0, eduRolls: 1, luckRolls: 2 };
  }
  if (age >= 20 && age <= 39) {
    return { strPenalty: 0, conPenalty: 0, dexPenalty: 0, appPenalty: 0, movPenalty: 0, eduRolls: 1, luckRolls: 1 };
  }
  if (age >= 40 && age <= 49) {
    return { strPenalty: 5, conPenalty: 5, dexPenalty: 5, appPenalty: 5, movPenalty: 1, eduRolls: 2, luckRolls: 1 };
  }
  if (age >= 50 && age <= 59) {
    return { strPenalty: 10, conPenalty: 10, dexPenalty: 10, appPenalty: 10, movPenalty: 2, eduRolls: 3, luckRolls: 1 };
  }
  if (age >= 60 && age <= 69) {
    return { strPenalty: 20, conPenalty: 20, dexPenalty: 20, appPenalty: 15, movPenalty: 3, eduRolls: 4, luckRolls: 1 };
  }
  if (age >= 70 && age <= 79) {
    return { strPenalty: 40, conPenalty: 40, dexPenalty: 40, appPenalty: 20, movPenalty: 4, eduRolls: 4, luckRolls: 1 };
  }
  if (age >= 80 && age <= 89) {
    return { strPenalty: 80, conPenalty: 80, dexPenalty: 80, appPenalty: 25, movPenalty: 5, eduRolls: 4, luckRolls: 1 };
  }
  // 默认按 20-39 处理
  return { strPenalty: 0, conPenalty: 0, dexPenalty: 0, appPenalty: 0, movPenalty: 0, eduRolls: 1, luckRolls: 1 };
}

/** EDU 增强检定：投 1D100，若 > 当前EDU 则 +1D10（不超过99） */
export function rollEduEnhancement(currentEdu: number): { roll: number; gained: number; newEdu: number } {
  const roll = rollDice(1, 100);
  if (roll > currentEdu) {
    const gain = rollDice(1, 10);
    const newEdu = Math.min(99, currentEdu + gain);
    return { roll, gained: gain, newEdu };
  }
  return { roll, gained: 0, newEdu: currentEdu };
}

/** 幸运生成 */
export function rollLuck(takeBestOf: number = 1): number {
  let best = 0;
  for (let i = 0; i < takeBestOf; i++) {
    const val = roll3D6x5();
    if (val > best) best = val;
  }
  return best;
}

// ========== 衍生属性计算 ==========

export interface DerivedAttributes {
  hp: number;
  mp: number;
  san: number;
  mov: number;
  build: number;
  db: string;
  maxHp: number;
  maxMp: number;
  maxSan: number;
}

export function calculateDerivedAttributes(attrs: {
  str: number; con: number; siz: number; dex: number; app: number; int: number; pow: number; edu: number;
}, age: number): DerivedAttributes {
  const hp = Math.floor((attrs.con + attrs.siz) / 10);
  const mp = Math.floor(attrs.pow / 5);
  const san = attrs.pow;

  let mov = 8;
  if (attrs.dex < attrs.siz && attrs.str < attrs.siz) mov = 7;
  else if (attrs.dex > attrs.siz && attrs.str > attrs.siz) mov = 9;

  // 年龄 MOV 调整
  const { movPenalty } = getAgeAdjustment(age);
  mov = Math.max(1, mov - movPenalty);

  // DB / Build 按 STR+SIZ 查表
  const sum = attrs.str + attrs.siz;
  let build = 0;
  let db = '0';

  if (sum <= 64) { build = -2; db = '-2'; }
  else if (sum <= 84) { build = -1; db = '-1'; }
  else if (sum <= 124) { build = 0; db = '0'; }
  else if (sum <= 164) { build = 1; db = '+1d4'; }
  else if (sum <= 204) { build = 2; db = '+1d6'; }
  else {
    // 超过 204 每80一档
    const tiers = Math.floor((sum - 125) / 80); // 从 125 起计算
    // 更精确的规则：205-284 = +2d6 (build=3), 285-364 = +3d6 (build=4)...
    if (sum <= 284) { build = 3; db = '+2d6'; }
    else if (sum <= 364) { build = 4; db = '+3d6'; }
    else if (sum <= 444) { build = 5; db = '+4d6'; }
    else if (sum <= 524) { build = 6; db = '+5d6'; }
    else {
      const extra = Math.floor((sum - 525) / 80) + 1;
      build = 6 + extra;
      db = `+${1 + extra}d6`;
    }
  }

  return {
    hp, mp, san, mov, build, db,
    maxHp: hp, maxMp: mp, maxSan: san,
  };
}

// ========== 资产计算 ==========

export interface Financials {
  cash: number;
  assetsValue: number;
  spendingLevel: number;
  livingStandard: string;
}

export function calculateFinancials(creditRating: number): Financials {
  let cash = 0;
  let assetsValue = 0;
  let spendingLevel = 0;
  let livingStandard = '';

  if (creditRating === 0) {
    cash = 0;
    assetsValue = 0;
    spendingLevel = 0;
    livingStandard = '身无分文';
  } else if (creditRating <= 9) {
    cash = creditRating;
    assetsValue = creditRating * 20;
    spendingLevel = creditRating * 2;
    livingStandard = '贫穷';
  } else if (creditRating <= 49) {
    cash = creditRating * 2;
    assetsValue = creditRating * 50;
    spendingLevel = creditRating * 10;
    livingStandard = '标准';
  } else if (creditRating <= 89) {
    cash = Math.floor((creditRating - 45) * 5); // 50→$250, 89→$445 approx
    // 修正：规则书 50→$250, 89→$445
    cash = 250 + (creditRating - 50) * 5;
    assetsValue = creditRating * 500;
    spendingLevel = creditRating * 50;
    livingStandard = '小康';
  } else if (creditRating <= 98) {
    cash = 1800 + (creditRating - 90) * 20; // 90→$1800, 98→$1960
    assetsValue = creditRating * 2000;
    spendingLevel = creditRating * 500;
    livingStandard = '富裕';
  } else {
    cash = 50000;
    assetsValue = 5000000;
    spendingLevel = 5000;
    livingStandard = '豪富';
  }

  return { cash, assetsValue, spendingLevel, livingStandard };
}

// ========== 职业点与兴趣点计算 ==========

export function calculateCharacterSkillPoints(
  occupationKey: string,
  attrs: { str: number; con: number; siz: number; dex: number; app: number; int: number; pow: number; edu: number }
): { occupationPoints: number; interestPoints: number } | null {
  const occ = COC7_OCCUPATIONS.find(o => o.key === occupationKey);
  if (!occ) return null;
  const occupationPoints = calculateSkillPoints(occ.skillPointFormula, attrs);
  const interestPoints = (attrs.int || 50) * 2;
  return { occupationPoints, interestPoints };
}

// ========== 技能合法性校验 ==========

export function createDefaultSkillMap(): Record<string, number> {
  return getDefaultSkills();
}

export function mergeSkillsWithDynamicBase(
  skills: Record<string, number>,
  attrs: { dex: number; edu: number }
): Record<string, number> {
  const dynamic = resolveDynamicBaseValues(attrs);
  return { ...skills, ...dynamic };
}

// ========== 成功等级判定 ==========

export type SuccessLevel = '大成功' | '极难成功' | '困难成功' | '成功' | '失败' | '大失败';

export function calculateSuccessLevel(roll: number, target: number): SuccessLevel {
  if (roll === 1) return '大成功';
  if (roll <= Math.floor(target / 5)) return '极难成功';
  if (roll <= Math.floor(target / 2)) return '困难成功';
  if (roll <= target) return '成功';
  if (roll === 100 || (roll >= 96 && target < 50)) return '大失败';
  return '失败';
}

/** 对抗检定比较器：返回正数= attacker 胜，负数= defender 胜，0=平手 */
export function compareSuccessLevels(
  aLevel: SuccessLevel,
  aSkill: number,
  bLevel: SuccessLevel,
  bSkill: number
): number {
  const rank: Record<SuccessLevel, number> = {
    '大成功': 6,
    '极难成功': 5,
    '困难成功': 4,
    '成功': 3,
    '失败': 2,
    '大失败': 1,
  };
  const ra = rank[aLevel];
  const rb = rank[bLevel];
  if (ra !== rb) return ra - rb;
  // 平手时技能高者胜
  return aSkill - bSkill;
}

// ========== 年龄修正应用（返回纯数值，供前端预览） ==========

export function applyAgeAdjustment(
  rawAttrs: { str: number; con: number; siz: number; dex: number; app: number; int: number; pow: number; edu: number },
  age: number
): {
  attrs: { str: number; con: number; siz: number; dex: number; app: number; int: number; pow: number; edu: number };
  eduEnhancements: { roll: number; gained: number; newEdu: number }[];
  luck: number;
} {
  const adj = getAgeAdjustment(age);
  const attrs = { ...rawAttrs };

  let strConDexTotalPenalty = adj.strPenalty + adj.conPenalty + adj.dexPenalty;
  // 规则原文：STR和SIZ合计-5（15-19岁）；STR/CON/DEX合计-5（40-49岁）等
  // 文档原文 "STR和SIZ合计-5" 针对 15-19
  if (age >= 15 && age <= 19) {
    // STR和SIZ合计-5：简化均摊 -2/-3
    const sizDrop = Math.min(attrs.siz - 15, 3);
    const strDrop = Math.min(attrs.str - 15, 2);
    attrs.siz -= sizDrop;
    attrs.str -= strDrop;
    // EDU-5
    attrs.edu = Math.max(15, attrs.edu - 5);
  } else if (age >= 40) {
    // STR/CON/DEX 合计 -penalty
    // 均摊，优先DEX，然后CON，然后STR，确保每项不低于15
    let remaining = strConDexTotalPenalty;
    const dropDex = Math.min(Math.max(0, attrs.dex - 15), remaining);
    attrs.dex -= dropDex; remaining -= dropDex;
    const dropCon = Math.min(Math.max(0, attrs.con - 15), remaining);
    attrs.con -= dropCon; remaining -= dropCon;
    const dropStr = Math.min(Math.max(0, attrs.str - 15), remaining);
    attrs.str -= dropStr; remaining -= dropStr;
    // APP
    attrs.app = Math.max(15, attrs.app - adj.appPenalty);
  }

  // EDU 增强
  const eduEnhancements: { roll: number; gained: number; newEdu: number }[] = [];
  for (let i = 0; i < adj.eduRolls; i++) {
    const currentEdu = i === 0 ? attrs.edu : eduEnhancements[i - 1].newEdu;
    const result = rollEduEnhancement(currentEdu);
    eduEnhancements.push(result);
  }
  if (eduEnhancements.length > 0) {
    attrs.edu = eduEnhancements[eduEnhancements.length - 1].newEdu;
  }

  // 幸运
  const luck = rollLuck(adj.luckRolls);

  return { attrs, eduEnhancements, luck };
}
