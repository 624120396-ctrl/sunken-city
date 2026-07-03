export interface DreamReadingInput {
  isDeepRevealed: boolean;
  hasDeepText: boolean;
  hasBuff: boolean;
}

export interface DreamReadingMeta {
  tierLabel: string;
  headline: string;
  seal: string;
  tone: 'basic' | 'deep';
  deepActionLabel: string | null;
  buffLabel: string | null;
}

export function getDreamReadingMeta(input: DreamReadingInput): DreamReadingMeta {
  if (input.isDeepRevealed && input.hasDeepText) {
    return {
      tierLabel: '深层梦兆',
      headline: '梦境完成封缄',
      seal: 'III',
      tone: 'deep',
      deepActionLabel: null,
      buffLabel: input.hasBuff ? '触须效应已写入' : null,
    };
  }

  return {
    tierLabel: '第一层梦兆',
    headline: '盐雾档案已开启',
    seal: 'II',
    tone: 'basic',
    deepActionLabel: '进入深层解牌',
    buffLabel: null,
  };
}
