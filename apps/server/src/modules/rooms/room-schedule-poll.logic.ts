export type ScheduleVoteStatus = 'AVAILABLE' | 'TENTATIVE' | 'UNAVAILABLE';
export type SchedulePendingStatus = 'PENDING';
export type ScheduleOptionStatus = ScheduleVoteStatus | SchedulePendingStatus;

export interface SchedulePollOptionInput {
  startsAt: string;
  endsAt: string;
}

export interface SchedulePollInput {
  title?: string;
  note?: string;
  timezone?: string;
  closesAt?: string | null;
  options: SchedulePollOptionInput[];
}

export interface NormalizedScheduleOption {
  startsAt: Date;
  endsAt: Date;
  position: number;
}

export interface NormalizedSchedulePoll {
  title: string;
  note: string;
  timezone: string;
  closesAt: Date | null;
  options: NormalizedScheduleOption[];
}

export interface ScheduleOptionBase {
  id: string;
  startsAt: Date;
  endsAt: Date;
  position: number;
}

export interface ScheduleVoteBase {
  optionId: string;
  userId: string;
  status: ScheduleVoteStatus;
  note?: string;
  updatedAt?: Date;
}

export interface ScheduleOptionSummary {
  AVAILABLE: number;
  TENTATIVE: number;
  UNAVAILABLE: number;
  PENDING: number;
}

export interface ScheduleOptionView {
  id: string;
  startsAt: string;
  endsAt: string;
  position: number;
  votes: ScheduleVoteBase[];
  summary: ScheduleOptionSummary;
  recommendationRank?: number;
  isRecommended?: boolean;
}

export interface CalendarFileInput {
  uid: string;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  url?: string;
  now?: Date;
}

export function canManageSchedulePoll(capabilities: { canUseKPTools: boolean; canManageMembers: boolean }) {
  return capabilities.canUseKPTools || capabilities.canManageMembers;
}

function parseDate(value: string, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} 必须是有效的 ISO 时间`);
  }
  return date;
}

function assertValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error('timezone 必须是有效的 IANA timezone');
  }
}

export function validateSchedulePollInput(input: SchedulePollInput, now = new Date()): NormalizedSchedulePoll {
  if (!Array.isArray(input.options) || input.options.length < 2 || input.options.length > 8) {
    throw new Error('排期候选数量必须为 2-8 个');
  }

  const timezone = input.timezone?.trim() || 'Asia/Shanghai';
  assertValidTimezone(timezone);

  const seen = new Set<string>();
  const options = input.options.map((option, position) => {
    const startsAt = parseDate(option.startsAt, '候选开始时间');
    const endsAt = parseDate(option.endsAt, '候选结束时间');
    if (startsAt >= endsAt) {
      throw new Error('候选结束时间必须晚于开始时间');
    }
    if (startsAt <= now) {
      throw new Error('候选时间不能已经开始或落在过去');
    }

    const key = `${startsAt.getTime()}-${endsAt.getTime()}`;
    if (seen.has(key)) {
      throw new Error('同一排期投票中不能包含重复候选');
    }
    seen.add(key);
    return { startsAt, endsAt, position };
  });

  const closesAt = input.closesAt ? parseDate(input.closesAt, '截止时间') : null;
  if (closesAt) {
    if (closesAt <= now) {
      throw new Error('截止时间必须晚于当前时间');
    }
    const latestEnd = options.reduce((latest, option) => option.endsAt > latest ? option.endsAt : latest, options[0].endsAt);
    if (closesAt >= latestEnd) {
      throw new Error('截止时间必须早于候选结束时间');
    }
    const earliestStart = options.reduce((earliest, option) => option.startsAt < earliest ? option.startsAt : earliest, options[0].startsAt);
    if (closesAt >= earliestStart) {
      throw new Error('截止时间必须早于最早的候选开始时间');
    }
  }

  return {
    title: input.title?.trim() || '开团时间投票',
    note: input.note?.trim() || '',
    timezone,
    closesAt,
    options,
  };
}

export function emptyScheduleSummary(): ScheduleOptionSummary {
  return { AVAILABLE: 0, TENTATIVE: 0, UNAVAILABLE: 0, PENDING: 0 };
}

export function buildOptionSummaries(
  options: ScheduleOptionBase[],
  votes: ScheduleVoteBase[],
  activeMemberIds: string[]
): ScheduleOptionView[] {
  const activeMembers = new Set(activeMemberIds);
  return options.map(option => {
    const summary = emptyScheduleSummary();
    const optionVotes = votes.filter(vote => vote.optionId === option.id && activeMembers.has(vote.userId));
    const votedUsers = new Set<string>();
    for (const vote of optionVotes) {
      if (votedUsers.has(vote.userId)) continue;
      votedUsers.add(vote.userId);
      summary[vote.status] += 1;
    }
    summary.PENDING = Math.max(0, activeMembers.size - votedUsers.size);

    return {
      id: option.id,
      startsAt: option.startsAt.toISOString(),
      endsAt: option.endsAt.toISOString(),
      position: option.position,
      votes: optionVotes,
      summary,
    };
  });
}

function compareScheduleOptions(a: ScheduleOptionView, b: ScheduleOptionView) {
  return (
    b.summary.AVAILABLE - a.summary.AVAILABLE ||
    a.summary.UNAVAILABLE - b.summary.UNAVAILABLE ||
    b.summary.TENTATIVE - a.summary.TENTATIVE ||
    a.summary.PENDING - b.summary.PENDING ||
    new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() ||
    a.position - b.position
  );
}

export function sortScheduleOptions(options: ScheduleOptionView[]): ScheduleOptionView[] {
  return [...options]
    .sort(compareScheduleOptions)
    .map((option, index) => ({
      ...option,
      recommendationRank: index + 1,
      isRecommended: index === 0,
    }));
}

export function collectPendingScheduleMemberIds(
  activeMemberIds: string[],
  optionIds: string[],
  votes: ScheduleVoteBase[]
): string[] {
  const expectedOptions = new Set(optionIds);
  const answeredByMember = new Map<string, Set<string>>();
  for (const vote of votes) {
    if (!expectedOptions.has(vote.optionId)) continue;
    const answered = answeredByMember.get(vote.userId) ?? new Set<string>();
    answered.add(vote.optionId);
    answeredByMember.set(vote.userId, answered);
  }
  return activeMemberIds.filter(memberId => (answeredByMember.get(memberId)?.size ?? 0) < expectedOptions.size);
}

function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildCalendarFile(input: CalendarFileInput) {
  const now = input.now ?? new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sunken City//Room Coordination//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(input.uid)}`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(input.startsAt)}`,
    `DTEND:${formatIcsDate(input.endsAt)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
  ];

  if (input.description) lines.push(`DESCRIPTION:${escapeIcsText(input.description)}`);
  if (input.url) lines.push(`URL:${escapeIcsText(input.url)}`);

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
