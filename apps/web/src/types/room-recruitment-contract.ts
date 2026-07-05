export type RoomRecruitmentStatus = 'CLOSED' | 'OPEN' | 'PAUSED';
export type RoomJoinApplicationStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'WITHDRAWN';

export interface RoomRecruitmentProfileView {
  id: string;
  status: RoomRecruitmentStatus;
  headline: string;
  pitch: string;
  styleTags: string[];
  scheduleText: string;
  requirements: string;
  safetyTools: string;
  playerCountMin: number;
  playerCountMax: number;
  newcomerFriendly: boolean;
  plGuide: string;
  kpChecklist: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomRecruitmentProfilePayload {
  status?: RoomRecruitmentStatus;
  headline?: string;
  pitch?: string;
  styleTags?: string[];
  scheduleText?: string;
  requirements?: string;
  safetyTools?: string;
  playerCountMin?: number;
  playerCountMax?: number;
  newcomerFriendly?: boolean;
  plGuide?: string;
  kpChecklist?: string;
}

export interface RoomJoinApplicationView {
  id: string;
  userId: string;
  applicantName: string;
  status: RoomJoinApplicationStatus;
  message: string;
  experienceNote: string;
  availabilityNote: string;
  preferredStyleTags: string[];
  reviewerId: string | null;
  reviewNote: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomJoinApplicationPayload {
  message?: string;
  experienceNote?: string;
  availabilityNote?: string;
  preferredStyleTags?: string[];
}

export interface RoomJoinApplicationReviewPayload {
  status: Extract<RoomJoinApplicationStatus, 'PENDING' | 'APPROVED' | 'DECLINED'>;
  reviewNote?: string;
}

export interface RoomRecruitmentView {
  profile: RoomRecruitmentProfileView | null;
  applications: RoomJoinApplicationView[];
  ownApplication: RoomJoinApplicationView | null;
  canManageRecruitment: boolean;
  isRoomMember: boolean;
}
