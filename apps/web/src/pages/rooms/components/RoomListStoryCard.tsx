import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Crown,
  DoorOpen,
  Eye,
  Flag,
  Hash,
  Hourglass,
  PlayCircle,
  Shield,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { RoomListOverviewItem } from '@/types/room-overview-contract';
import { formatSchedulePollBadge } from './room-schedule-summary';
import {
  isActiveLifecycle,
  isClosedLifecycle,
  isPreparingLifecycle,
  isRoomHost,
  isRoomObserver,
  isRoomParticipant,
  roomLifecycleLabels,
  roomRoleCompactLabels,
  type RoomLifecycle,
  type RoomListItem,
  type RoomRoleView,
} from '@/types/room-contract';

interface RoomListStoryCardProps {
  room: RoomListItem;
  summary?: RoomListOverviewItem;
  onOpen: (roomId: string) => void;
}

function getVisibleMemberCount(room: RoomListItem) {
  return room.activeMemberCount ?? room.memberCount;
}

function formatNextSession(value?: string | null, timezone = 'Asia/Shanghai') {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getRoleTone(role: RoomRoleView) {
  if (isRoomHost(role)) return 'gold';
  if (isRoomParticipant(role)) return 'ocean';
  if (isRoomObserver(role)) return 'copper';
  return 'muted';
}

function getLifecycleTone(lifecycle: RoomLifecycle) {
  if (isClosedLifecycle(lifecycle)) return 'blood';
  if (isActiveLifecycle(lifecycle)) return 'ocean';
  if (isPreparingLifecycle(lifecycle)) return 'gold';
  return 'muted';
}

function getRoleIcon(role: RoomRoleView) {
  if (isRoomHost(role)) return <Crown size={17} />;
  if (isRoomParticipant(role)) return <UserRound size={17} />;
  if (isRoomObserver(role)) return <Eye size={17} />;
  return <BookOpen size={17} />;
}

function getLifecycleIcon(lifecycle: RoomLifecycle) {
  if (isClosedLifecycle(lifecycle)) return <Flag size={13} />;
  if (isActiveLifecycle(lifecycle)) return <PlayCircle size={13} />;
  if (isPreparingLifecycle(lifecycle)) return <Hourglass size={13} />;
  return <Sparkles size={13} />;
}

function Badge({ tone, icon, children }: { tone: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="room-library-badge" data-tone={tone}>
      {icon}
      {children}
    </span>
  );
}

export function RoomListStoryCard({ room, summary, onOpen }: RoomListStoryCardProps) {
  const nextSessionText = formatNextSession(summary?.nextSession?.scheduledAt, summary?.nextSession?.timezone);
  const kpTodoCount = summary?.kpTodo
    ? summary.kpTodo.pendingApplications + summary.kpTodo.pendingInvitations + summary.kpTodo.pendingAttendance
    : 0;
  const lifecycleTone = getLifecycleTone(room.lifecycle);
  const roleTone = getRoleTone(room.myRole);
  const openRecruitment = summary?.recruitment.status === 'OPEN';

  return (
    <article
      role="button"
      tabIndex={0}
      data-testid="room-card"
      className="room-library-story-card"
      data-tone={roleTone}
      onClick={() => onOpen(room.roomId)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(room.roomId);
        }
      }}
    >
      <header className="room-library-story-card__header">
        <span className="room-library-story-card__seal" data-tone={roleTone}>
          {getRoleIcon(room.myRole)}
        </span>
        <div className="room-library-story-card__identity">
          <div className="room-library-story-card__code">
            <Hash size={12} />
            {room.roomId}
          </div>
          <h2 className="room-library-story-card__title">{room.name}</h2>
        </div>
        <Badge tone={lifecycleTone} icon={getLifecycleIcon(room.lifecycle)}>
          {roomLifecycleLabels[room.lifecycle]}
        </Badge>
      </header>

      <p className="room-library-story-card__description">
        {room.description || '尚未留下公开简介。故事的门已经开启，等待调查员踏入。'}
      </p>

      <div className="room-library-story-card__badges">
        <Badge tone={roleTone} icon={<Shield size={13} />}>
          {roomRoleCompactLabels[room.myRole]}
        </Badge>
        <Badge tone="muted" icon={<Users size={13} />}>
          {getVisibleMemberCount(room)}
          {typeof room.observerCount === 'number' && room.observerCount > 0 ? ` · 观察 ${room.observerCount}` : ''}
        </Badge>
        {nextSessionText && (
          <Badge tone="copper" icon={<CalendarClock size={13} />}>
            {nextSessionText}
          </Badge>
        )}
        {summary?.schedulePoll && (
          <Badge tone="ocean" icon={<CalendarClock size={13} />}>
            {formatSchedulePollBadge(summary.schedulePoll)}
            {summary.schedulePoll.closesAt
              ? ` · 截 ${formatNextSession(summary.schedulePoll.closesAt, summary.schedulePoll.timezone)}`
              : ''}
          </Badge>
        )}
        {openRecruitment && (
          <Badge tone="gold" icon={<DoorOpen size={13} />}>
            招募中
          </Badge>
        )}
        {kpTodoCount > 0 && (
          <Badge tone="blood" icon={<Hourglass size={13} />}>
            待办 {kpTodoCount}
          </Badge>
        )}
      </div>

      <footer className="room-library-story-card__footer">
        <span className="room-library-story-card__status-line">
          {openRecruitment ? '有公开招募资料' : '房间档案'}
        </span>
        <span className="room-library-story-card__action">
          进入房间
          <ArrowRight size={15} />
        </span>
      </footer>
    </article>
  );
}
