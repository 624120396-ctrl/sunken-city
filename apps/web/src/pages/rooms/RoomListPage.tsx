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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-coc-accent-red border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold">故事书</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="coc-btn-secondary flex items-center gap-2"
          >
            <DoorOpen size={18} />
            加入故事
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="coc-btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            开启故事
          </button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="coc-card text-center py-16">
          <div className="text-4xl mb-4">📖</div>
          <p className="text-coc-text-secondary">暂无进行中的故事</p>
          <p className="text-sm text-coc-text-muted mt-2">创建或加入一个房间开始跑团</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => navigate(`/rooms/${room.roomId}`)}
              className="coc-card hover:border-coc-accent-red transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg group-hover:text-coc-accent-red transition-colors">
                    {room.name}
                  </h3>
                  <p className="text-sm text-coc-text-secondary mt-1">
                    #{room.roomId}
                  </p>
                  {room.description && (
                    <p className="text-sm text-coc-text-muted mt-2 line-clamp-2">
                      {room.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {room.isCreator && (
                    <Crown size={16} className="text-coc-accent-gold" />
                  )}
                  <div className="flex items-center gap-1 text-sm text-coc-text-secondary">
                    <Users size={14} />
                    {room.memberCount}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end">
                <span className="text-sm text-coc-accent-red flex items-center gap-1">
                  进入房间
                  <ArrowRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建房间弹窗 */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="开启新故事">
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">故事名称 *</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full coc-input"
              placeholder="给这个故事起个名字"
              required
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">故事简介</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full coc-input min-h-[100px]"
              placeholder="简要描述这个故事的背景"
              maxLength={200}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="coc-btn-secondary flex-1"
            >
              取消
            </button>
            <button type="submit" className="coc-btn-primary flex-1">
              创建
            </button>
          </div>
        </form>
      </Modal>

      {/* 加入房间弹窗 */}
      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="加入故事">
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">房间号 *</label>
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              className="w-full coc-input"
              placeholder="输入6位房间号"
              required
              maxLength={6}
              pattern="[A-Z0-9]{6}"
            />
            <p className="text-xs text-coc-text-muted mt-1">房间号由6位字母和数字组成</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="coc-btn-secondary flex-1"
            >
              取消
            </button>
            <button type="submit" className="coc-btn-primary flex-1">
              加入
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}