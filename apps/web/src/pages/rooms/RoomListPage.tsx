import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Compass,
  Crown,
  DoorOpen,
  Eye,
  Flag,
  Hash,
  Hourglass,
  PlayCircle,
  Plus,
  Search,
  Shield,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Modal } from '@components/ui/Modal';
import { EmptyIcons, EmptyState } from '@components/ui/EmptyState';
import { ActionCard, Button, DataCard, PageShell, ReadablePanel, Surface } from '@components/system';
import { getRoomListOverview } from '@/services/room-overview.service';
import type { RoomListOverviewItem } from '@/types/room-overview-contract';
import {
  isActiveLifecycle,
  isClosedLifecycle,
  isPreparingLifecycle,
  isRoomHost,
  isRoomObserver,
  isRoomParticipant,
  normalizeRoomListItem,
  roomLifecycleLabels,
  roomRoleCompactLabels,
  type RoomListItem,
  type RoomListItemResponse,
} from '@/types/room-contract';

type RoomFilter = 'all' | 'hosting' | 'playing' | 'observing' | 'preparing' | 'inProgress' | 'finished';

const filterLabels: Array<{ value: RoomFilter; label: string; shortLabel: string; icon: LucideIcon }> = [
  { value: 'all', label: '全部故事', shortLabel: '全部', icon: BookOpen },
  { value: 'hosting', label: '我主持', shortLabel: '主持', icon: Crown },
  { value: 'playing', label: '我参与', shortLabel: '参与', icon: UserRound },
  { value: 'observing', label: '观察中', shortLabel: '观察', icon: Eye },
  { value: 'preparing', label: '准备中', shortLabel: '准备', icon: Hourglass },
  { value: 'inProgress', label: '进行中', shortLabel: '进行', icon: PlayCircle },
  { value: 'finished', label: '已结团', shortLabel: '结团', icon: Flag },
];

function normalizeRoomId(value: string) {
  return value.trim().toUpperCase();
}

function roomMatchesFilter(room: RoomListItem, filter: RoomFilter) {
  switch (filter) {
    case 'hosting':
      return isRoomHost(room.myRole);
    case 'playing':
      return isRoomParticipant(room.myRole);
    case 'observing':
      return isRoomObserver(room.myRole);
    case 'preparing':
      return isPreparingLifecycle(room.lifecycle);
    case 'inProgress':
      return isActiveLifecycle(room.lifecycle);
    case 'finished':
      return isClosedLifecycle(room.lifecycle);
    case 'all':
    default:
      return true;
  }
}

function getRoomCardTone(room: RoomListItem) {
  if (isRoomHost(room.myRole)) return 'gold';
  if (isRoomParticipant(room.myRole)) return 'ocean';
  if (isClosedLifecycle(room.lifecycle)) return 'blood';
  return 'neutral';
}

function getRoomCardIcon(room: RoomListItem) {
  if (isRoomHost(room.myRole)) return <Crown size={16} />;
  if (isRoomParticipant(room.myRole)) return <UserRound size={16} />;
  if (isRoomObserver(room.myRole)) return <Eye size={16} />;
  return <BookOpen size={16} />;
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

export function RoomListPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [roomSummaries, setRoomSummaries] = useState<RoomListOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RoomFilter>('all');
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const [response, summaries] = await Promise.all([
        apiFetch('/rooms'),
        getRoomListOverview().catch(() => [] as RoomListOverviewItem[]),
      ]);
      const data = await handleApiResponse<{ rooms: RoomListItemResponse[] }>(response);
      setRooms(Array.isArray(data.rooms) ? data.rooms.map(normalizeRoomListItem) : []);
      setRoomSummaries(summaries);
    } catch (error) {
      console.error('获取房间列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/rooms', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      const data = await handleApiResponse<{ room: { roomId: string } }>(response);
      setShowCreateModal(false);
      navigate(`/rooms/${data.room.roomId}`);
    } catch (error: any) {
      alert(error.message || '创建房间失败');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const roomId = normalizeRoomId(joinRoomId);
    if (!roomId) return;
    navigate(`/rooms/${roomId}`);
  };

  const roomStats = useMemo(() => {
    const hosting = rooms.filter((room) => isRoomHost(room.myRole)).length;
    const playing = rooms.filter((room) => isRoomParticipant(room.myRole)).length;
    return {
      total: rooms.length,
      hosting,
      playing,
      members: rooms.reduce((sum, room) => sum + getVisibleMemberCount(room), 0),
    };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rooms.filter((room) => {
      if (!roomMatchesFilter(room, activeFilter)) return false;
      if (!query) return true;

      return [room.name, room.roomId, room.description || '']
        .some((text) => text.toLowerCase().includes(query));
    });
  }, [rooms, activeFilter, searchQuery]);

  const roomSummaryById = useMemo(() => {
    return new Map(roomSummaries.map((summary) => [summary.roomId, summary]));
  }, [roomSummaries]);

  const canJoin = normalizeRoomId(joinRoomId).length > 0;

  if (loading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#c9a227] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <PageShell
        title="故事书"
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Compass size={14} />
            故事索引 / Story Gateway
          </span>
        }
        description="选择正在进行的跑团，或用房间号直接进入。移动端优先保证快速入房和参团路径。"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowJoinModal(true)} icon={<DoorOpen size={16} />}>
              加入故事
            </Button>
            <Button variant="primary" onClick={() => setShowCreateModal(true)} icon={<Plus size={16} />}>
              开启故事
            </Button>
          </>
        }
        aside={
          <div className="room-library-page__aside-stack">
            <ReadablePanel
              data-testid="room-quick-join"
              title="快速进入"
              eyebrow="room code"
              description="已有房间号时，直接进入跑团现场。"
              material="archive"
            >
              <form onSubmit={handleJoinRoom} className="space-y-3">
                <div className="room-library-search">
                  <Hash size={15} className="room-library-search__icon" />
                  <input
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                    className="room-library-input pl-9 pr-3 font-mono text-sm tracking-[0.18em] placeholder:tracking-normal"
                    placeholder="ROOMID"
                    maxLength={6}
                    pattern="[A-Z0-9]{1,6}"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!canJoin}
                  className="room-library-action-button room-library-action-button--join w-full"
                  icon={<ArrowRight size={16} />}
                >
                  进入房间
                </Button>
              </form>
            </ReadablePanel>

            <Surface variant="panel" material="limestone" padding="md" className="room-library-index-card">
              <div className="room-library-index-title">
                <BookOpen size={16} className="text-[var(--coc-accent-gold)]" />
                当前索引
              </div>
              <div className="room-library-index-grid">
                <DataCard label="故事" value={roomStats.total} tone="gold" material="archive" />
                <DataCard label="主持" value={roomStats.hosting} material="archive" />
                <DataCard label="参与" value={roomStats.playing} material="archive" />
                <DataCard label="席位" value={roomStats.members} tone="ocean" material="archive" />
              </div>
            </Surface>
          </div>
        }
        data-testid="room-list-page"
        layout="with-aside"
        className="room-library-page"
      >
        <main className="room-library-page__main min-w-0">
          <Surface variant="panel" material="limestone" padding="md" className="room-library-page__tools">
            <div className="room-library-page__tools-inner">
              <div className="room-library-search">
                <Search size={16} className="room-library-search__icon" />
                <input
                  data-testid="room-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="room-library-input pl-9 pr-3 text-sm"
                  placeholder="搜索故事名、房间号、简介..."
                />
              </div>

              <div className="room-library-filter-strip">
                {filterLabels.map((filter) => {
                  const Icon = filter.icon;
                  const active = activeFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      data-active={active ? 'true' : 'false'}
                      onClick={() => setActiveFilter(filter.value)}
                      className="btn-v2 room-library-filter flex items-center justify-center gap-1.5 px-2 text-xs"
                    >
                      <Icon size={14} />
                      <span className="hidden sm:inline">{filter.label}</span>
                      <span className="sm:hidden">{filter.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Surface>

          {filteredRooms.length === 0 ? (
            <Surface variant="solid" material="archive" padding="lg" className="room-library-empty">
              <EmptyState
                icon={EmptyIcons.Messages}
                title={rooms.length === 0 ? '暂无进行中的故事' : '没有匹配的故事'}
                description={rooms.length === 0 ? '创建或加入一个房间开始跑团。' : '换一个关键词，或切换筛选条件。'}
                action={
                  <Button
                    variant="primary"
                    onClick={() => setShowJoinModal(true)}
                    className="room-library-action-button room-library-action-button--empty"
                    icon={<DoorOpen size={15} />}
                  >
                    输入房间号
                  </Button>
                }
              />
            </Surface>
          ) : (
            <div className="room-library-grid">
              {filteredRooms.map((room) => {
                const summary = roomSummaryById.get(room.roomId);
                const nextSessionText = formatNextSession(
                  summary?.nextSession?.scheduledAt,
                  summary?.nextSession?.timezone
                );
                const kpTodoCount = summary?.kpTodo
                  ? summary.kpTodo.pendingApplications + summary.kpTodo.pendingInvitations + summary.kpTodo.pendingAttendance
                  : 0;

                return (
                  <ActionCard
                    key={room.id}
                    data-testid="room-card"
                    role="button"
                    tabIndex={0}
                    title={room.name}
                    eyebrow={
                      <span className="inline-flex items-center gap-1">
                        <Hash size={12} />
                        {room.roomId}
                      </span>
                    }
                    icon={getRoomCardIcon(room)}
                    description={room.description || '尚未留下公开简介。故事的门已经开启，等待调查员踏入。'}
                    tone={getRoomCardTone(room)}
                    material="archive"
                    meta={
                      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <Sparkles size={13} />
                          {roomLifecycleLabels[room.lifecycle]}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Shield size={13} />
                          {roomRoleCompactLabels[room.myRole]}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={13} />
                          {getVisibleMemberCount(room)}
                          {typeof room.observerCount === 'number' && room.observerCount > 0
                            ? ` · 观察 ${room.observerCount}`
                            : ''}
                        </span>
                        {nextSessionText && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock size={13} />
                            {nextSessionText}
                          </span>
                        )}
                        {summary?.recruitment.status === 'OPEN' && (
                          <span className="inline-flex items-center gap-1">
                            <DoorOpen size={13} />
                            招募中
                          </span>
                        )}
                        {kpTodoCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Hourglass size={13} />
                            待办 {kpTodoCount}
                          </span>
                        )}
                      </span>
                    }
                    actions={
                      <span className="flex items-center gap-1 text-sm font-medium text-[var(--coc-accent-gold-strong)]">
                        进入房间
                        <ArrowRight size={15} />
                      </span>
                    }
                    onClick={() => navigate(`/rooms/${room.roomId}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') navigate(`/rooms/${room.roomId}`);
                    }}
                    className="room-library-card h-full"
                  />
                );
              })}
            </div>
          )}
        </main>
      </PageShell>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="开启新故事">
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div className="room-library-modal-field">
            <label className="room-library-modal-label">故事名称 *</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="room-library-modal-input"
              placeholder="给这个故事起个名字"
              required
              maxLength={50}
            />
          </div>
          <div className="room-library-modal-field">
            <label className="room-library-modal-label">故事简介</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="room-library-modal-input min-h-[100px] resize-none"
              placeholder="简要描述这个故事的背景"
              maxLength={200}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="coc-focus-ring flex-1 rounded-[var(--coc-radius-control)] border border-[var(--coc-border-subtle)] px-4 py-2 text-[var(--coc-text-secondary)] transition-colors hover:bg-white/[0.06] hover:text-[var(--coc-text-primary)]"
            >
              取消
            </button>
            <Button type="submit" variant="primary" className="flex-1">
              创建
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="加入故事">
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div className="room-library-modal-field">
            <label className="room-library-modal-label">房间号 *</label>
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              className="room-library-modal-input font-mono tracking-[0.18em]"
              placeholder="输入6位房间号"
              required
              maxLength={6}
              pattern="[A-Z0-9]{1,6}"
            />
            <p className="room-library-modal-help">房间号由字母和数字组成。</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="coc-focus-ring flex-1 rounded-[var(--coc-radius-control)] border border-[var(--coc-border-subtle)] px-4 py-2 text-[var(--coc-text-secondary)] transition-colors hover:bg-white/[0.06] hover:text-[var(--coc-text-primary)]"
            >
              取消
            </button>
            <Button type="submit" variant="primary" disabled={!canJoin} className="flex-1">
              加入
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
