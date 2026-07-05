export type InvestigationVisibility = 'KP_ONLY' | 'PUBLIC';
export type InvestigationLogVisibility = 'PUBLIC' | 'KP_ONLY';

export type ClueStatus = 'UNREVEALED' | 'REVEALED' | 'ANALYZED' | 'KEY' | 'DOUBTFUL';
export type NpcStatus = 'UNSEEN' | 'APPEARED' | 'MISSING' | 'DEAD' | 'SUSPECT' | 'ALLY' | 'HOSTILE';

export interface InvestigationClueView {
  id: string;
  roomId: string;
  title: string;
  content: string;
  source: string | null;
  status: ClueStatus;
  visibility: InvestigationVisibility;
  npcId: string | null;
  sceneId: string | null;
  revealedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationNpcView {
  id: string;
  roomId: string;
  name: string;
  avatarUrl: string | null;
  publicProfile: string;
  keeperNotes?: string;
  status: NpcStatus;
  visibility: InvestigationVisibility;
  revealedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationSceneView {
  id: string;
  roomId: string;
  title: string;
  publicSummary: string;
  keeperNotes?: string;
  atmosphere: string;
  imageUrl: string | null;
  isCurrent: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationLogEntryView {
  id: string;
  roomId: string;
  eventType: string;
  title: string;
  content: string | null;
  payload: unknown;
  visibility: InvestigationLogVisibility;
  isPinned: boolean;
  createdAt: string;
}

export interface KpPrivateNoteView {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationCluePayload {
  title: string;
  content?: string;
  source?: string | null;
  status?: ClueStatus;
  visibility?: InvestigationVisibility;
  npcId?: string | null;
  sceneId?: string | null;
}

export interface InvestigationNpcPayload {
  name: string;
  avatarUrl?: string | null;
  publicProfile?: string;
  keeperNotes?: string;
  status?: NpcStatus;
  visibility?: InvestigationVisibility;
}

export interface InvestigationScenePayload {
  title: string;
  publicSummary?: string;
  keeperNotes?: string;
  atmosphere?: string;
  imageUrl?: string | null;
  isCurrent?: boolean;
  sortOrder?: number;
}

export interface InvestigationLogPayload {
  eventType: 'IMPORTANT_MESSAGE' | 'KP_NOTE_MARKER' | 'DICE_KEY';
  title: string;
  content?: string | null;
  payload?: unknown;
  visibility?: InvestigationLogVisibility;
  isPinned?: boolean;
}

export interface ImportantMessageArchivePayload {
  messageId?: string;
  title?: string;
  content: string;
  nickname?: string;
  timestamp?: string;
  visibility?: InvestigationLogVisibility;
  isPinned?: boolean;
}

export interface KeyDiceArchivePayload {
  diceRollId?: string;
  title?: string;
  rollType?: string;
  targetName?: string | null;
  targetValue?: number | null;
  rollResult?: number;
  successLevel?: string | null;
  nickname?: string;
  timestamp?: string;
  visibility?: InvestigationLogVisibility;
  isPinned?: boolean;
}

export interface KpPrivateNotePayload {
  title: string;
  content?: string;
  tags?: string[];
}

export interface SessionPrepChecklistItem {
  id?: string;
  text: string;
  done: boolean;
  public: boolean;
}

export interface SessionPrepMaterialLink {
  title: string;
  url: string;
  public: boolean;
}

export interface SessionPrepCharacterConfirmation {
  confirmed: boolean;
  note?: string;
}

export interface RoomSessionPrepView {
  id: string;
  roomId: string;
  scheduledAt: string | null;
  checklist: SessionPrepChecklistItem[];
  characterConfirmations: Record<string, SessionPrepCharacterConfirmation>;
  publicNotes: string;
  keeperNotes?: string;
  materialLinks: SessionPrepMaterialLink[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomSessionPrepPayload {
  scheduledAt?: string | null;
  checklist?: SessionPrepChecklistItem[];
  characterConfirmations?: Record<string, SessionPrepCharacterConfirmation>;
  publicNotes?: string;
  keeperNotes?: string;
  materialLinks?: SessionPrepMaterialLink[];
}

export type CharacterSyncIssue = 'NO_CHARACTER' | 'HP_OUT_OF_RANGE' | 'MP_OUT_OF_RANGE' | 'SAN_OUT_OF_RANGE';

export interface RoomCharacterSyncCheck {
  memberId: string;
  userId: string;
  nickname: string;
  role: string;
  character: {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    san: number;
    maxSan: number;
    updatedAt: string;
  } | null;
  issues: CharacterSyncIssue[];
  status: 'READY' | 'NEEDS_ATTENTION';
}

export interface RoomCharacterSyncStatus {
  checks: RoomCharacterSyncCheck[];
  summary: {
    totalPlayers: number;
    readyCount: number;
    needsAttentionCount: number;
  };
}

export interface RoomCurrentFocusView {
  id: string;
  roomId: string;
  lastRecap: string;
  currentObjective: string;
  unresolvedQuestions: string[];
  pinnedMessage: string;
  keeperNotes?: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomCurrentFocusPayload {
  lastRecap?: string;
  currentObjective?: string;
  unresolvedQuestions?: string[];
  pinnedMessage?: string;
  keeperNotes?: string;
}
