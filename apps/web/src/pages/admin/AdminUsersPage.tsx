import { useState, useEffect } from 'react';
import { Search, Shield, ShieldOff, Trash2, UserX, Coins, Sparkles, Edit3, Gift } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Modal } from '@components/ui/Modal';
import { AdminTableSkeleton } from '@components/admin/AdminTableSkeleton';

interface User {
  id: string;
  displayId: number;
  nickname: string;
  email: string;
  level: number;
  exp: number;
  coins: number;
  stardust: number;
  isAdmin: boolean;
  createdAt: string;
  _count: {
    characters: number;
    diceRolls: number;
  };
}

interface ShopItem {
  id: string;
  key: string;
  name: string;
  category: string;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencyForm, setCurrencyForm] = useState({ coins: 0, stardust: 0, exp: 0 });
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [grantForm, setGrantForm] = useState({ itemKey: '', quantity: 1, reason: '' });
  const [savingGrant, setSavingGrant] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const fetchUsers = async () => {
    try {
      const response = await apiFetch(`/admin/users?page=${page}&limit=10&search=${encodeURIComponent(search)}`);
      const data = await handleApiResponse<{ 
        users: User[];
        pagination: { totalPages: number };
      }>(response);
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShopItems = async () => {
    try {
      const res = await apiFetch('/admin/shop/items?limit=200');
      const data = await res.json();
      if (data.success) setShopItems(data.data.items);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAdmin = async (user: User) => {
    try {
      const response = await apiFetch(`/admin/users/${user.id}/admin`, {
        method: 'PATCH',
        body: JSON.stringify({ isAdmin: !user.isAdmin }),
      });
      await handleApiResponse(response);
      fetchUsers();
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await apiFetch(`/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
      });
      await handleApiResponse(response);
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      alert(error.message || '删除失败');
    }
  };

  const openCurrencyModal = (user: User) => {
    setSelectedUser(user);
    setCurrencyForm({
      coins: user.coins ?? 0,
      stardust: user.stardust ?? 0,
      exp: user.exp ?? 0,
    });
    setShowCurrencyModal(true);
  };

  const openGrantModal = (user: User) => {
    setSelectedUser(user);
    setGrantForm({ itemKey: '', quantity: 1, reason: '' });
    setShowGrantModal(true);
    fetchShopItems();
  };

  const handleSaveCurrency = async () => {
    if (!selectedUser) return;
    try {
      setSavingCurrency(true);
      const response = await apiFetch(`/admin/users/${selectedUser.id}/currency`, {
        method: 'PATCH',
        body: JSON.stringify(currencyForm),
      });
      await handleApiResponse(response);
      setShowCurrencyModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      alert(error.message || '修改失败');
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleGrantItem = async () => {
    if (!selectedUser) return;
    if (!grantForm.itemKey) return alert('请选择商品');
    try {
      setSavingGrant(true);
      const response = await apiFetch('/admin/items/grant', {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedUser.id,
          itemKey: grantForm.itemKey,
          quantity: grantForm.quantity,
          reason: grantForm.reason,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      alert(data.message);
      setShowGrantModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      alert(error.message || '发放失败');
    } finally {
      setSavingGrant(false);
    }
  };

  if (loading) {
    return <AdminTableSkeleton rows={6} cols={5} />;
  }

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold mb-6">用户管理</h1>

      {/* 搜索 */}
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
            placeholder="搜索ID、昵称或邮箱..."
            className="w-full coc-input pl-10"
          />
        </div>
      </div>

      {/* 用户列表 */}
      <div className="coc-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-coc-bg-tertiary">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">ID</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">用户</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">位阶</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">货币</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">角色卡</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">投骰</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">注册时间</th>
              <th className="text-left p-4 text-sm font-medium text-coc-text-secondary">管理员</th>
              <th className="text-right p-4 text-sm font-medium text-coc-text-secondary">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-coc-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-coc-bg-tertiary/50">
                <td className="p-4">
                  <span className="font-mono text-xs text-coc-gold">#{String(user.displayId).padStart(8, '0')}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-coc-accent-red/20 flex items-center justify-center text-coc-accent-red font-bold">
                      {user.nickname[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{user.nickname}</div>
                      <div className="text-sm text-coc-text-muted">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-coc-accent-gold">位阶 {user.level}</span>
                  <div className="text-xs text-coc-text-muted">{user.exp} SP</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-coc-gold">
                      <Coins size={14} /> {user.coins ?? 0}
                    </div>
                    <div className="flex items-center gap-1 text-purple-400">
                      <Sparkles size={14} /> {user.stardust ?? 0}
                    </div>
                  </div>
                </td>
                <td className="p-4">{user._count.characters}</td>
                <td className="p-4">{user._count.diceRolls}</td>
                <td className="p-4 text-sm text-coc-text-secondary">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4">
                  {user.isAdmin ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-coc-accent-gold/20 text-coc-accent-gold rounded">
                      <Shield size={12} /> 管理员
                    </span>
                  ) : (
                    <span className="text-xs text-coc-text-muted">普通用户</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openGrantModal(user)}
                      className="p-2 text-coc-text-muted hover:text-coc-accent-gold hover:bg-coc-accent-gold/10 rounded transition-colors"
                      title="发放道具"
                    >
                      <Gift size={16} />
                    </button>
                    <button
                      onClick={() => openCurrencyModal(user)}
                      className="p-2 text-coc-text-muted hover:text-coc-accent-gold hover:bg-coc-accent-gold/10 rounded transition-colors"
                      title="编辑货币"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleAdmin(user)}
                      className={`p-2 rounded transition-colors ${
                        user.isAdmin 
                          ? 'text-coc-accent-gold hover:bg-coc-accent-gold/10' 
                          : 'text-coc-text-muted hover:text-coc-accent-gold hover:bg-coc-accent-gold/10'
                      }`}
                      title={user.isAdmin ? '取消管理员' : '设为管理员'}
                    >
                      {user.isAdmin ? <Shield size={16} /> : <ShieldOff size={16} />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-coc-text-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      title="删除用户"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-coc-text-muted">
            没有找到用户
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

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="确认删除用户"
      >
        <div className="text-center py-4">
          <UserX size={48} className="mx-auto text-red-400 mb-4" />
          <p className="text-coc-text-secondary mb-2">
            确定要删除用户 <strong>{selectedUser?.nickname}</strong> 吗？
          </p>
          <p className="text-sm text-red-400">
            此操作不可撤销，该用户的所有角色卡和投骰记录也将被删除。
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}
              className="coc-btn-secondary flex-1"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              className="coc-btn-primary flex-1 bg-red-600 hover:bg-red-700"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>

      {/* 编辑货币弹窗 */}
      <Modal
        isOpen={showCurrencyModal}
        onClose={() => {
          setShowCurrencyModal(false);
          setSelectedUser(null);
        }}
        title={`编辑货币 - #${String(selectedUser?.displayId ?? 0).padStart(8, '0')} ${selectedUser?.nickname || ''}`}
      >
        <div className="py-4 space-y-4">
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">锈蚀硬币 (coins)</label>
            <input
              type="number"
              min={0}
              value={currencyForm.coins}
              onChange={(e) => setCurrencyForm({ ...currencyForm, coins: parseInt(e.target.value) || 0 })}
              className="w-full coc-input"
            />
          </div>
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">虚银 (stardust)</label>
            <input
              type="number"
              min={0}
              value={currencyForm.stardust}
              onChange={(e) => setCurrencyForm({ ...currencyForm, stardust: parseInt(e.target.value) || 0 })}
              className="w-full coc-input"
            />
          </div>
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">SP / 经验 (exp)</label>
            <input
              type="number"
              min={0}
              value={currencyForm.exp}
              onChange={(e) => setCurrencyForm({ ...currencyForm, exp: parseInt(e.target.value) || 0 })}
              className="w-full coc-input"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setShowCurrencyModal(false);
                setSelectedUser(null);
              }}
              className="coc-btn-secondary flex-1"
            >
              取消
            </button>
            <button
              onClick={handleSaveCurrency}
              disabled={savingCurrency}
              className="coc-btn-primary flex-1 disabled:opacity-50"
            >
              {savingCurrency ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 发放道具弹窗 */}
      <Modal
        isOpen={showGrantModal}
        onClose={() => {
          setShowGrantModal(false);
          setSelectedUser(null);
        }}
        title={`发放道具 - #${String(selectedUser?.displayId ?? 0).padStart(8, '0')} ${selectedUser?.nickname || ''}`}
      >
        <div className="py-4 space-y-4">
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">选择商品</label>
            <select
              value={grantForm.itemKey}
              onChange={(e) => setGrantForm({ ...grantForm, itemKey: e.target.value })}
              className="w-full coc-input"
            >
              <option value="">请选择...</option>
              {shopItems.map((item) => (
                <option key={item.id} value={item.key}>
                  {item.name} ({item.category})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">数量</label>
            <input
              type="number"
              min={1}
              max={999}
              value={grantForm.quantity}
              onChange={(e) => setGrantForm({ ...grantForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full coc-input"
            />
          </div>
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">备注（可选）</label>
            <input
              type="text"
              value={grantForm.reason}
              onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
              placeholder="例如：活动奖励、补偿、GM 测试"
              className="w-full coc-input"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setShowGrantModal(false);
                setSelectedUser(null);
              }}
              className="coc-btn-secondary flex-1"
            >
              取消
            </button>
            <button
              onClick={handleGrantItem}
              disabled={savingGrant}
              className="coc-btn-primary flex-1 disabled:opacity-50"
            >
              {savingGrant ? '发放中...' : '确认发放'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
