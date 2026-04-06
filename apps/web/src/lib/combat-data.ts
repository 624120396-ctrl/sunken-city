// COC7 武器数据
export interface Weapon {
  id: string;
  name: string;
  type: 'melee' | 'pistol' | 'rifle' | 'shotgun' | 'smg' | 'special';
  skill: string;
  damage: string;
  range: string;
  attacks: number;
  ammo?: number;
  malfunction?: number;
  impale: boolean;
  description?: string;
}

export const COC7_WEAPONS: Weapon[] = [
  // 近战武器
  { id: 'unarmed', name: '徒手', type: 'melee', skill: '格斗', damage: '1D3+DB', range: '触碰', attacks: 1, impale: false },
  { id: 'knife', name: '匕首', type: 'melee', skill: '格斗', damage: '1D4+DB', range: '触碰', attacks: 1, impale: true, description: '小型刀具，便于隐藏' },
  { id: 'sword', name: '剑', type: 'melee', skill: '剑', damage: '1D6+DB', range: '触碰', attacks: 1, impale: true },
  { id: 'club', name: '棍棒', type: 'melee', skill: '格斗', damage: '1D6+DB', range: '触碰', attacks: 1, impale: false },
  { id: 'axe', name: '斧', type: 'melee', skill: '斧', damage: '1D6+2+DB', range: '触碰', attacks: 1, impale: true },
  { id: 'spear', name: '矛', type: 'melee', skill: '矛', damage: '1D6+1+DB', range: '3码', attacks: 1, impale: true },
  { id: 'whip', name: '鞭', type: 'melee', skill: '鞭', damage: '1D3+DB', range: '3码', attacks: 1, impale: false },
  { id: 'chainsaw', name: '电锯', type: 'melee', skill: '电锯', damage: '2D6', range: '触碰', attacks: 1, impale: false, description: '需要燃料，故障率80' },
  
  // 手枪
  { id: 'pistol_22', name: '.22手枪', type: 'pistol', skill: '手枪', damage: '1D6', range: '10码', attacks: 1, ammo: 6, malfunction: 100, impale: false },
  { id: 'pistol_32', name: '.32手枪', type: 'pistol', skill: '手枪', damage: '1D6', range: '15码', attacks: 1, ammo: 6, malfunction: 100, impale: false },
  { id: 'pistol_38', name: '.38左轮', type: 'pistol', skill: '手枪', damage: '1D10', range: '15码', attacks: 1, ammo: 6, malfunction: 99, impale: false },
  { id: 'pistol_45', name: '.45手枪', type: 'pistol', skill: '手枪', damage: '1D10+2', range: '15码', attacks: 1, ammo: 7, malfunction: 100, impale: false },
  { id: 'pistol_9mm', name: '9mm手枪', type: 'pistol', skill: '手枪', damage: '1D10', range: '15码', attacks: 1, ammo: 8, malfunction: 99, impale: false },
  { id: 'pistol_magnum', name: '.357马格南', type: 'pistol', skill: '手枪', damage: '1D8+1D4', range: '15码', attacks: 1, ammo: 6, malfunction: 100, impale: false, description: '威力强大，后坐力大' },
  
  // 步枪
  { id: 'rifle_22', name: '.22步枪', type: 'rifle', skill: '步枪', damage: '1D6+1', range: '30码', attacks: 1, ammo: 6, malfunction: 99, impale: true },
  { id: 'rifle_hunting', name: '猎枪', type: 'rifle', skill: '步枪', damage: '2D6', range: '50码', attacks: 1, ammo: 5, malfunction: 99, impale: true },
  { id: 'rifle_45', name: '.45步枪', type: 'rifle', skill: '步枪', damage: '2D6+1', range: '60码', attacks: 1, ammo: 5, malfunction: 98, impale: true },
  { id: 'rifle_303', name: '.303李-恩菲尔德', type: 'rifle', skill: '步枪', damage: '2D6+4', range: '110码', attacks: 1, ammo: 10, malfunction: 99, impale: true },
  { id: 'rifle_m1', name: 'M1加兰德', type: 'rifle', skill: '步枪', damage: '2D6+4', range: '110码', attacks: 2, ammo: 8, malfunction: 100, impale: true },
  { id: 'sniper_308', name: '.308狙击步枪', type: 'rifle', skill: '步枪', damage: '2D6+4', range: '200码', attacks: 1, ammo: 5, malfunction: 99, impale: true, description: '高精度远程武器' },
  
  // 霰弹枪
  { id: 'shotgun_sawed', name: '短管霰弹枪', type: 'shotgun', skill: '霰弹枪', damage: '4D6/2D6/1D6', range: '10/20/50码', attacks: 1, ammo: 2, malfunction: 100, impale: false },
  { id: 'shotgun_12g', name: '12号霰弹枪', type: 'shotgun', skill: '霰弹枪', damage: '4D6/2D6/1D6', range: '10/20/50码', attacks: 1, ammo: 2, malfunction: 100, impale: false },
  { id: 'shotgun_pump', name: '泵动霰弹枪', type: 'shotgun', skill: '霰弹枪', damage: '4D6/2D6/1D6', range: '10/20/50码', attacks: 1, ammo: 5, malfunction: 99, impale: false },
  { id: 'shotgun_auto', name: '半自动霰弹枪', type: 'shotgun', skill: '霰弹枪', damage: '4D6/2D6/1D6', range: '10/20/50码', attacks: 2, ammo: 7, malfunction: 98, impale: false },
  
  // 冲锋枪
  { id: 'smg_thompson', name: '汤普森冲锋枪', type: 'smg', skill: '冲锋枪', damage: '1D10+2', range: '20码', attacks: 2, ammo: 20, malfunction: 96, impale: false },
  { id: 'smg_mp5', name: 'MP5', type: 'smg', skill: '冲锋枪', damage: '1D10', range: '15码', attacks: 2, ammo: 30, malfunction: 100, impale: false },
  { id: 'smg_uzi', name: '乌兹冲锋枪', type: 'smg', skill: '冲锋枪', damage: '1D10', range: '15码', attacks: 2, ammo: 32, malfunction: 98, impale: false },
  
  // 特殊武器
  { id: 'bow', name: '弓', type: 'special', skill: '弓', damage: '1D6+DB', range: '30码', attacks: 1, impale: true },
  { id: 'crossbow', name: '弩', type: 'special', skill: '弩', damage: '2D6+2', range: '30码', attacks: 1, ammo: 1, malfunction: 99, impale: true },
  { id: 'flamethrower', name: '火焰喷射器', type: 'special', skill: '火焰喷射器', damage: '2D6+燃烧', range: '10码', attacks: 1, ammo: 10, malfunction: 93, impale: false, description: '造成燃烧伤害' },
  { id: 'grenade', name: '手榴弹', type: 'special', skill: '投掷', damage: '4D6/2D6', range: '10码', attacks: 1, impale: false, description: '范围伤害' },
  { id: 'dynamite', name: '炸药', type: 'special', skill: '爆破', damage: '4D10', range: '投掷距离', attacks: 1, impale: false, description: '极大范围伤害' },
];

// 按类型分组
export const WEAPONS_BY_TYPE = {
  melee: COC7_WEAPONS.filter(w => w.type === 'melee'),
  pistol: COC7_WEAPONS.filter(w => w.type === 'pistol'),
  rifle: COC7_WEAPONS.filter(w => w.type === 'rifle'),
  shotgun: COC7_WEAPONS.filter(w => w.type === 'shotgun'),
  smg: COC7_WEAPONS.filter(w => w.type === 'smg'),
  special: COC7_WEAPONS.filter(w => w.type === 'special'),
};

// COC7 护甲数据
export interface Armor {
  id: string;
  name: string;
  type: 'light' | 'medium' | 'heavy' | 'accessory';
  rating: number;
  coverage: string;
  movPenalty: number;
  dexPenalty: number;
  description?: string;
}

export const COC7_ARMOR: Armor[] = [
  // 轻甲
  { id: 'leather_jacket', name: '皮夹克', type: 'light', rating: 1, coverage: '躯干', movPenalty: 0, dexPenalty: 0 },
  { id: 'leather_armor', name: '皮甲', type: 'light', rating: 2, coverage: '躯干', movPenalty: 0, dexPenalty: 0 },
  { id: 'riot_shield', name: '防暴盾', type: 'light', rating: 6, coverage: '一手', movPenalty: 0, dexPenalty: 5, description: '手持盾，可格挡攻击' },
  
  // 中甲
  { id: 'chainmail', name: '锁子甲', type: 'medium', rating: 3, coverage: '躯干', movPenalty: 0, dexPenalty: 5 },
  { id: 'bulletproof_vest', name: '防弹背心', type: 'medium', rating: 5, coverage: '躯干', movPenalty: 0, dexPenalty: 5, description: '现代防弹装备' },
  { id: 'plate_armor', name: '板甲', type: 'medium', rating: 5, coverage: '躯干/四肢', movPenalty: 0, dexPenalty: 10 },
  
  // 重甲
  { id: 'full_plate', name: '全身板甲', type: 'heavy', rating: 6, coverage: '全身', movPenalty: -1, dexPenalty: 15, description: '移动力减1' },
  { id: 'riot_gear', name: '防暴装备', type: 'heavy', rating: 8, coverage: '全身', movPenalty: 0, dexPenalty: 20 },
  { id: 'tactical_armor', name: '战术装甲', type: 'heavy', rating: 10, coverage: '全身', movPenalty: 0, dexPenalty: 25, description: '现代军用装甲' },
  
  // 配件
  { id: 'helmet', name: '头盔', type: 'accessory', rating: 2, coverage: '头部', movPenalty: 0, dexPenalty: 0 },
  { id: 'gas_mask', name: '防毒面具', type: 'accessory', rating: 0, coverage: '面部', movPenalty: 0, dexPenalty: 5, description: '免疫毒气' },
  { id: 'tactical_vest', name: '战术背心', type: 'accessory', rating: 2, coverage: '躯干', movPenalty: 0, dexPenalty: 0, description: '可携带额外装备' },
];

// 战后技能成长类型
export interface SkillGrowth {
  skillName: string;
  oldValue: number;
  rollResult: number;
  success: boolean;
  newValue: number;
  timestamp: string;
}

// 战后成长检定
export function rollSkillGrowth(currentValue: number): { roll: number; success: boolean; newValue: number } {
  const roll = Math.floor(Math.random() * 100) + 1;
  // COC7规则：成长检定掷1D100，结果大于当前值则成功，获得1D10成长
  if (roll > currentValue) {
    const growth = Math.floor(Math.random() * 10) + 1;
    return { roll, success: true, newValue: Math.min(99, currentValue + growth) };
  }
  return { roll, success: false, newValue: currentValue };
}