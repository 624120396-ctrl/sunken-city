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
