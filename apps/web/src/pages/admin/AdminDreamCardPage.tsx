import { useState, useEffect, useRef } from 'react';
import { Sparkles, Edit2, Save, X, Image as ImageIcon, Upload, Wand2, Loader2 } from 'lucide-react';
import { apiFetch } from '@lib/api';
import { RuneBorder } from '@components/ui/RuneBorder';
import { AdminTableSkeleton } from '@components/admin/AdminTableSkeleton';
import { generateImage } from '@services/ai.service';
import { uploadFile, type UploadResponse } from '@services/upload.service';

interface DreamCard {
  id: string;
  key: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#a69b85',
  rare: '#c9a227',
  epic: '#8b2635',
  legendary: '#6b4c7a',
};

const RARITY_NAMES: Record<string, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export function AdminDreamCardPage() {
  const [cards, setCards] = useState<DreamCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DreamCard>>({});

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/admin/dream-cards');
      const data = await res.json();
      if (data.success) setCards(data.data.cards);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (card: DreamCard) => {
    setEditingId(card.id);
    setEditForm({ ...card });
    setAiPrompt('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setAiPrompt('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res: UploadResponse = await uploadFile(file);
      setEditForm((f) => ({ ...f, imageUrl: res.url }));
    } catch (err: any) {
      alert(err.message || '上传失败');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setAiLoading(true);
      const data = await generateImage(aiPrompt.trim(), '1024x1024');
      setEditForm((f) => ({ ...f, imageUrl: data.url }));
      setAiPrompt('');
    } catch (err: any) {
      alert(err.message || '生成失败');
    } finally {
      setAiLoading(false);
    }
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await apiFetch(`/admin/dream-cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          rarity: editForm.rarity,
          imageUrl: editForm.imageUrl,
          sortOrder: editForm.sortOrder,
          isActive: editForm.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCards((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...data.data.card } : c))
        );
        setEditingId(null);
        setAiPrompt('');
      } else {
        alert(data.error?.message || '保存失败');
      }
    } catch (err) {
      alert('保存失败: ' + (err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-serif font-bold text-coc-accent-gold flex items-center gap-2">
          <Sparkles size={24} />
          溺者之牌管理
        </h1>
        <AdminTableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-coc-accent-gold flex items-center gap-2">
          <Sparkles size={24} />
          溺者之牌管理
        </h1>
        <span className="text-sm text-coc-text-muted">共 {cards.length} 张牌</span>
      </div>

      <RuneBorder className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-coc-border">
                <th className="pb-3 font-medium text-coc-text-muted">图片</th>
                <th className="pb-3 font-medium text-coc-text-muted">名称</th>
                <th className="pb-3 font-medium text-coc-text-muted">稀有度</th>
                <th className="pb-3 font-medium text-coc-text-muted">Key</th>
                <th className="pb-3 font-medium text-coc-text-muted">排序</th>
                <th className="pb-3 font-medium text-coc-text-muted">状态</th>
                <th className="pb-3 font-medium text-coc-text-muted text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coc-border">
              {cards.map((card) => {
                const isEditing = editingId === card.id;
                return (
                  <tr key={card.id} className="hover:bg-coc-bg-tertiary/30">
                    <td className="py-3 align-middle">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editForm.imageUrl || ''}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, imageUrl: e.target.value }))
                              }
                              placeholder="图片 URL"
                              className="w-40 bg-coc-bg-tertiary border border-coc-border rounded px-2 py-1 text-xs"
                            />
                            <input
                              type="file"
                              accept="image/*"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-coc-bg-tertiary border border-coc-border text-coc-text-secondary hover:text-coc-text-primary text-xs"
                              title="本地上传"
                            >
                              <Upload size={12} />
                              上传
                            </button>
                            <button
                              onClick={handleAiGenerate}
                              disabled={aiLoading || !aiPrompt.trim()}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-coc-bg-tertiary border border-coc-border text-coc-text-secondary hover:text-coc-text-primary disabled:opacity-50 text-xs"
                              title="AI 生成"
                            >
                              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                              生成
                            </button>
                          </div>
                          {editForm.imageUrl ? (
                            <img
                              src={editForm.imageUrl}
                              alt=""
                              className="h-10 w-10 rounded object-cover border border-coc-border"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-coc-bg-tertiary border border-coc-border flex items-center justify-center">
                              <ImageIcon size={16} className="text-coc-text-muted" />
                            </div>
                          )}
                          <input
                            type="text"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="输入图片描述后点击生成"
                            className="w-56 bg-coc-bg-tertiary border border-coc-border rounded px-2 py-1 text-xs"
                          />
                        </div>
                      ) : card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className="h-10 w-10 rounded object-cover border border-coc-border"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-coc-bg-tertiary border border-coc-border flex items-center justify-center">
                          <ImageIcon size={16} className="text-coc-text-muted" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 align-middle">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, name: e.target.value }))
                          }
                          className="w-32 bg-coc-bg-tertiary border border-coc-border rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="font-medium text-coc-text-primary">{card.name}</span>
                      )}
                    </td>
                    <td className="py-3 align-middle">
                      {isEditing ? (
                        <select
                          value={editForm.rarity || 'common'}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              rarity: e.target.value as DreamCard['rarity'],
                            }))
                          }
                          className="bg-coc-bg-tertiary border border-coc-border rounded px-2 py-1 text-sm"
                        >
                          <option value="common">普通</option>
                          <option value="rare">稀有</option>
                          <option value="epic">史诗</option>
                          <option value="legendary">传说</option>
                        </select>
                      ) : (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: `${RARITY_COLORS[card.rarity]}20`,
                            color: RARITY_COLORS[card.rarity],
                          }}
                        >
                          {RARITY_NAMES[card.rarity]}
                        </span>
                      )}
                    </td>
                    <td className="py-3 align-middle text-coc-text-secondary font-mono text-xs">
                      {card.key}
                    </td>
                    <td className="py-3 align-middle">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.sortOrder ?? 0}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              sortOrder: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="w-16 bg-coc-bg-tertiary border border-coc-border rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="text-coc-text-secondary">{card.sortOrder}</span>
                      )}
                    </td>
                    <td className="py-3 align-middle">
                      {isEditing ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.isActive ?? true}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, isActive: e.target.checked }))
                            }
                            className="accent-coc-accent-red"
                          />
                          <span className="text-xs">启用</span>
                        </label>
                      ) : card.isActive ? (
                        <span className="text-green-400 text-xs">启用</span>
                      ) : (
                        <span className="text-coc-text-muted text-xs">禁用</span>
                      )}
                    </td>
                    <td className="py-3 align-middle text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => saveEdit(card.id)}
                            className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20"
                            title="保存"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded bg-coc-text-muted/10 text-coc-text-muted hover:bg-coc-text-muted/20"
                            title="取消"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(card)}
                          className="p-1.5 rounded bg-coc-accent-gold/10 text-coc-accent-gold hover:bg-coc-accent-gold/20"
                          title="编辑"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </RuneBorder>
    </div>
  );
}
