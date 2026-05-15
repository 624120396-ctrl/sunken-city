import type { ScenarioCharacter } from './character.entity';

export interface CreateScenarioCharacterDto {
  scenarioId: string;
  name: string;
  description?: string;
  avatar?: string;
  sprites?: Record<string, string>;
  tags?: string[];
  isKeyCharacter?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateScenarioCharacterDto extends Partial<CreateScenarioCharacterDto> {
  id: string;
}

export interface ScenarioCharacterQueryDto {
  scenarioId: string;
  keyword?: string;
  includeHidden?: boolean;
}

export type ScenarioCharacterView = ScenarioCharacter;
