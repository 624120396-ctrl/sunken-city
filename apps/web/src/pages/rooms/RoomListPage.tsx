import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
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
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Modal } from '@components/ui/Modal';
import { EmptyIcons, EmptyState } from '@components/ui/EmptyState';
import { Button, DataCard, PageShell, ReadablePanel, Surface } from '@components/system';
import { RoomListRecruitmentEntry } from './components/RoomListRecruitmentEntry';
import { RoomListStoryCard } from './components/RoomListStoryCard';
import { getRoomListOverview, getRoomReportArchive } from '@/services/room-overview.service';
import type { RoomListOverviewItem, RoomReportArchiveItem } from '@/types/room-overview-contract';
import {
  isActiveLifecycle,
  isClosedLifecycle,
  isPreparingLifecycle,
  isRoomHost,
  isRoomObserver,
  isRoomParticipant,
  normalizeRoomListItem,
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

function getVisibleMemberCount(room: RoomListItem) {
  return room.activeMemberCount ?? room.memberCount;
}

export function RoomListPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [roomSummaries, setRoomSummaries] = useState<RoomListOverviewItem[]>([]);
  const [reportArchives, setReportArchives] = useState<RoomReportArchiveItem[]>([]);
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
      const archives = await getRoomReportArchive().catch(() => [] as RoomReportArchiveItem[]);
      const data = await handleApiResponse<{ rooms: RoomListItemResponse[] }>(response);
      setRooms(Array.isArray(data.rooms) ? data.rooms.map(normalizeRoomListItem) : []);
      setRoomSummaries(summaries);
      setReportArchives(archives);
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
        description="雾门之后仍有故事燃烧，湿冷钥匙在看不见的锁孔旁等待。"
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

            <RoomListRecruitmentEntry />

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

            <Surface variant="panel" material="archive" padding="md" className="room-library-index-card">
              <div className="room-library-index-title">
                <BookOpen size={16} className="text-[var(--coc-accent-gold)]" />
                报告归档
              </div>
              {reportArchives.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--coc-text-muted)]">暂无可回看的房间报告。</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {reportArchives.slice(0, 3).map((archive) => (
                    <button
                      key={archive.roomId}
                      type="button"
                      onClick={() => navigate(archive.report?.link ?? `/rooms/${archive.roomId}`)}
                      className="room-library-report-card"
                    >
                      <div className="room-library-report-card__title">{archive.roomName}</div>
                      <div className="room-library-report-card__summary">
                        {archive.report ? archive.report.summary || archive.report.title : '尚未生成报告，点击回到房间。'}
                      </div>
                      <div className="room-library-report-card__meta">
                        线索 {archive.investigation.publicClueCount} · NPC {archive.investigation.publicNpcCount} · 日志 {archive.investigation.publicLogCount}
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
                return (
                  <RoomListStoryCard
                    key={room.id}
                    room={room}
                    summary={summary}
                    onOpen={(roomId) => navigate(`/rooms/${roomId}`)}
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
