import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Crown, ArrowRight, DoorOpen } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Modal } from '@components/ui/Modal';

interface Room {
  id: string;
  roomId: string;
  name: string;
  description?: string;
  memberCount: number;
  isCreator: boolean;
}

export function RoomListPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
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
      setRooms(data.rooms);
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
    if (!joinRoomId.trim()) return;
    navigate(`/rooms/${joinRoomId.trim().toUpperCase()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#c9a227] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-serif font-bold" style={{ color: '#c9a227' }}>故事书</h1>
          <div 
            className="w-16 h-[1px]" 
            style={{ background: 'linear-gradient(90deg, rgba(201,162,39,0.6) 0%, transparent 100%)' }} 
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="btn-v2 flex items-center gap-2 px-4 py-2 border border-[#c9a227]/30 
                       text-[#c9a227] rounded hover:bg-[#c9a227]/10 transition-colors"
          >
            <DoorOpen size={18} />
            加入故事
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-v2 flex items-center gap-2 px-4 py-2 bg-[#c9a227] text-[#0a0a0f] 
                       rounded hover:bg-[#e8d4a0] transition-colors font-medium"
          >
            <Plus size={18} />
            开启故事
          </button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 
                        border border-[#3a3a3a]/40 rounded-lg backdrop-blur-md bg-black/40
                        shadow-lg shadow-black/40">
          <div className="text-4xl mb-4 opacity-60">📖</div>
          <p className="font-ritual text-lg" style={{ color: '#e8d4a0' }}>暂无进行中的故事</p>
          <p className="text-sm mt-2" style={{ color: '#6b6558' }}>创建或加入一个房间开始跑团</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => navigate(`/rooms/${room.roomId}`)}
              className="group relative border border-[#3a3a3a]/40 rounded-lg p-5 
                         backdrop-blur-md bg-black/40 cursor-pointer
                         hover:border-[#c9a227]/50 hover:bg-black/50
                         shadow-lg shadow-black/40
                         transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg transition-colors group-hover:text-[#c9a227]" 
                      style={{ color: '#e8d4a0' }}>
                    {room.name}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: '#6b6558' }}>
                    #{room.roomId}
                  </p>
                  {room.description && (
                    <p className="text-sm mt-2 line-clamp-2" style={{ color: '#8b8375' }}>
                      {room.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {room.isCreator && (
                    <Crown size={16} style={{ color: '#c9a227' }} />
                  )}
                  <div className="flex items-center gap-1 text-sm" style={{ color: '#a69b85' }}>
                    <Users size={14} />
                    {room.memberCount}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end">
                <span className="text-sm flex items-center gap-1 transition-colors group-hover:text-[#c9a227]" 
                      style={{ color: '#a63848' }}>
                  进入房间
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>

              {/* hover 金色光边 */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 
                              transition-opacity duration-500 pointer-events-none"
                   style={{ 
                     background: 'linear-gradient(135deg, rgba(201,162,39,0.03) 0%, transparent 50%)',
                     border: '1px solid rgba(201,162,39,0.15)'
                   }} 
              />
            </div>
          ))}
        </div>
      )}

      {/* 创建房间弹窗 */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="开启新故事">
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#8b8375' }}>故事名称 *</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded bg-[#1a1a1a] border border-[#3a3a3a] 
                         text-[#e8d4a0] placeholder-[#6b6558] focus:border-[#c9a227]/50 focus:outline-none"
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
              className="w-full px-3 py-2 rounded bg-[#1a1a1a] border border-[#3a3a3a] 
                         text-[#e8d4a0] placeholder-[#6b6558] focus:border-[#c9a227]/50 focus:outline-none min-h-[100px] resize-none"
              placeholder="简要描述这个故事的背景"
              maxLength={200}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 rounded border border-[#3a3a3a] text-[#8b8375] 
                         hover:bg-[#1a1a1a] transition-colors"
            >
              取消
            </button>
            <button 
              type="submit" 
              className="flex-1 px-4 py-2 rounded bg-[#c9a227] text-[#0a0a0f] font-medium
                         hover:bg-[#e8d4a0] transition-colors"
            >
              创建
            </button>
          </div>
        </form>
      </Modal>

      {/* 加入房间弹窗 */}
      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="加入故事">
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#8b8375' }}>房间号 *</label>
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded bg-[#1a1a1a] border border-[#3a3a3a] 
                         text-[#e8d4a0] placeholder-[#6b6558] focus:border-[#c9a227]/50 focus:outline-none"
              placeholder="输入6位房间号"
              required
              maxLength={6}
              pattern="[A-Z0-9]{6}"
            />
            <p className="text-xs mt-1" style={{ color: '#6b6558' }}>房间号由6位字母和数字组成</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="flex-1 px-4 py-2 rounded border border-[#3a3a3a] text-[#8b8375] 
                         hover:bg-[#1a1a1a] transition-colors"
            >
              取消
            </button>
            <button 
              type="submit" 
              className="flex-1 px-4 py-2 rounded bg-[#c9a227] text-[#0a0a0f] font-medium
                         hover:bg-[#e8d4a0] transition-colors"
            >
              加入
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
