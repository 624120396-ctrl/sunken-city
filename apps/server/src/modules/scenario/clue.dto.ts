/**
 * 线索数据传输对象
 */

export interface CreateScenarioClueDto {
  scenarioId: string;
  name: string;
  description?: string;
  icon?: string;
  type: 'PERSON' | 'ITEM' | 'EVENT' | 'LOCATION';
  unlockCondition?: {
    type: 'NODE_REACHED' | 'ITEM_USED' | 'CLUE_COMBINED';
    data: any;
  };
}

export interface UpdateScenarioClueDto {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  type?: 'PERSON' | 'ITEM' | 'EVENT' | 'LOCATION';
  unlockCondition?: {
    type: 'NODE_REACHED' | 'ITEM_USED' | 'CLUE_COMBINED';
    data: any;
  };
}

export interface ScenarioClueQueryDto {
  scenarioId: string;
}

export interface ScenarioClueView {
  id: string;
  scenarioId: string;
  name: string;
  description: string;
  icon: string | null;
  type: string;
  unlockCondition: any;
  createdAt: Date;
}
