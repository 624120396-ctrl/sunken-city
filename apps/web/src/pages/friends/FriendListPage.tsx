import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Trash2, Check, X, Search, BookOpen, User, Mail, Radio } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { apiFetch, handleApiResponse } from '@lib/api';
import { useAuthStore } from '@stores/auth.store';
import { cn, formatTimeAgo } from '@lib/utils';
import { Modal } from '@components/ui/Modal';
import { Button, PageShell, Surface, Tabs } from '@components/system';

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
  const onlineCount = friends.filter((f) => onlineFriends.has(f.userId)).length;
  const roomActiveCount = friends.filter((f) => friendRooms[f.userId]).length;

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
      <PageShell
        className="friend-social-page"
        eyebrow="调查员社交台"
        title="调查员社交"
        description="联系人、邀请、申请和同行状态会在这里汇总成一份可读档案。"
      >
        <Surface variant="panel" tone="ocean" material="archive" padding="lg" className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--coc-accent-blood)] border-t-transparent" />
        </Surface>
      </PageShell>
    );
  }

  return (
    <PageShell
      className="friend-social-page"
      eyebrow="调查员社交台"
      title="调查员社交"
      description="联系人、邀请、申请和同行状态会在这里汇总成一份可读档案。"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Mail size={18} />} onClick={() => navigate('/messages')}>
            进入消息中心
          </Button>
          <Button variant="primary" icon={<UserPlus size={18} />} onClick={() => setShowAddModal(true)}>
            添加联系人
          </Button>
        </div>
      }
    >
      <Surface variant="panel" material="archive" padding="md" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[var(--coc-accent-gold)]/45 to-transparent" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-[var(--coc-border-subtle)] bg-black/20 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--coc-accent-gold-strong)]">
                <User size={14} />
                联系人册
              </div>
              <div className="mt-2 text-2xl font-bold text-[var(--coc-text-primary)]">{friends.length}</div>
              <div className="mt-1 text-xs text-[var(--coc-text-muted)]">已同步调查员</div>
            </div>
            <div className="rounded-md border border-[var(--coc-border-subtle)] bg-black/20 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--coc-accent-gold-strong)]">
                <Radio size={14} />
                同行状态
              </div>
              <div className="mt-2 text-2xl font-bold text-[var(--coc-text-primary)]">{onlineCount}</div>
              <div className="mt-1 text-xs text-[var(--coc-text-muted)]">在线，{roomActiveCount} 位在房间</div>
            </div>
            <div className="rounded-md border border-[var(--coc-border-subtle)] bg-black/20 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--coc-accent-gold-strong)]">
                <UserPlus size={14} />
                待处理申请
              </div>
              <div className="mt-2 text-2xl font-bold text-[var(--coc-text-primary)]">{pendingReceived.length}</div>
              <div className="mt-1 text-xs text-[var(--coc-text-muted)]">需要你回应</div>
            </div>
          </div>

          <div className="grid gap-3">
          <Tabs
            ariaLabel="好友筛选"
            value={activeTab}
            onChange={(value) => setActiveTab(value as 'all' | 'online' | 'requests')}
            items={[
              { value: 'all', label: '联系人册', count: friends.length },
              { value: 'online', label: '同行状态', count: onlineCount },
              { value: 'requests', label: '待处理申请', count: pendingReceived.length },
            ]}
          />

          {(activeTab === 'all' || activeTab === 'online') ? (
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--coc-accent-gold)]/75" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索联系人昵称..."
                className="coc-focus-ring h-12 w-full rounded-[var(--coc-radius-control)] border border-[var(--coc-border-subtle)] bg-[#071016]/85 pl-11 pr-4 text-sm text-[var(--coc-text-primary)] shadow-inner shadow-black/40 placeholder:text-[var(--coc-text-muted)] focus:border-[var(--coc-accent-gold)]/55"
              />
            </div>
          ) : (
            <div className="hidden lg:block" />
          )}
          </div>
        </div>
      </Surface>

      {(activeTab === 'all' || activeTab === 'online') && (
        <>
          {filteredFriends.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.Friends}
              title={activeTab === 'online' ? '暂无在线联系人' : search ? '未找到匹配的联系人' : '暂无联系人'}
              description={search ? '尝试搜索其他关键词' : '添加常跑同伴，后续邀请和私信会更顺手。'}
              size="sm"
              animate={false}
            />
          ) : (
            <div className="coc-section-group mt-3">
              <div className="coc-section-group__header">
                <div>
                  <div className="text-xs font-bold text-[var(--coc-accent-gold-strong)]">联系人册</div>
                  <div className="mt-1 text-sm text-[var(--coc-text-secondary)]">
                    {activeTab === 'online' ? '当前在线联系人' : search ? '搜索结果' : '全部同步联系人'}
                  </div>
                </div>
                <span className="rounded border border-[var(--coc-border-subtle)] bg-black/25 px-3 py-1 text-xs text-[var(--coc-text-secondary)]">
                  {filteredFriends.length} 条记录
                </span>
              </div>
              <div className="coc-section-group__body">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 [@media(min-width:2200px)]:grid-cols-4">
                  {filteredFriends.map((friend) => {
                    const isOnline = onlineFriends.has(friend.userId);
                    const roomInfo = friendRooms[friend.userId];
                    return (
                      <Surface
                        key={friend.userId}
                        variant="panel"
                        tone={isOnline ? 'gold' : 'neutral'}
                        padding="md"
                        interactive
                        className="flex cursor-pointer flex-col gap-4 border-[var(--coc-border-subtle)]/80 bg-[#0b1218]/88"
                        onClick={() => setSelectedFriend(friend)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 shrink-0">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[var(--coc-border-subtle)] bg-black/30 text-lg font-bold text-[var(--coc-text-primary)]">
                              {friend.avatarUrl ? (
                                <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                friend.nickname[0]?.toUpperCase() || '?'
                              )}
                            </div>
                            <span
                              className={cn(
                                'absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--coc-surface-panel)]',
                                isOnline ? 'bg-emerald-400' : 'bg-[var(--coc-text-muted)]'
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-bold text-[var(--coc-text-primary)]">{friend.nickname}</div>
                            <div className="font-mono text-[10px] text-[#c9a227]">#{String(friend.displayId).padStart(8, '0')}</div>
                            <div className="truncate text-xs text-[var(--coc-text-secondary)]">
                              {isOnline ? (roomInfo ? `房间 ${roomInfo.roomId}` : '在线') : '离线'}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInviteRoom(friend.userId);
                            }}
                            className="flex-1"
                            icon={<BookOpen size={14} />}
                          >
                            邀进房
                          </Button>
                          <Button
                            variant="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFriend(friend.userId);
                            }}
                            className="text-[var(--coc-accent-blood)]"
                            aria-label={`删除好友 ${friend.nickname}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </Surface>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          {pendingReceived.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-[var(--coc-text-secondary)]">收到的待处理申请</h3>
              <div className="space-y-2">
                {pendingReceived.map((req) => (
                  <Surface key={req.id} variant="panel" padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--coc-border-subtle)] bg-black/30 font-bold">
                        {req.sender.avatarUrl ? (
                          <img src={req.sender.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          req.sender.nickname[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-[var(--coc-text-primary)]">{req.sender.nickname}</div>
                        <div className="font-mono text-[10px] text-[#c9a227]">#{String(req.sender.displayId).padStart(8, '0')}</div>
                        {req.message && <div className="text-xs text-[var(--coc-text-secondary)]">附言：{req.message}</div>}
                        <div className="text-[10px] text-[var(--coc-text-muted)]">{formatTimeAgo(req.createdAt)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAccept(req.id)}
                        disabled={processing}
                        icon={<Check size={14} />}
                      >
                        接受
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReject(req.id)}
                        disabled={processing}
                        icon={<X size={14} />}
                      >
                        拒绝
                      </Button>
                    </div>
                  </Surface>
                ))}
              </div>
            </div>
          )}

          {pendingSent.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-[var(--coc-text-secondary)]">已发出的申请</h3>
              <div className="space-y-2">
                {pendingSent.map((req) => (
                  <Surface key={req.id} variant="panel" padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--coc-border-subtle)] bg-black/30 font-bold">
                        {req.receiver.avatarUrl ? (
                          <img src={req.receiver.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          req.receiver.nickname[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-[var(--coc-text-primary)]">{req.receiver.nickname}</div>
                        <div className="font-mono text-[10px] text-[#c9a227]">#{String(req.receiver.displayId).padStart(8, '0')}</div>
                        <div className="text-[10px] text-[var(--coc-text-muted)]">{formatTimeAgo(req.createdAt)} · 等待回应</div>
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteRequest(req.id)}
                      disabled={processing}
                    >
                      撤回
                    </Button>
                  </Surface>
                ))}
              </div>
            </div>
          )}

          {pendingReceived.length === 0 && pendingSent.length === 0 && (
            <Surface variant="panel" padding="lg" className="py-12 text-center text-[var(--coc-text-secondary)]">
              暂无待处理申请
            </Surface>
          )}
        </div>
      )}

      {/* 添加联系人弹窗 */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="添加联系人">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#8b8375] mb-1">对方昵称</label>
            <input
              type="text"
              value={targetNickname}
              onChange={(e) => setTargetNickname(e.target.value)}
              className="w-full coc-input"
              placeholder="输入完整昵称"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8b8375] mb-1">附言（可选）</label>
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

      {/* 联系人资料卡弹窗 */}
      <Modal isOpen={!!selectedFriend} onClose={() => setSelectedFriend(null)} title="联系人档案">
        {selectedFriend && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 shrink-0">
                <div className="w-16 h-16 rounded-full bg-black/20 flex items-center justify-center text-xl font-bold overflow-hidden">
                  {selectedFriend.avatarUrl ? (
                    <img src={selectedFriend.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedFriend.nickname[0]?.toUpperCase() || '?'
                  )}
                </div>
              </div>
              <div>
                <div className="text-lg font-bold">{selectedFriend.nickname}</div>
                <div className="font-mono text-xs text-[#c9a227]">#{String(selectedFriend.displayId).padStart(8, '0')}</div>
                <div className="text-sm text-[#8b8375]">
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
    </PageShell>
  );
}
