export interface RoomOperationsOverview {
  role: string;
  lifecycle: string;
  canUseKpTools: boolean;
  focus: null | {
    lastRecap: string;
    currentObjective: string;
    unresolvedQuestionCount: number;
    pinnedMessage: string;
    updatedAt: string;
  };
  investigation: {
    publicClueCount: number;
    kpOnlyClueCount?: number;
    publicNpcCount: number;
    kpOnlyNpcCount?: number;
    sceneCount: number;
    pinnedLogCount: number;
    recentPublicLogs: Array<{
      id: string;
      eventType: string;
      title: string;
      createdAt: string;
    }>;
    kpPrivateNoteCount?: number;
  };
  coordination: {
    nextSession: null | {
      scheduledAt: string | null;
      timezone: string;
      title: string;
      status: string;
      note: string;
      updatedAt: string;
    };
    attendanceSummary: Record<string, number>;
    activeMemberCount: number;
    pinnedAnnouncement: null | {
      id: string;
      title: string;
      content: string;
      updatedAt: string;
    };
  };
  communication: {
    currentTopic: string;
    spotlightUserId: string | null;
    keeperPrompt?: string;
    waitingQueueCount: number;
    activeQueueCount: number;
    queuePreview: Array<{
      id: string;
      kind: string;
      status: string;
      label: string;
      targetUserId: string | null;
      requesterUserId: string | null;
    }>;
  };
  recruitment: {
    status: string;
    headline: string;
    pendingApplicationCount?: number;
    pendingInvitationCount?: number;
  };
  launchReadiness?: {
    status: 'READY' | 'NEEDS_ATTENTION';
    doneCount: number;
    todoCount: number;
    items: Array<{
      key: string;
      label: string;
      status: 'DONE' | 'TODO' | 'INFO';
      detail: string;
    }>;
  };
}

export interface RoomListOverviewItem {
  roomId: string;
  name: string;
  lifecycle: string;
  myRole: string;
  activeMemberCount: number;
  nextSession: null | {
    scheduledAt: string | null;
    timezone: string;
    title: string;
    status: string;
  };
  attendanceSummary: Record<string, number>;
  recruitment: {
    status: string;
    headline: string;
    newcomerFriendly: boolean;
  };
  kpTodo: null | {
    pendingApplications: number;
    pendingInvitations: number;
    pendingAttendance: number;
  };
}
