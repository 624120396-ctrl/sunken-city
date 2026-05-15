export type ScenarioArgumentStatus = 'draft' | 'active' | 'proven' | 'disproven';

export interface ScenarioArgument {
  id: string;
  scenarioId: string;
  title: string;
  summary?: string;
  premise: string;
  evidenceClueIds: string[];
  relatedDoubtIds: string[];
  confidence: number;
  status: ScenarioArgumentStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// TODO: 后续补充论证链、反驳链与自动评分规则。
