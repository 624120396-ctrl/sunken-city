export type GlobalRecruitmentSourceType = 'INTERNAL_ROOM' | 'EXTERNAL_EVENT';
export type GlobalRecruitmentStatus = 'OPEN' | 'CLOSED' | 'EXPIRED';
export type GlobalRecruitmentContactVisibility = 'PUBLIC' | 'LOGGED_IN' | 'RESPONDERS';
export type GlobalRecruitmentResponseStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
export type GlobalRecruitmentReportReason = 'HARASSMENT' | 'SPAM' | 'MISLEADING' | 'UNSAFE' | 'OTHER';

export interface GlobalRecruitmentResponseView {
  id: string;
  userId: string;
  responderName: string;
  status: GlobalRecruitmentResponseStatus;
  message: string;
  contactNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalRecruitmentPostView {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  roomId: string | null;
  roomTitle: string | null;
  sourceType: GlobalRecruitmentSourceType;
  systemOrTheme: string;
  playFormat: string;
  locationOrPlatform: string;
  scheduleText: string;
  playerCountMin: number;
  playerCountMax: number;
  experienceRequirement: string;
  contactMethod: string;
  contactVisibility: GlobalRecruitmentContactVisibility;
  contactLocked: boolean;
  status: GlobalRecruitmentStatus;
  rawStatus: 'OPEN' | 'CLOSED';
  description: string;
  safetyNote: string;
  tags: string[];
  expiresAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  responseCount: number;
  reportCount?: number;
  canManage: boolean;
  ownResponse: GlobalRecruitmentResponseView | null;
  responses: GlobalRecruitmentResponseView[];
}

export interface GlobalRecruitmentPostPayload {
  title: string;
  sourceType: GlobalRecruitmentSourceType;
  roomPublicId?: string;
  systemOrTheme: string;
  playFormat: string;
  locationOrPlatform: string;
  scheduleText: string;
  playerCountMin?: number;
  playerCountMax?: number;
  experienceRequirement?: string;
  contactMethod: string;
  contactVisibility?: GlobalRecruitmentContactVisibility;
  status?: 'OPEN' | 'CLOSED';
  description?: string;
  safetyNote?: string;
  tags?: string[];
  expiresAt?: string | null;
}

export interface GlobalRecruitmentResponsePayload {
  message?: string;
  contactNote?: string;
}

export interface GlobalRecruitmentReportPayload {
  reason: GlobalRecruitmentReportReason;
  note?: string;
}
