import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Trash2, Check, X, Search, BookOpen, User } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { apiFetch, handleApiResponse } from '@lib/api';
import { useAuthStore } from '@stores/auth.store';
import { cn, formatTimeAgo } from '@lib/utils';
import { Modal } from '@components/ui/Modal';

interface Friend {
  friendshipId: string;
  userId: string;
  displayId: number;
  nickname: string;
  avatarUrl?: string;
  displayedTitleKey?: string;
  equippedFrame?: string;
  exp: number;
  displayedCharacterId?: string;
  createdAt: string;
}

interface FriendRequestItem {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  message?: string;
  createdAt: string;
  sender: {
    id: string;
    displayId: number;
    nickname: string;
    avatarUrl?: string;
    displayedTitleKey?: string;
  };
  receiver: {
    id: string;
    displayId: number;
    nickname: string;
    avatarUrl?: string;
    displayedTitleKey?: string;
  };
}

interface OnlineUserInfo {
  userId: string;
  nickname: string;
  roomId?: string;
  roomName?: string;
}

export function FriendListPage() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'requests'>('all');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<Set<string>>(new Set());
  const [friendRooms, setFriendRooms] = useState<Record<string, { roomId: string; roomName?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetNickname, setTargetNickname] = useState('');
  const [addMessage, setAddMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const socketRef = useState<Socket | null>(null);

  const fetchFriends = async () => {
    try {
      const res = await apiFetch('/friends');
      const data = await handleApiResponse<{ friends: Friend[] }>(res);
      setFriends(data.friends);
    } catch (e) {
      console.error('获取好友列表失败', e);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await apiFetch('/friends/requests?status=pending');
      const data = await handleApiResponse<{ requests: FriendRequestItem[] }>(res);
      setRequests(data.requests);
    } catch (e) {
      console.error('获取好友请求失败', e);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const res = await apiFetch('/online-users');
      const data = await handleApiResponse<{ users: OnlineUserInfo[] }>(res);
      const onlineSet = new Set(data.users.map((u) => u.userId));
      const roomMap: Record<string, { roomId: string; roomName?: string }> = {};
      data.users.forEach((u) => {
        if (u.roomId) {
          roomMap[u.userId] = { roomId: u.roomId, roomName: u.roomName };
        }
      });
      setOnlineFriends(onlineSet);
      setFriendRooms(roomMap);
    } catch (e) {
      console.error('获取在线用户失败', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchFriends(), fetchRequests(), fetchOnlineUsers()]);
      setLoading(false);
    };
    init();
  }, []);

  // Socket 监听好友状态更新
  useEffect(() => {
    if (!token) return;
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io',
    });
    socketRef[1](socket);

    socket.on('friend:status_update', (payload: any) => {
      setOnlineFriends((prev) => {
        const next = new Set(prev);
        if (payload.isOnline) {
          next.add(payload.userId);
        } else {
          next.delete(payload.userId);
        }
        return next;
      });
      setFriendRooms((prev) => {
        const next = { ...prev };
        if (!payload.isOnline) {
          delete next[payload.userId];
        } else if (payload.roomId) {
          next[payload.userId] = { roomId: payload.roomId, roomName: payload.roomName };
        } else {
          delete next[payload.userId];
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const filteredFriends = useMemo(() => {
    let list = friends;
    if (activeTab === 'online') {
      list = friends.filter((f) => onlineFriends.has(f.userId));
    }
    if (search.trim()) {
      list = list.filter((f) => f.nickname.toLowerCase().includes(search.trim().toLowerCase()));
    }
    return list;
  }, [friends, activeTab, onlineFriends, search]);

  const pendingReceived = requests.filter((r) => r.receiverId === user?.id && r.status === 'pending');
  const pendingSent = requests.filter((r) => r.senderId === user?.id && r.status === 'pending');

  const handleAddFriend = async () => {
    if (!targetNickname.trim()) return;
    setProcessing(true);
    try {
      // 先搜索用户获取ID（这里简化：假设用户输入昵称精确匹配或我们通过搜索API找到）
      // 但当前后端没有用户搜索API，所以我们先尝试通过论坛或在线列表获取...
      // 由于实际缺少用户搜索API，这里用论坛搜索workaround，或者新增一个简单搜索接口更优雅。
      // 为了先让功能跑通，我们直接使用/api/users/search?nickname=xxx（需要在后端新增路由）
      const searchRes = await apiFetch(`/users/search?nickname=${encodeURIComponent(targetNickname.trim())}`);
      const searchData = await handleApiResponse<{ users: { id: string; nickname: string }[] }>(searchRes);
      if (!searchData.users?.length) {
        alert('未找到该用户');
        setProcessing(false);
        return;
      }
      const target = searchData.users[0];
      const res = await apiFetch('/friends/requests', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: target.id, message: addMessage }),
      });
      await handleApiResponse(res);
      setShowAddModal(false);
      setTargetNickname('');
      setAddMessage('');
      fetchRequests();
    } catch (e: any) {
      alert(e.message || '发送请求失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleAccept = async (id: string) => {
    setProcessing(true);
    try {
      await apiFetch(`/friends/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'accepted' }),
      });
      fetchRequests();
      fetchFriends();
    } catch (e: any) {
      alert(e.message || '操作失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(true);
    try {
      await apiFetch(`/friends/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' }),
      });
      fetchRequests();
    } catch (e: any) {
      alert(e.message || '操作失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    setProcessing(true);
    try {
      await apiFetch(`/friends/requests/${id}`, { method: 'DELETE' });
      fetchRequests();
    } catch (e: any) {
      alert(e.message || '删除失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    if (!confirm('确定要删除这位好友吗？')) return;
    setProcessing(true);
    try {
      await apiFetch(`/friends/${userId}`, { method: 'DELETE' });
      fetchFriends();
    } catch (e: any) {
      alert(e.message || '删除失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleInviteRoom = async (friendUserId: string) => {
    const roomId = prompt('请输入要邀请好友进入的房间号：');
    if (!roomId) return;
    try {
      await apiFetch('/friends/invite-room', {
        method: 'POST',
        body: JSON.stringify({ roomId, targetUserId: friendUserId }),
      });
      alert('邀请已发送');
    } catch (e: any) {
      alert(e.message || '邀请失败');
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
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="text-coc-accent-red" size={28} />
          <h1 className="text-2xl font-serif font-bold">我的好友</h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="coc-btn-primary flex items-center gap-2">
          <UserPlus size={18} />
          添加好友
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-coc-border pb-2">
        {[
          { key: 'all', label: `全部好友 (${friends.length})` },
          { key: 'online', label: `在线 (${friends.filter((f) => onlineFriends.has(f.userId)).length})` },
          { key: 'requests', label: `请求 (${pendingReceived.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              'px-4 py-2 text-sm rounded-t transition-colors',
              activeTab === tab.key
                ? 'text-coc-accent-red border-b-2 border-coc-accent-red'
                : 'text-coc-text-secondary hover:text-coc-text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === 'all' || activeTab === 'online') && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-coc-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索好友昵称..."
              className="w-full coc-input pl-10"
            />
          </div>

          {filteredFriends.length === 0 ? (
            <div className="text-center py-12 text-coc-text-muted">
              {activeTab === 'online' ? '暂无在线好友' : search ? '未找到匹配的好友' : '暂无好友，快去添加吧'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map((friend) => {
                const isOnline = onlineFriends.has(friend.userId);
                const roomInfo = friendRooms[friend.userId];
                return (
                  <div
                    key={friend.userId}
                    className="coc-card p-4 flex flex-col gap-3 cursor-pointer hover:border-coc-accent-red/50 transition-colors"
                    onClick={() => setSelectedFriend(friend)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 shrink-0">
                        <div className="w-12 h-12 rounded-full bg-coc-bg-tertiary flex items-center justify-center text-lg font-bold overflow-hidden">
                          {friend.avatarUrl ? (
                            <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            friend.nickname[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        <span
                          className={cn(
                            'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-coc-bg-secondary',
                            isOnline ? 'bg-green-500' : 'bg-coc-text-muted'
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{friend.nickname}</div>
                        <div className="font-mono text-[10px] text-coc-gold">#{String(friend.displayId).padStart(8, '0')}</div>
                        <div className="text-xs text-coc-text-secondary truncate">
                          {isOnline ? (roomInfo ? `房间 ${roomInfo.roomId}` : '在线') : '离线'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInviteRoom(friend.userId);
                        }}
                        className="flex-1 coc-btn-secondary text-xs py-1.5 flex items-center justify-center gap-1"
                      >
                        <BookOpen size={14} /> 邀进房
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFriend(friend.userId);
                        }}
                        className="px-2 py-1.5 text-red-400 hover:bg-red-400/10 rounded border border-coc-border text-xs"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          {pendingReceived.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-coc-text-secondary mb-2">收到的好友请求</h3>
              <div className="space-y-2">
                {pendingReceived.map((req) => (
                  <div key={req.id} className="coc-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-coc-bg-tertiary flex items-center justify-center font-bold">
                        {req.sender.avatarUrl ? (
                          <img src={req.sender.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          req.sender.nickname[0]?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-bold">{req.sender.nickname}</div>
                        <div className="font-mono text-[10px] text-coc-gold">#{String(req.sender.displayId).padStart(8, '0')}</div>
                        {req.message && <div className="text-xs text-coc-text-muted">附言：{req.message}</div>}
                        <div className="text-[10px] text-coc-text-muted">{formatTimeAgo(req.createdAt)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(req.id)}
                        disabled={processing}
                        className="coc-btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <Check size={14} /> 接受
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={processing}
                        className="coc-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <X size={14} /> 拒绝
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingSent.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-coc-text-secondary mb-2">已发送的请求</h3>
              <div className="space-y-2">
                {pendingSent.map((req) => (
                  <div key={req.id} className="coc-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-coc-bg-tertiary flex items-center justify-center font-bold">
                        {req.receiver.avatarUrl ? (
                          <img src={req.receiver.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          req.receiver.nickname[0]?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-bold">{req.receiver.nickname}</div>
                        <div className="font-mono text-[10px] text-coc-gold">#{String(req.receiver.displayId).padStart(8, '0')}</div>
                        <div className="text-[10px] text-coc-text-muted">{formatTimeAgo(req.createdAt)} · 等待回应</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRequest(req.id)}
                      disabled={processing}
                      className="text-xs text-red-400 hover:bg-red-400/10 px-3 py-1.5 rounded border border-coc-border"
                    >
                      撤回
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingReceived.length === 0 && pendingSent.length === 0 && (
            <div className="text-center py-12 text-coc-text-muted">暂无待处理的好友请求</div>
          )}
        </div>
      )}

      {/* 添加好友弹窗 */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="添加好友">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">对方昵称</label>
            <input
              type="text"
              value={targetNickname}
              onChange={(e) => setTargetNickname(e.target.value)}
              className="w-full coc-input"
              placeholder="输入完整昵称"
            />
          </div>
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">附言（可选）</label>
            <input
              type="text"
              value={addMessage}
              onChange={(e) => setAddMessage(e.target.value)}
              className="w-full coc-input"
              placeholder="例如：上周一起跑团的PL"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddModal(false)} className="coc-btn-secondary flex-1">
              取消
            </button>
            <button
              onClick={handleAddFriend}
              disabled={processing || !targetNickname.trim()}
              className="coc-btn-primary flex-1"
            >
              {processing ? '发送中...' : '发送请求'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 好友资料卡弹窗 */}
      <Modal isOpen={!!selectedFriend} onClose={() => setSelectedFriend(null)} title="好友资料">
        {selectedFriend && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 shrink-0">
                <div className="w-16 h-16 rounded-full bg-coc-bg-tertiary flex items-center justify-center text-xl font-bold overflow-hidden">
                  {selectedFriend.avatarUrl ? (
                    <img src={selectedFriend.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedFriend.nickname[0]?.toUpperCase() || '?'
                  )}
                </div>
              </div>
              <div>
                <div className="text-lg font-bold">{selectedFriend.nickname}</div>
                <div className="font-mono text-xs text-coc-gold">#{String(selectedFriend.displayId).padStart(8, '0')}</div>
                <div className="text-sm text-coc-text-secondary">
                  {onlineFriends.has(selectedFriend.userId) ? '在线' : '离线'} · EXP {selectedFriend.exp}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleInviteRoom(selectedFriend.userId);
                  setSelectedFriend(null);
                }}
                className="coc-btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <BookOpen size={16} /> 邀请进房
              </button>
              <button
                onClick={() => {
                  navigate(`/profile?userId=${selectedFriend.userId}`);
                  setSelectedFriend(null);
                }}
                className="coc-btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <User size={16} /> 查看主页
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
