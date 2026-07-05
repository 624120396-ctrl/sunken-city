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
