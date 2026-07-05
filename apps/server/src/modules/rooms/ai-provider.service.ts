export type AiTaskType =
  | 'CLUE_DRAFT'
  | 'NPC_DRAFT'
  | 'SCENE_DRAFT'
  | 'SESSION_RECAP_DRAFT'
  | 'CURRENT_OBJECTIVE_DRAFT'
  | 'OPEN_QUESTIONS_DRAFT'
  | 'CHARACTER_VOICE_DRAFT'
  | 'IMAGE_ASSET_DRAFT';

export interface AiModelSettings {
  defaultTextProvider?: string | null;
  defaultTextModelId?: string | null;
  defaultCharacterProvider?: string | null;
  defaultCharacterModelId?: string | null;
  defaultImageProvider?: string | null;
  defaultImageModelId?: string | null;
}

export interface AiModelSelection {
  provider: string;
  modelId: string;
  unitType: 'token' | 'image' | 'reserved_voice';
  executionMode: 'SKELETON_ONLY';
  externalCallsDisabled: true;
}

const textTasks = new Set<AiTaskType>([
  'CLUE_DRAFT',
  'NPC_DRAFT',
  'SCENE_DRAFT',
  'SESSION_RECAP_DRAFT',
  'CURRENT_OBJECTIVE_DRAFT',
  'OPEN_QUESTIONS_DRAFT',
]);

export function resolveAiModelForTask(
  settings: AiModelSettings | null | undefined,
  taskType: AiTaskType
): AiModelSelection {
  if (taskType === 'IMAGE_ASSET_DRAFT') {
    return {
      provider: settings?.defaultImageProvider || 'seedream',
      modelId: settings?.defaultImageModelId || 'seedream-4.5',
      unitType: 'image',
      executionMode: 'SKELETON_ONLY',
      externalCallsDisabled: true,
    };
  }

  if (taskType === 'CHARACTER_VOICE_DRAFT') {
    return {
      provider: settings?.defaultCharacterProvider || 'doubao',
      modelId: settings?.defaultCharacterModelId || 'doubao-seed-character',
      unitType: 'token',
      executionMode: 'SKELETON_ONLY',
      externalCallsDisabled: true,
    };
  }

  if (textTasks.has(taskType)) {
    return {
      provider: settings?.defaultTextProvider || 'deepseek',
      modelId: settings?.defaultTextModelId || 'deepseek-v4.1-flash',
      unitType: 'token',
      executionMode: 'SKELETON_ONLY',
      externalCallsDisabled: true,
    };
  }

  return {
    provider: settings?.defaultTextProvider || 'deepseek',
    modelId: settings?.defaultTextModelId || 'deepseek-v4.1-flash',
    unitType: 'token',
    executionMode: 'SKELETON_ONLY',
    externalCallsDisabled: true,
  };
}
