export type ScenarioDoubtStatus = 'hidden' | 'visible' | 'resolved';

export interface ScenarioDoubt {
  id: string;
  scenarioId: string;
  title: string;
  description?: string;
  status: ScenarioDoubtStatus;
  triggerNodeIds: string[];
  relatedCharacterIds: string[];
  relatedClueIds: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// TODO: 后续为疑点补充推理阶段、优先级和判定规则。
