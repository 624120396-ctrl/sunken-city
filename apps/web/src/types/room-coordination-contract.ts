export type RoomAttendanceStatus = 'PENDING' | 'AVAILABLE' | 'LEAVE' | 'TENTATIVE';
export type RoomNextSessionStatus = 'SCHEDULED' | 'RESCHEDULED' | 'CANCELLED';

export interface RoomNextSessionView {
  id: string;
  scheduledAt: string | null;
  timezone: string;
  title: string;
  note: string;
  status: RoomNextSessionStatus;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomNextSessionPayload {
  scheduledAt?: string | null;
  timezone?: string;
  title?: string;
  note?: string;
  status?: RoomNextSessionStatus;
}

export interface RoomAttendanceView {
  id: string | null;
  userId: string;
  userNickname: string;
  status: RoomAttendanceStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomAttendancePayload {
  status: RoomAttendanceStatus;
  note?: string;
}

export interface RoomAnnouncementView {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomAnnouncementPayload {
  title?: string;
  content: string;
  isPinned?: boolean;
}

export interface RoomCoordinationView {
  nextSession: RoomNextSessionView | null;
  attendance: RoomAttendanceView[];
  announcements: RoomAnnouncementView[];
  myAttendance: RoomAttendanceView | null;
  canManageCoordination: boolean;
}

export type RoomScheduleVoteStatus = 'AVAILABLE' | 'TENTATIVE' | 'UNAVAILABLE';
export type RoomSchedulePollStatus = 'OPEN' | 'FINALIZED' | 'CANCELLED';

export interface RoomScheduleOptionView {
  id: string;
  startsAt: string;
  endsAt: string;
  position: number;
  summary: Record<RoomScheduleVoteStatus | 'PENDING', number>;
  recommendationRank: number;
  isRecommended: boolean;
  myVote: null | {
    status: RoomScheduleVoteStatus;
    note: string;
  };
}

export interface RoomSchedulePollView {
  id: string;
  title: string;
  note: string;
  timezone: string;
  status: RoomSchedulePollStatus;
  closesAt: string | null;
  finalizedOptionId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isVotingClosed: boolean;
  options: RoomScheduleOptionView[];
}

export interface RoomSchedulePollPayload {
  title?: string;
  note?: string;
  timezone?: string;
  closesAt?: string | null;
  options: Array<{ id?: string; startsAt: string; endsAt: string }>;
}

export interface RoomSchedulePollListView {
  polls: RoomSchedulePollView[];
  canManageSchedulePoll: boolean;
  hasDownloadableNextSession: boolean;
}
