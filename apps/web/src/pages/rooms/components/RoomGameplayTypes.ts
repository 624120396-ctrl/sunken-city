import type {
  RoomBindingView,
  RoomCapabilities,
  RoomLifecycle,
  RoomMemberView,
  RoomRoleView,
} from '@/types/room-contract';

export interface RoomGameplayRoom {
  id: string;
  roomId: string;
  name: string;
  description?: string;
  status: string;
  isCreator: boolean;
  isMember: boolean;
  myRole?: RoomRoleView;
  myCapabilities?: RoomCapabilities;
  myBinding?: RoomBindingView;
  lifecycle?: RoomLifecycle;
  members: RoomGameplayMember[];
  atmosphere?: string;
  sceneDesc?: string;
  phases?: Array<{
    id: string;
    title: string;
    description?: string;
    sortOrder: number;
    status: string;
    scenes: Array<{
      id: string;
      title: string;
      description?: string;
      atmosphere: string;
      imageUrl?: string;
      musicUrl?: string;
      sortOrder: number;
      status: string;
    }>;
  }>;
  currentPhase?: {
    id: string;
    title: string;
    description?: string;
    status: string;
  } | null;
  currentScene?: {
    id: string;
    title: string;
    description?: string;
    atmosphere: string;
    imageUrl?: string;
  } | null;
}

export interface RoomGameplayCharacter {
  id: string;
  name: string;
  occupation: string;
  avatarUrl?: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  san: number;
  maxSan: number;
  str?: number;
  dex?: number;
  con?: number;
  siz?: number;
  app?: number;
  int?: number;
  pow?: number;
  edu?: number;
  luck?: number;
  mov?: number;
  build?: number;
  background?: string;
  skills?: string;
  quickSkills?: string;
}

export interface RoomGameplayMember {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  frameUrl?: string;
  role: RoomMemberView['role'];
  exp?: number;
  coins?: number;
  stardust?: number;
  displayedTitleKey?: string | null;
  rankName?: string;
  rankColor?: string;
  titleName?: string | null;
  titleColor?: string | null;
  expToNext?: number;
  nextRankName?: string | null;
  displayedCharacter?: RoomGameplayCharacter | null;
  character?: RoomGameplayCharacter | null;
}

export interface RoomChatMessage {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  type: 'text' | 'dice' | 'system' | 'private';
  timestamp: string;
  privateMeta?: {
    participantUserIds?: string[];
    targetUserId?: string;
    targetNickname?: string;
    targetRole?: string;
    senderRole?: string;
  };
  rollData?: {
    targetName?: string;
    targetValue?: number;
    rollResult?: number;
    successLevel?: string;
  };
}

export interface RoomCombatant {
  userId: string;
  characterId?: string;
  nickname: string;
  characterName?: string;
  dex: number;
  hp: number;
  maxHp: number;
  mp: number;
  san: number;
  isKP: boolean;
  weapons?: any[];
  equippedWeapon?: any;
  equippedArmor?: any;
}

export interface RoomCombatState {
  status: 'IDLE' | 'IN_PROGRESS' | 'PAUSED' | 'ENDED';
  currentRound: number;
  currentTurnIndex: number;
  turnOrder: RoomCombatant[];
  log: any[];
}
