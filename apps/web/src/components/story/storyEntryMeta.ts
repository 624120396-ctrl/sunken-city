export type StoryEntryTone = 'gold' | 'ocean' | 'blood';

export interface ScenarioCardMetaInput {
  difficulty?: string;
  estimatedDuration?: number;
  tags?: string;
}

export interface ScenarioCardMeta {
  difficultyLabel: string;
  durationLabel: string;
  tags: string[];
  tone: StoryEntryTone;
}

export interface SoloLaunchStateInput {
  hasScenario: boolean;
  hasCharacter: boolean;
  starting: boolean;
}

export interface SoloLaunchState {
  disabled: boolean;
  label: string;
}

export function getScenarioCardMeta(input: ScenarioCardMetaInput): ScenarioCardMeta {
  const difficulty = input.difficulty || '未知';
  const lowerDifficulty = difficulty.toLowerCase();
  const tone: StoryEntryTone = lowerDifficulty.includes('hard') || lowerDifficulty.includes('困难') || lowerDifficulty.includes('噩梦')
    ? 'blood'
    : lowerDifficulty.includes('easy') || lowerDifficulty.includes('简单')
      ? 'ocean'
      : 'gold';

  return {
    difficultyLabel: difficulty,
    durationLabel: input.estimatedDuration ? `${input.estimatedDuration} 分钟` : '时长未知',
    tags: input.tags ? input.tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 4) : [],
    tone,
  };
}

export function getSoloLaunchState(input: SoloLaunchStateInput): SoloLaunchState {
  if (input.starting) {
    return { disabled: true, label: '启动中...' };
  }

  if (!input.hasScenario) {
    return { disabled: true, label: '选择剧本' };
  }

  if (!input.hasCharacter) {
    return { disabled: true, label: '选择调查员' };
  }

  return { disabled: false, label: '开始调查' };
}
