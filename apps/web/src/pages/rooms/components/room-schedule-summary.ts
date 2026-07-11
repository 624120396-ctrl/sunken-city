export function formatSchedulePollBadge(summary: {
  candidateCount: number;
  pendingMemberCount: number;
  isVotingClosed: boolean;
}) {
  if (summary.isVotingClosed) return `排期已截止 · ${summary.candidateCount}`;
  return `排期 ${summary.candidateCount} · 待回 ${summary.pendingMemberCount}`;
}

export function canEditSchedulePoll(canManage: boolean, isVotingClosed: boolean) {
  return canManage && !isVotingClosed;
}

export function buildRoomOperationsScheduleCopy(input: {
  nextSessionLabel: string;
  attendance: Record<string, number>;
  schedulePoll: null | {
    candidateCount: number;
    pendingMemberCount: number;
    isVotingClosed: boolean;
  };
}) {
  return {
    primaryValue: input.nextSessionLabel,
    attendanceMeta: `可参加 ${input.attendance.AVAILABLE ?? 0} / 请假 ${input.attendance.LEAVE ?? 0} / 待确认 ${input.attendance.PENDING ?? 0}`,
    pollSupplement: input.schedulePoll ? formatSchedulePollBadge(input.schedulePoll) : null,
  };
}
