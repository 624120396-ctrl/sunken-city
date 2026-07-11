export function formatSchedulePollBadge(summary: {
  candidateCount: number;
  pendingMemberCount: number;
  isVotingClosed: boolean;
}) {
  if (summary.isVotingClosed) return `排期已截止 · ${summary.candidateCount}`;
  return `排期 ${summary.candidateCount} · 待回 ${summary.pendingMemberCount}`;
}
