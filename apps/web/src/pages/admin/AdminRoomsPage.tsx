import { useState, useEffect } from 'react';
import { Search, XCircle, Users, Crown, AlertTriangle } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Modal } from '@components/ui/Modal';

interface Room {
  id: string;
  roomId: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
  creator: {
    id: string;
    nickname: string;
  };
  memberCount: number;
}

export function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, [page, search, statusFilter]);

  const fetchRooms = async () => {
    try {
      let url = `/admin/rooms?page=${page}&limit=10&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      
      const response = await apiFetch(url);
      const data = await handleApiResponse<{ 
        rooms: Room[];
        pagination: { totalPages: number };
      }>(response);
      setRooms(data.rooms);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('获取房间列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRoom = async () => {
    if (!selectedRoom) return;
    
    try {
      const response = await apiFetch(`/admin/rooms/${selectedRoom.id}/close`, {
        method: 'POST',
      });
      await handleApiResponse(response);
      setShowCloseModal(false);
      setSelectedRoom(null);
      fetchRooms();
    } catch (error: any) {
      alert(error.message || '关闭房间失败');
    }
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
      <h1 className="text-2xl font-serif font-bold mb-6">房间管理</h1>

      {/* 搜索和筛选 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-coc-text-muted" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索房间名或房间号..."
            className="w-full coc-input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="coc-input"
        >
          <option value="">全部状态</option>
          <option value="ACTIVE">活跃</option>
          <option value="CLOSED">已关闭</option>
        </select>
      </div>

      {/* 房间列表 */}
      <div className="coc-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-coc-bg-tertiary">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">房间</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">创建者</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">成员</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">状态</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">创建时间</th>
              <th className="text-right p-4 text-sm font-medium text-coc-text-secondary">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-coc-border">
            {rooms.map((room) => (
              <tr key={room.id} className="hover:bg-coc-bg-tertiary/50">
                <td className="p-4">
                  <div>
                    <div className="font-medium">{room.name}</div>
                    <div className="text-sm text-coc-accent-gold">#{room.roomId}</div>
                    {room.description && (
                      <div className="text-sm text-coc-text-muted line-clamp-1">{room.description}</div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Crown size={14} className="text-coc-accent-gold" />
                    <span>{room.creator.nickname}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <Users size={14} className="text-coc-text-muted" />
                    <span>{room.memberCount}</span>
                  </div>
                </td>
                <td className="p-4">
                  {room.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      活跃
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-500/20 text-gray-400 rounded">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      已关闭
                    </span>
                  )}
                </td>
                <td className="p-4 text-sm text-coc-text-secondary">
                  {new Date(room.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    {room.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          setSelectedRoom(room);
                          setShowCloseModal(true);
                        }}
                        className="p-2 text-coc-text-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        title="强制关闭房间"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rooms.length === 0 && (
          <div className="text-center py-12 text-coc-text-muted">
            没有找到房间
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="coc-btn-secondary disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-coc-text-secondary">
            第 {page} / {totalPages} 页
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="coc-btn-secondary disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}

      {/* 关闭确认弹窗 */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => {
          setShowCloseModal(false);
          setSelectedRoom(null);
        }}
        title="确认关闭房间"
      >
        <div className="text-center py-4">
          <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
          <p className="text-coc-text-secondary mb-2">
            确定要强制关闭房间 <strong>{selectedRoom?.name}</strong> 吗？
          </p>
          <p className="text-sm text-coc-text-muted">
            房间号: #{selectedRoom?.roomId}
          </p>
          <p className="text-sm text-red-400 mt-2">
            此操作不可撤销，房间内所有成员将被踢出。
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setShowCloseModal(false);
                setSelectedRoom(null);
              }}
              className="coc-btn-secondary flex-1"
            >
              取消
            </button>
            <button
              onClick={handleCloseRoom}
              className="coc-btn-primary flex-1 bg-red-600 hover:bg-red-700"
            >
              确认关闭
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
