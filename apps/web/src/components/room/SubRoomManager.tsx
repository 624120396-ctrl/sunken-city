import { useState, useEffect } from 'react';
import { X, GitBranch, Users, Plus, LogOut, Trash2, MessageSquare } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { Modal } from '@components/ui/Modal';

interface SubRoom {
  id: string;
  name: string;
  description?: string;
  atmosphere: string;
  timeMode: string;
  status: string;
  memberCount: number;
  members: Array<{ userId: string; nickname: string; avatarUrl?: string }>;
  lastMessage?: { content: string; timestamp: string } | null;
  isMember: boolean;
}

interface SubRoomManagerProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  isKP: boolean;
  members: Array<{ userId: string; nickname: string; avatarUrl?: string }>;
}

export function SubRoomManager({ roomId, isOpen, onClose, isKP, members }: SubRoomManagerProps) {
  const [subRooms, setSubRooms] = useState<SubRoom[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  // 创建表单
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAtmosphere, setFormAtmosphere] = useState('normal');
  const [formTimeMode, setFormTimeMode] = useState('sync');
  const [formSceneDesc, setFormSceneDesc] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !roomId) return;
    loadSubRooms();
    const interval = setInterval(loadSubRooms, 5000);
    return () => clearInterval(interval);
  }, [isOpen, roomId]);

  async function loadSubRooms() {
    try {
      const res = await apiFetch(`/api/rooms/${roomId}/sub-rooms`);
      const json = await res.json();
      if (json.success) {
        setSubRooms(json.data.subRooms || []);
      }
    } catch (err) {
      console.error('加载子房间失败:', err);
    }
  }

  async function createSubRoom() {
    if (!formName.trim()) return;
    try {
      const res = await apiFetch(`/api/rooms/${roomId}/sub-rooms`, {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc,
          atmosphere: formAtmosphere,
          timeMode: formTimeMode,
          sceneDesc: formSceneDesc,
          participantUserIds: selectedParticipants,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreate(false);
        setFormName('');
        setFormDesc('');
        setFormSceneDesc('');
        setSelectedParticipants([]);
        loadSubRooms();
      }
    } catch (err) {
      console.error('创建子房间失败:', err);
    }
  }

  async function joinSubRoom(subRoomId: string) {
    try {
      await apiFetch(`/api/rooms/${roomId}/sub-rooms/${subRoomId}/join`, { method: 'POST' });
      loadSubRooms();
    } catch (err) {
      console.error('加入子房间失败:', err);
    }
  }

  async function leaveSubRoom(subRoomId: string) {
    try {
      await apiFetch(`/api/rooms/${roomId}/sub-rooms/${subRoomId}/leave`, { method: 'POST' });
      loadSubRooms();
    } catch (err) {
      console.error('离开子房间失败:', err);
    }
  }

  async function dissolveSubRoom(subRoomId: string) {
    if (!confirm('确定要解散此子房间吗？成员将返回主房间。')) return;
    try {
      await apiFetch(`/api/rooms/${roomId}/sub-rooms/${subRoomId}/dissolve`, { method: 'POST' });
      loadSubRooms();
    } catch (err) {
      console.error('解散子房间失败:', err);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="w-[360px] backdrop-blur-md bg-black/40 border-l border-[#3a3a3a]/40 flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#3a3a3a]/30">
        <div className="flex items-center gap-2 text-sm text-[#e8d4a0]">
          <GitBranch size={14} className="text-coc-ether" />
          <span className="font-ritual">子房间</span>
        </div>
        <div className="flex items-center gap-1">
          {isKP && (
            <button
              onClick={() => setShowCreate(true)}
              className="p-1 text-[#c9a227] hover:text-coc-gold/80 transition-colors"
            >
              <Plus size={16} />
            </button>
          )}
          <button onClick={onClose} className="p-1 text-[#6b6558] hover:text-[#e8d4a0] transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 子房间列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {subRooms.length === 0 && (
          <EmptyState
            icon={EmptyIcons.Investigator}
            title="暂无子房间"
            description={isKP ? 'KP 可创建子房间进行场景隔离' : '等待 KP 创建子房间'}
            size="sm"
            animate={false}
          />
        )}
        {subRooms.map(sub => (
          <div
            key={sub.id}
            className={`p-2.5 rounded-lg border transition-colors ${
              sub.isMember
                ? 'bg-coc-bg-elevated/30 border-coc-gold/20'
                : 'bg-coc-bg-elevated/10 border-[#3a3a3a]/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="font-ritual text-sm text-[#e8d4a0]">{sub.name}</span>
                <span
                  className="text-[9px] px-1 py-0.5 rounded"
                  style={{
                    background: sub.timeMode === 'sync' ? 'rgba(201,162,39,0.15)' : sub.timeMode === 'paused' ? 'rgba(100,80,160,0.25)' : 'rgba(40,40,60,0.5)',
                    color: sub.timeMode === 'sync' ? '#c9a227' : sub.timeMode === 'paused' ? '#b8a8e0' : '#8888a0',
                  }}
                >
                  {sub.timeMode}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {sub.isMember ? (
                  <button
                    onClick={() => leaveSubRoom(sub.id)}
                    className="p-0.5 text-[#6b6558] hover:text-[#a63848] transition-colors"
                  >
                    <LogOut size={12} />
                  </button>
                ) : (
                  <button
                    onClick={() => joinSubRoom(sub.id)}
                    className="px-1.5 py-0.5 text-[10px] bg-coc-gold/10 text-[#c9a227] border border-coc-gold/20 rounded hover:bg-coc-gold/20 transition-colors"
                  >
                    加入
                  </button>
                )}
                {isKP && (
                  <button
                    onClick={() => dissolveSubRoom(sub.id)}
                    className="p-0.5 text-[#6b6558] hover:text-[#a63848] transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            {sub.description && (
              <p className="text-[10px] text-[#6b6558] line-clamp-1 mb-1">{sub.description}</p>
            )}
            <div className="flex items-center justify-between text-[10px] text-[#6b6558]">
              <div className="flex items-center gap-1">
                <Users size={10} />
                <span>{sub.memberCount} 人</span>
                {sub.members.slice(0, 3).map(m => (
                  <span key={m.userId} className="text-coc-text/60">{m.nickname}</span>
                ))}
              </div>
              {sub.lastMessage && (
                <div className="flex items-center gap-0.5">
                  <MessageSquare size={9} />
                  <span className="truncate max-w-[80px]">{sub.lastMessage.content}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 创建弹窗 */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="创建子房间">
        <div className="space-y-3 w-[320px]">
          <input
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder="子房间名称"
            className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-sm text-[#e8d4a0] placeholder:text-[#6b6558] focus:border-coc-gold focus:outline-none"
          />
          <textarea
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
            placeholder="描述（可选）"
            rows={2}
            className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-sm text-[#e8d4a0] placeholder:text-[#6b6558] focus:border-coc-gold focus:outline-none resize-none"
          />
          <textarea
            value={formSceneDesc}
            onChange={e => setFormSceneDesc(e.target.value)}
            placeholder="场景描述（可选）"
            rows={2}
            className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-sm text-[#e8d4a0] placeholder:text-[#6b6558] focus:border-coc-gold focus:outline-none resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={formAtmosphere}
              onChange={e => setFormAtmosphere(e.target.value)}
              className="px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-xs text-[#e8d4a0]"
            >
              <option value="normal">正常</option>
              <option value="dark">黑暗</option>
              <option value="horror">恐怖</option>
              <option value="mystery">神秘</option>
            </select>
            <select
              value={formTimeMode}
              onChange={e => setFormTimeMode(e.target.value)}
              className="px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-xs text-[#e8d4a0]"
            >
              <option value="sync">时间同步</option>
              <option value="paused">时间暂停</option>
              <option value="independent">独立时间</option>
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-[#6b6558]">邀请参与者</div>
            <div className="flex flex-wrap gap-1">
              {members.filter(m => m.userId).map(m => (
                <button
                  key={m.userId}
                  onClick={() => {
                    if (selectedParticipants.includes(m.userId)) {
                      setSelectedParticipants(selectedParticipants.filter(id => id !== m.userId));
                    } else {
                      setSelectedParticipants([...selectedParticipants, m.userId]);
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                    selectedParticipants.includes(m.userId)
                      ? 'bg-coc-gold/20 text-[#c9a227] border border-coc-gold/20'
                      : 'bg-coc-bg-elevated/20 text-[#6b6558] border border-[#3a3a3a]/20'
                  }`}
                >
                  {m.nickname}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={createSubRoom}
            disabled={!formName.trim()}
            className="w-full py-1.5 text-sm bg-coc-gold text-coc-abyss rounded font-medium hover:bg-coc-gold/80 disabled:opacity-30 transition-colors"
          >
            创建
          </button>
        </div>
      </Modal>
    </div>
  );
}
