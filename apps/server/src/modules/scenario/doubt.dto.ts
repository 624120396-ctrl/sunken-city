/**
 * 疑点数据传输对象
 */

export interface CreateScenarioDoubtDto {
  scenarioId: string;
  nodeId: string;
  title: string;
  description?: string;
  requiredClueCount?: number;
  correctClueIds?: string[];
  successNodeId: string;
  failNodeId: string;
  maxRetry?: number;
  modePunishment?: {
    TRPG?: { sanityLoss: number; triggerBE?: boolean };
    STORY?: null;
  };
}

export interface UpdateScenarioDoubtDto {
  id: string;
  title?: string;
  description?: string;
  requiredClueCount?: number;
  correctClueIds?: string[];
  successNodeId?: string;
  failNodeId?: string;
  maxRetry?: number;
  modePunishment?: {
    TRPG?: { sanityLoss: number; triggerBE?: boolean };
    STORY?: null;
  };
}

export interface ScenarioDoubtQueryDto {
  scenarioId: string;
}

export interface ScenarioDoubtView {
  id: string;
  scenarioId: string;
  nodeId: string;
  title: string;
  description: string;
  requiredClueCount: number;
  correctClueIds: string[];
  successNodeId: string;
  failNodeId: string;
  maxRetry: number;
  modePunishment: any;
  createdAt: Date;
}
