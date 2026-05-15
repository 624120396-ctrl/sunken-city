export type ScenarioClueStatus = 'locked' | 'unlocked' | 'archived';

export interface ScenarioClue {
  id: string;
  scenarioId: string;
  title: string;
  description?: string;
  category?: string;
  content?: string;
  status: ScenarioClueStatus;
  sourceNodeId?: string;
  sourceCharacterId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// TODO: 后续为线索增加可见性策略和收集条件。
