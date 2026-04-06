import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, ShoppingBag, Wand2 } from 'lucide-react';
import { apiFetch } from '@lib/api';
import { RuneBorder } from '@components/ui/RuneBorder';
import { generateImage } from '@services/ai.service';

interface ShopItem {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: 'coin' | 'stardust';
  rarity: string;
  iconUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

const RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythical'];
const CURRENCIES = [
  { value: 'coin', label: '锈蚀硬币' },
  { value: 'stardust', label: '虚银' },
];
const CATEGORIES = [
  { value: 'avatar_frame', label: '头像框' },
  { value: 'dice_skin', label: '骰子皮肤' },
  { value: 'card_skin', label: '调查员卡皮肤' },
  { value: 'room_theme', label: '房间主题' },
];

export function AdminShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ShopItem>>({
    category: 'avatar_frame',
    currency: 'coin',
    rarity: 'common',
    price: 0,
    sortOrder: 0,
    isActive: true,
  });
  const [editForm, setEditForm] = useState<Partial<ShopItem>>({});
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTarget, setAiTarget] = useState<'form' | string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/admin/shop/items?limit=200');
      const data = await res.json();
      if (data.success) setItems(data.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.key || !form.name) return alert('标识和名称为必填');
    try {
      setCreating(true);
      const res = await apiFetch('/admin/shop/items', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert('创建成功');
      setForm({
        category: 'avatar_frame',
        currency: 'coin',
        rarity: 'common',
        price: 0,
        sortOrder: 0,
        isActive: true,
      });
      fetchItems();
    } catch (err) {
      alert('创建失败：' + (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (item: ShopItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await apiFetch(`/admin/shop/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert('保存成功');
      setEditingId(null);
      fetchItems();
    } catch (err) {
      alert('保存失败：' + (err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该商品？')) return;
    try {
      const res = await apiFetch(`/admin/shop/items/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchItems();
    } catch (err) {
      alert('删除失败：' + (err as Error).message);
    }
  };

  const handleAiGenerateIcon = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setAiLoading(true);
      const data = await generateImage(aiPrompt.trim(), '1920x1920');
      if (aiTarget === 'form') {
        setForm((f) => ({ ...f, iconUrl: data.url }));
      } else if (aiTarget) {
        setEditForm((f) => ({ ...f, iconUrl: data.url }));
      }
      setAiPrompt('');
      setAiTarget(null);
    } catch (err) {
      alert('生成失败：' + (err as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="w-7 h-7 text-coc-gold" />
        <h1 className="text-2xl font-ritual font-bold text-coc-parchment">商店管理</h1>
      </div>

      {/* 新增商品 */}
      <RuneBorder variant="gold" intensity="subtle">
        <div className="coc-bg-parchment p-5 space-y-4">
          <h2 className="font-ritual font-bold text-coc-parchment">新增商品</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              placeholder="标识 key"
              value={form.key || ''}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              className="px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
            />
            <input
              placeholder="商品名称"
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
            />
            <input
              placeholder="描述"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value as any })}
              className="px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              value={form.rarity}
              onChange={(e) => setForm({ ...form, rarity: e.target.value })}
              className="px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
            >
              {RARITIES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="价格"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
              className="px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
            />
            <input
              type="number"
              placeholder="排序"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              className="px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
            />
            <input
              placeholder="图片 URL"
              value={form.iconUrl || ''}
              onChange={(e) => setForm({ ...form, iconUrl: e.target.value })}
              className="px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setAiTarget('form')}
              className="px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-gold hover:border-coc-gold focus:outline-none text-sm inline-flex items-center gap-1"
            >
              <Wand2 size={14} /> AI 生成图标
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-coc-parchment">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              上架
            </label>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-coc-gold text-coc-abyss rounded font-medium hover:bg-coc-gold-glow disabled:opacity-50"
            >
              <Plus size={18} />
              {creating ? '创建中...' : '创建商品'}
            </button>
          </div>
        </div>
      </RuneBorder>

      {/* 商品列表 */}
      <RuneBorder variant="madness" intensity="subtle">
        <div className="coc-bg-parchment p-5">
          {loading ? (
            <div className="text-center py-10 text-coc-parchment-dim">加载中...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-coc-parchment-dim">暂无商品</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-coc-parchment-dim border-b border-coc-void">
                  <tr>
                    <th className="py-2">名称</th>
                    <th className="py-2">分类</th>
                    <th className="py-2">价格</th>
                    <th className="py-2">稀有度</th>
                    <th className="py-2">状态</th>
                    <th className="py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coc-void/50">
                  {items.map((item) => (
                    <tr key={item.id} className="text-coc-parchment">
                      <td className="py-3">
                        {editingId === item.id ? (
                          <div className="space-y-1">
                            <input
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="px-2 py-1 bg-coc-abyss border border-coc-void rounded w-full"
                            />
                            <div className="flex items-center gap-1">
                              <input
                                value={editForm.iconUrl || ''}
                                onChange={(e) => setEditForm({ ...editForm, iconUrl: e.target.value })}
                                placeholder="图标 URL"
                                className="px-2 py-1 bg-coc-abyss border border-coc-void rounded text-xs w-full"
                              />
                              <button
                                onClick={() => setAiTarget(item.id)}
                                className="px-1.5 py-1 text-coc-gold hover:bg-coc-gold/10 rounded"
                                title="AI 生成图标"
                              >
                                <Wand2 size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {item.iconUrl && (
                              <img src={item.iconUrl} alt="" className="w-8 h-8 object-contain" />
                            )}
                            <span>{item.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        {editingId === item.id ? (
                          <select
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="px-2 py-1 bg-coc-abyss border border-coc-void rounded"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        ) : (
                          CATEGORIES.find((c) => c.value === item.category)?.label || item.category
                        )}
                      </td>
                      <td className="py-3">
                        {editingId === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editForm.price}
                              onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                              className="px-2 py-1 bg-coc-abyss border border-coc-void rounded w-20"
                            />
                            <select
                              value={editForm.currency}
                              onChange={(e) => setEditForm({ ...editForm, currency: e.target.value as any })}
                              className="px-2 py-1 bg-coc-abyss border border-coc-void rounded"
                            >
                              {CURRENCIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span>
                            {item.price} {item.currency === 'coin' ? '锈蚀硬币' : '虚银'}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {editingId === item.id ? (
                          <select
                            value={editForm.rarity}
                            onChange={(e) => setEditForm({ ...editForm, rarity: e.target.value })}
                            className="px-2 py-1 bg-coc-abyss border border-coc-void rounded"
                          >
                            {RARITIES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          item.rarity
                        )}
                      </td>
                      <td className="py-3">
                        {editingId === item.id ? (
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editForm.isActive}
                              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                            />
                            上架
                          </label>
                        ) : (
                          <span className={item.isActive ? 'text-coc-gold' : 'text-coc-parchment-dim'}>
                            {item.isActive ? '上架中' : '已下架'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-1.5 text-coc-gold hover:bg-coc-gold/10 rounded"
                              title="保存"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-coc-parchment-dim hover:bg-coc-void rounded"
                              title="取消"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEdit(item)}
                              className="p-1.5 text-coc-parchment-dim hover:text-coc-gold hover:bg-coc-gold/10 rounded"
                              title="编辑"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-coc-parchment-dim hover:text-coc-blood hover:bg-coc-blood/10 rounded"
                              title="删除"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </RuneBorder>

      {/* AI 生成商品图标弹窗 */}
      {aiTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md p-6 rounded-lg bg-coc-bg-secondary border border-coc-border shadow-xl space-y-4">
            <h3 className="text-lg font-ritual font-bold text-coc-parchment">AI 生成商品图标</h3>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="描述你想要的图标，例如：克苏鲁风格的金色边框，带有神秘符文，透明背景，游戏道具图标"
              className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none min-h-[100px]"
              maxLength={600}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-coc-parchment-dim">{aiPrompt.length}/600</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setAiTarget(null); setAiPrompt(''); }}
                  className="px-4 py-2 text-coc-parchment-dim hover:text-coc-parchment transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAiGenerateIcon}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-4 py-2 bg-coc-gold text-coc-abyss rounded font-medium hover:bg-coc-gold-glow disabled:opacity-50"
                >
                  {aiLoading ? '生成中...' : '生成'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
