export type CharacterArchiveTone = 'gold' | 'ocean' | 'blood';

export interface CharacterVitalInput {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  san: number;
  maxSan: number;
}

export interface CharacterArchiveItem extends CharacterVitalInput {
  id: string;
}

export interface CharacterVital {
  key: 'hp' | 'mp' | 'san';
  label: string;
  value: number;
  max: number;
  tone: CharacterArchiveTone;
}

export interface CharacterCondition {
  label: string;
  tone: CharacterArchiveTone;
}

export interface CharacterArchiveSummaryInput {
  characters: CharacterArchiveItem[];
  displayedId: string | null;
}

export interface CharacterArchiveSummaryItem {
  key: 'total' | 'displayed' | 'endangered';
  label: string;
  value: number;
  tone: CharacterArchiveTone;
}

export type CharacterDossierTabKey = 'attributes' | 'skills' | 'combat' | 'background';

export interface CharacterDossierTab {
  key: CharacterDossierTabKey;
  label: string;
  active: boolean;
}

export interface CharacterCreationStep {
  index: number;
  label: string;
  active: boolean;
  complete: boolean;
}

export interface CharacterGrowthResultLike {
  success: boolean;
  oldValue: number;
  newValue: number;
}

export interface CharacterGrowthSummaryItem {
  key: 'success' | 'failed' | 'gained';
  label: string;
  value: number;
  tone: CharacterArchiveTone;
}

const dossierTabs: Array<Omit<CharacterDossierTab, 'active'>> = [
  { key: 'attributes', label: '属性' },
  { key: 'skills', label: '技能' },
  { key: 'combat', label: '战斗' },
  { key: 'background', label: '背景' },
];

const creationStepLabels = ['方式', '属性', '年龄', '职业', '技能', '背景', '确认'];

function ratio(value: number, max: number): number {
  if (max <= 0) return 0;
  return value / max;
}

export function getCharacterVitals(character: CharacterVitalInput): CharacterVital[] {
  return [
    { key: 'hp', label: 'HP', value: character.hp, max: character.maxHp, tone: 'blood' },
    { key: 'mp', label: 'MP', value: character.mp, max: character.maxMp, tone: 'ocean' },
    { key: 'san', label: 'SAN', value: character.san, max: character.maxSan, tone: 'gold' },
  ];
}

export function getCharacterCondition(character: CharacterVitalInput): CharacterCondition {
  if (ratio(character.hp, character.maxHp) <= 0.35) {
    return { label: '重伤警戒', tone: 'blood' };
  }

  if (ratio(character.san, character.maxSan) <= 0.45) {
    return { label: '精神濒危', tone: 'blood' };
  }

  if (ratio(character.mp, character.maxMp) <= 0.35) {
    return { label: '灵感枯竭', tone: 'ocean' };
  }

  return { label: '档案稳定', tone: 'gold' };
}

export function getCharacterArchiveSummary(input: CharacterArchiveSummaryInput): CharacterArchiveSummaryItem[] {
  const endangered = input.characters.filter((character) => getCharacterCondition(character).tone === 'blood').length;

  return [
    { key: 'total', label: '登记调查员', value: input.characters.length, tone: 'gold' },
    { key: 'displayed', label: '展示档案', value: input.displayedId ? 1 : 0, tone: 'ocean' },
    { key: 'endangered', label: '危险状态', value: endangered, tone: 'blood' },
  ];
}

export function getCharacterDossierTabs(active: CharacterDossierTabKey): CharacterDossierTab[] {
  return dossierTabs.map((tab) => ({
    ...tab,
    active: tab.key === active,
  }));
}

export function getCharacterCreationSteps(currentStep: number): CharacterCreationStep[] {
  return creationStepLabels.map((label, index) => {
    const step = index + 1;
    return {
      index: step,
      label,
      active: step === currentStep,
      complete: step < currentStep,
    };
  });
}

export function getCharacterGrowthSummary(results: CharacterGrowthResultLike[]): CharacterGrowthSummaryItem[] {
  const success = results.filter((result) => result.success).length;
  const failed = results.length - success;
  const gained = results
    .filter((result) => result.success)
    .reduce((sum, result) => sum + Math.max(0, result.newValue - result.oldValue), 0);

  return [
    { key: 'success', label: '成长成功', value: success, tone: 'ocean' },
    { key: 'failed', label: '成长失败', value: failed, tone: 'blood' },
    { key: 'gained', label: '总成长点数', value: gained, tone: 'gold' },
  ];
}
