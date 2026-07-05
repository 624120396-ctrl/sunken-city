export type RoomAiTaskType =
  | 'CLUE_DRAFT'
  | 'NPC_DRAFT'
  | 'SCENE_DRAFT'
  | 'SESSION_RECAP_DRAFT'
  | 'CURRENT_OBJECTIVE_DRAFT'
  | 'OPEN_QUESTIONS_DRAFT'
  | 'CHARACTER_VOICE_DRAFT'
  | 'IMAGE_ASSET_DRAFT';

export interface RoomAiSettingsView {
  enabled: boolean;
  textAssistantEnabled: boolean;
  imageWorkshopEnabled: boolean;
  voiceReservedStatus: 'DISABLED_READ_ONLY' | string;
  defaultTextProvider: string | null;
  defaultTextModelId: string | null;
  defaultCharacterProvider: string | null;
  defaultCharacterModelId: string | null;
  defaultImageProvider: string | null;
  defaultImageModelId: string | null;
  playerVisibleContextEnabled: boolean;
  kpPrivateContextEnabled: boolean;
  monthlyCostLimitCents: number;
  updatedById: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RoomAiSettingsPayload {
  enabled?: boolean;
  textAssistantEnabled?: boolean;
  imageWorkshopEnabled?: boolean;
  defaultTextProvider?: string;
  defaultTextModelId?: string;
  defaultCharacterProvider?: string;
  defaultCharacterModelId?: string;
  defaultImageProvider?: string;
  defaultImageModelId?: string;
  playerVisibleContextEnabled?: boolean;
  monthlyCostLimitCents?: number;
}

export interface RoomAiContextPreview {
  scope: 'PLAYER_VISIBLE';
  sourceVersion: string;
  generatedAt: string;
  room: {
    id: string;
    name: string;
    lifecycle: string;
    myRole: string;
  };
  currentFocus: null | {
    lastRecap: string;
    currentObjective: string;
    unresolvedQuestions: unknown[];
    pinnedMessage: string;
  };
  sessionPrep: null | {
    publicNotes: string;
    checklist: unknown[];
    materialLinks: unknown[];
  };
  ownCharacter: null | {
    id: string;
    name: string;
    occupation: string;
    hp: number;
    mp: number;
    san: number;
  };
  publicClues: unknown[];
  publicNpcs: unknown[];
  publicScenes: unknown[];
  publicTimeline: unknown[];
  excludedSources: string[];
}

export interface RoomAiJobView {
  id: string;
  taskType: RoomAiTaskType;
  status: string;
  visibility: string;
  contextScope: string;
  provider: string | null;
  modelId: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  errorMessage: string | null;
  providerRequestId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface RoomAiUsageLedgerView {
  id: string;
  provider: string;
  model: string;
  taskType: string;
  unitType: string;
  inputUnits: number;
  outputUnits: number;
  totalUnits: number;
  estimatedCostCents: number;
  providerRequestId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
