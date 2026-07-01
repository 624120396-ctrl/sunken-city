import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Compass,
  Crown,
  DoorOpen,
  Hash,
  Plus,
  Search,
  Shield,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { cn } from '@lib/utils';
import { Modal } from '@components/ui/Modal';
import { CthulhuCard3D } from '@components/ui/CthulhuCard3D';
import { EmptyIcons, EmptyState } from '@components/ui/EmptyState';
import { MagneticButton } from '@components/ui/MagneticButton';

interface Room {
  id: string;
  roomId: string;
  name: string;
  description?: string;
  memberCount: number;
  isCreator: boolean;
}

type RoomFilter = 'all' | 'hosting' | 'playing';

const filterLabels: Array<{ value: RoomFilter; label: string; icon: typeof BookOpen }> = [
  { value: 'all', label: '全部故事', icon: BookOpen },
  { value: 'hosting', label: '我主持', icon: Crown },
  { value: 'playing', label: '我参与', icon: UserRound },
];

function normalizeRoomId(value: string) {
  return value.trim().toUpperCase();
}

export function RoomListPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
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
      const data = await handleApiResponse<{ rooms: Room[] }>(response);
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
    const hosting = rooms.filter((room) => room.isCreator).length;
    return {
      total: rooms.length,
      hosting,
      playing: Math.max(rooms.length - hosting, 0),
      members: rooms.reduce((sum, room) => sum + room.memberCount, 0),
    };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rooms.filter((room) => {
      if (activeFilter === 'hosting' && !room.isCreator) return false;
      if (activeFilter === 'playing' && room.isCreator) return false;
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
    <div data-testid="room-list-page" className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-3 md:gap-5 md:p-5">
      <section className="relative overflow-hidden rounded-xl border border-[#3a3a3a]/45 bg-black/35 p-4 shadow-xl shadow-black/35 backdrop-blur-md md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(201,162,39,0.16),transparent_28%),radial-gradient(circle_at_90%_20%,rgba(139,38,53,0.18),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#8b8375]">
              <Compass size={14} className="text-[#c9a227]" />
              story gateway
            </div>
            <h1 className="font-ritual text-2xl font-bold tracking-wide text-[#f3d77a] md:text-3xl">故事书</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a69b85]">
              选择正在进行的跑团，或用房间号直接进入。移动端优先保证快速入房和参团路径。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <MagneticButton
              variant="void"
              size="sm"
              onClick={() => setShowJoinModal(true)}
              className="min-h-11 px-4"
            >
              <DoorOpen size={16} />
              加入故事
            </MagneticButton>
            <MagneticButton
              variant="gold"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="min-h-11 px-4"
            >
              <Plus size={16} />
              开启故事
            </MagneticButton>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 space-y-4">
          <section className="rounded-xl border border-[#3a3a3a]/40 bg-black/30 p-3 backdrop-blur-md md:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6558]" />
                <input
                  data-testid="room-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#3a3a3a]/55 bg-[#0f1016]/80 pl-9 pr-3 text-sm text-[#e8d4a0] outline-none transition-colors placeholder:text-[#6b6558] focus:border-[#c9a227]/55"
                  placeholder="搜索故事名、房间号、简介..."
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-[#3a3a3a]/45 bg-[#0f1016]/60 p-1">
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
                          ? 'bg-[#c9a227] text-[#0a0a0f]'
                          : 'text-[#b0a898] hover:bg-[#c9a227]/10 hover:text-[#e8d4a0]'
                      )}
                    >
                      <Icon size={14} />
                      <span className="hidden sm:inline">{filter.label}</span>
                      <span className="sm:hidden">{filter.label.replace('故事', '')}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {filteredRooms.length === 0 ? (
            <CthulhuCard3D variant="abyss" noTilt className="min-h-[320px]" innerClassName="h-full">
              <EmptyState
                icon={EmptyIcons.Messages}
                title={rooms.length === 0 ? '暂无进行中的故事' : '没有匹配的故事'}
                description={rooms.length === 0 ? '创建或加入一个房间开始跑团。' : '换一个关键词，或切换筛选条件。'}
                action={
                  <MagneticButton variant="gold" size="sm" onClick={() => setShowJoinModal(true)}>
                    <DoorOpen size={15} />
                    输入房间号
                  </MagneticButton>
                }
              />
            </CthulhuCard3D>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {filteredRooms.map((room, index) => (
                <CthulhuCard3D
                  key={room.id}
                  variant={room.isCreator ? 'gold' : index % 2 === 0 ? 'abyss' : 'blood'}
                  noTilt={false}
                  className="h-full"
                  innerClassName="h-full"
                >
                  <div
                    data-testid="room-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/rooms/${room.roomId}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') navigate(`/rooms/${room.roomId}`);
                    }}
                    className="group flex h-full min-h-[188px] cursor-pointer flex-col justify-between p-4 outline-none md:min-h-[210px] md:p-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#6b6558]">
                            <Hash size={12} />
                            {room.roomId}
                          </div>
                          <h2 className="mt-1 line-clamp-2 font-ritual text-lg font-bold leading-snug text-[#e8d4a0] transition-colors group-hover:text-[#f3d77a]">
                            {room.name}
                          </h2>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {room.isCreator && (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#c9a227]/35 bg-[#c9a227]/10 text-[#f3d77a]">
                              <Crown size={15} />
                            </span>
                          )}
                          <span className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3a3a3a]/50 bg-black/35 px-2 text-xs text-[#a69b85]">
                            <Users size={13} />
                            {room.memberCount}
                          </span>
                        </div>
                      </div>

                      <p className="line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-[#8b8375]">
                        {room.description || '尚未留下公开简介。故事的门已经开启，等待调查员踏入。'}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#3a3a3a]/35 pt-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0f1016]/70 px-2 py-1 text-xs text-[#8b8375]">
                        {room.isCreator ? <Shield size={13} /> : <Sparkles size={13} />}
                        {room.isCreator ? 'KP 主持' : '调查员席位'}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-medium text-[#a63848] transition-colors group-hover:text-[#f3d77a]">
                        进入房间
                        <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </CthulhuCard3D>
              ))}
            </div>
          )}
        </main>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <CthulhuCard3D variant="gold" noTilt innerClassName="p-4">
            <form data-testid="room-quick-join" onSubmit={handleJoinRoom} className="space-y-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#f3d77a]">
                  <DoorOpen size={16} />
                  快速进入
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#8b8375]">已有房间号时，直接进入跑团现场。</p>
              </div>
              <div className="relative">
                <Hash size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6558]" />
                <input
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  className="h-11 w-full rounded-lg border border-[#3a3a3a]/55 bg-[#0f1016]/80 pl-9 pr-3 font-mono text-sm tracking-[0.18em] text-[#e8d4a0] outline-none transition-colors placeholder:tracking-normal placeholder:text-[#6b6558] focus:border-[#c9a227]/55"
                  placeholder="ROOMID"
                  maxLength={6}
                  pattern="[A-Z0-9]{1,6}"
                />
              </div>
              <MagneticButton type="submit" variant="gold" size="sm" disabled={!canJoin} className="min-h-11 w-full">
                <ArrowRight size={16} />
                进入房间
              </MagneticButton>
            </form>
          </CthulhuCard3D>

          <CthulhuCard3D variant="abyss" noTilt innerClassName="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#e8d4a0]">
              <BookOpen size={16} className="text-[#c9a227]" />
              当前索引
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '故事', value: roomStats.total },
                { label: '主持', value: roomStats.hosting },
                { label: '参与', value: roomStats.playing },
                { label: '席位', value: roomStats.members },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-[#3a3a3a]/40 bg-[#0f1016]/60 p-3">
                  <div className="text-xl font-bold text-[#f3d77a]">{stat.value}</div>
                  <div className="mt-1 text-xs text-[#6b6558]">{stat.label}</div>
                </div>
              ))}
            </div>
          </CthulhuCard3D>
        </aside>
      </div>

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
            <MagneticButton type="submit" variant="gold" size="sm" className="flex-1">
              创建
            </MagneticButton>
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
            <MagneticButton type="submit" variant="gold" size="sm" disabled={!canJoin} className="flex-1">
              加入
            </MagneticButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
