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
  Shield,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { cn } from '@lib/utils';
import { Modal } from '@components/ui/Modal';
import { EmptyIcons, EmptyState } from '@components/ui/EmptyState';
import { ActionCard, Button, DataCard, PageShell, ReadablePanel, Surface } from '@components/system';
import {
  isActiveLifecycle,
  isClosedLifecycle,
  isPreparingLifecycle,
  isRoomHost,
  isRoomObserver,
  isRoomParticipant,
  roomLifecycleLabels,
  roomRoleLabels,
  type RoomListItem,
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

export function RoomListPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
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
      const response = await apiFetch('/rooms');
      const data = await handleApiResponse<{ rooms: RoomListItem[] }>(response);
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
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
          story gateway
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
        <div className="space-y-4">
          <ReadablePanel
            data-testid="room-quick-join"
            title="快速进入"
            eyebrow="room code"
            description="已有房间号时，直接进入跑团现场。"
          >
            <form onSubmit={handleJoinRoom} className="space-y-3">
              <div className="relative">
                <Hash size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--coc-on-surface-muted)]" />
                <input
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  className="h-11 w-full rounded-[var(--coc-radius-control)] border border-[var(--coc-border-subtle)] bg-black/20 pl-9 pr-3 font-mono text-sm tracking-[0.18em] text-[var(--coc-on-surface-primary)] outline-none transition-colors placeholder:tracking-normal placeholder:text-[var(--coc-on-surface-muted)] focus:border-[var(--coc-accent-gold)]"
                  placeholder="ROOMID"
                  maxLength={6}
                  pattern="[A-Z0-9]{1,6}"
                />
              </div>
              <Button type="submit" variant="primary" disabled={!canJoin} className="w-full" icon={<ArrowRight size={16} />}>
                进入房间
              </Button>
            </form>
          </ReadablePanel>

          <Surface variant="panel" padding="md">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--coc-on-surface-primary)]">
              <BookOpen size={16} className="text-[var(--coc-accent-gold)]" />
              当前索引
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DataCard label="故事" value={roomStats.total} tone="gold" />
              <DataCard label="主持" value={roomStats.hosting} />
              <DataCard label="参与" value={roomStats.playing} />
              <DataCard label="席位" value={roomStats.members} tone="ocean" />
            </div>
          </Surface>
        </div>
      }
      data-testid="room-list-page"
      layout="with-aside"
    >
        <main className="min-w-0 space-y-4">
          <Surface variant="panel" padding="md">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--coc-on-surface-muted)]" />
                <input
                  data-testid="room-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-[var(--coc-radius-control)] border border-[var(--coc-border-subtle)] bg-black/20 pl-9 pr-3 text-sm text-[var(--coc-on-surface-primary)] outline-none transition-colors placeholder:text-[var(--coc-on-surface-muted)] focus:border-[var(--coc-accent-gold)]"
                  placeholder="搜索故事名、房间号、简介..."
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5 rounded-[var(--coc-radius-card)] border border-[var(--coc-border-subtle)] bg-black/15 p-1 sm:grid-cols-4 xl:grid-cols-7">
                {filterLabels.map((filter) => {
                  const Icon = filter.icon;
                  const active = activeFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setActiveFilter(filter.value)}
                      className={cn(
                        'btn-v2 flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 text-xs transition-colors',
                        active
                          ? 'bg-[var(--coc-accent-gold)] text-[var(--coc-text-inverse)]'
                          : 'text-[var(--coc-on-surface-secondary)] hover:bg-[var(--coc-accent-gold)]/10 hover:text-[var(--coc-on-surface-primary)]'
                      )}
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
            <Surface variant="solid" padding="lg" className="min-h-[320px]">
              <EmptyState
                icon={EmptyIcons.Messages}
                title={rooms.length === 0 ? '暂无进行中的故事' : '没有匹配的故事'}
                description={rooms.length === 0 ? '创建或加入一个房间开始跑团。' : '换一个关键词，或切换筛选条件。'}
                action={
                  <Button variant="primary" onClick={() => setShowJoinModal(true)} icon={<DoorOpen size={15} />}>
                    输入房间号
                  </Button>
                }
              />
            </Surface>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {filteredRooms.map((room) => (
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
                  meta={
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Sparkles size={13} />
                        {roomLifecycleLabels[room.lifecycle]}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Shield size={13} />
                        {roomRoleLabels[room.myRole]}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users size={13} />
                        {getVisibleMemberCount(room)}
                        {typeof room.observerCount === 'number' && room.observerCount > 0
                          ? ` · 观察 ${room.observerCount}`
                          : ''}
                      </span>
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
                  className="h-full"
                />
              ))}
            </div>
          )}
        </main>
      </PageShell>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="开启新故事">
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#8b8375' }}>故事名称 *</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded bg-[#1a1a1a] border border-[#3a3a3a] text-[#e8d4a0] placeholder-[#6b6558] focus:border-[#c9a227]/50 focus:outline-none"
              placeholder="给这个故事起个名字"
              required
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#8b8375' }}>故事简介</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded bg-[#1a1a1a] border border-[#3a3a3a] text-[#e8d4a0] placeholder-[#6b6558] focus:border-[#c9a227]/50 focus:outline-none min-h-[100px] resize-none"
              placeholder="简要描述这个故事的背景"
              maxLength={200}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 rounded border border-[#3a3a3a] text-[#8b8375] hover:bg-[#1a1a1a] transition-colors"
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
          <div>
            <label className="block text-sm mb-1" style={{ color: '#8b8375' }}>房间号 *</label>
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded bg-[#1a1a1a] border border-[#3a3a3a] font-mono tracking-[0.18em] text-[#e8d4a0] placeholder-[#6b6558] focus:border-[#c9a227]/50 focus:outline-none"
              placeholder="输入6位房间号"
              required
              maxLength={6}
              pattern="[A-Z0-9]{1,6}"
            />
            <p className="text-xs mt-1" style={{ color: '#6b6558' }}>房间号由字母和数字组成。</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="flex-1 px-4 py-2 rounded border border-[#3a3a3a] text-[#8b8375] hover:bg-[#1a1a1a] transition-colors"
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
