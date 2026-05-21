import { useState } from 'react';
import { EyeOff, Plus, Trash2, Edit3, Search, X, Check } from 'lucide-react';

export interface RoomClueItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  isHidden: boolean;
  requiresSkill?: string | null;
  requiresValue?: number | null;
  createdAt: string;
}

interface RoomCluePanelProps {
  clues: RoomClueItem[];
  isKP: boolean;
  onCreate: (payload: { title: string; content: string; imageUrl?: string; isHidden: boolean; requiresSkill?: string; requiresValue?: number }) => void;
  onUpdate: (id: string, payload: Partial<Omit<RoomClueItem, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function RoomCluePanel({
  clues,
  isKP,
  onCreate,
  onUpdate,
  onDelete,
  className = '',
}: RoomCluePanelProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    imageUrl: '',
    isHidden: false,
    requiresSkill: '',
    requiresValue: '',
  });

  const resetForm = () => {
    setForm({ title: '', content: '', imageUrl: '', isHidden: false, requiresSkill: '', requiresValue: '' });
    setAdding(false);
    setEditingId(null);
  };

  const startEdit = (c: RoomClueItem) => {
    setEditingId(c.id);
    setForm({
      title: c.title,
      content: c.content,
      imageUrl: c.imageUrl || '',
      isHidden: c.isHidden,
      requiresSkill: c.requiresSkill || '',
      requiresValue: c.requiresValue?.toString() || '',
    });
  };

  const handleSave = () => {
    if (!form.title.trim() && !form.content.trim()) return;
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      isHidden: form.isHidden,
      requiresSkill: form.requiresSkill.trim() || undefined,
      requiresValue: form.requiresValue ? parseInt(form.requiresValue, 10) : undefined,
    };
    if (editingId) {
      onUpdate(editingId, payload);
    } else {
      onCreate(payload as any);
    }
    resetForm();
  };

  const visibleClues = isKP ? clues : clues.filter((c) => !c.isHidden);

  return (
    <div className={`coc-card flex flex-col max-h-[50vh] ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-coc-accent-gold" />
          <div className="font-bold text-sm">线索板</div>
        </div>
        {isKP && (
          <button
            onClick={() => setAdding(true)}
            className="p-1 rounded hover:bg-coc-bg-tertiary text-coc-text-secondary"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {(adding || editingId) && (
          <div className="p-2 rounded border border-coc-border bg-coc-bg-tertiary space-y-2">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="线索标题"
              className="w-full bg-coc-bg-primary border border-coc-border rounded px-2 py-1 text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none"
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="线索内容"
              rows={3}
              className="w-full bg-coc-bg-primary border border-coc-border rounded px-2 py-1 text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none resize-none"
            />
            <input
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              placeholder="图片 URL（可选）"
              className="w-full bg-coc-bg-primary border border-coc-border rounded px-2 py-1 text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <input
                value={form.requiresSkill}
                onChange={(e) => setForm((f) => ({ ...f, requiresSkill: e.target.value }))}
                placeholder="要求技能（如 spot_hidden）"
                className="flex-1 bg-coc-bg-primary border border-coc-border rounded px-2 py-1 text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none"
              />
              <input
                value={form.requiresValue}
                onChange={(e) => setForm((f) => ({ ...f, requiresValue: e.target.value }))}
                placeholder="目标值"
                className="w-20 bg-coc-bg-primary border border-coc-border rounded px-2 py-1 text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-coc-text-secondary">
              <input
                type="checkbox"
                checked={form.isHidden}
                onChange={(e) => setForm((f) => ({ ...f, isHidden: e.target.checked }))}
                className="rounded border-coc-border bg-coc-bg-primary text-coc-accent-gold"
              />
              隐藏线索（仅 KP 可见）
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="p-1 text-coc-text-muted hover:text-coc-parchment">
                <X size={14} />
              </button>
              <button onClick={handleSave} className="p-1 text-coc-accent-gold hover:text-coc-gold">
                <Check size={14} />
              </button>
            </div>
          </div>
        )}

        {visibleClues.length === 0 ? (
          <div className="text-xs text-coc-text-muted text-center py-4">{isKP ? '暂无线索' : '尚未发现线索'}</div>
        ) : (
          visibleClues.map((c) => (
            <div key={c.id} className="p-2 rounded border border-coc-border bg-coc-bg-tertiary/40 hover:bg-coc-bg-tertiary transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm text-coc-parchment truncate">{c.title}</div>
                <div className="flex items-center gap-1">
                  {c.isHidden && <EyeOff size={12} className="text-coc-text-muted" />}
                  {isKP && (
                    <>
                      <button onClick={() => startEdit(c)} className="p-1 text-coc-text-muted hover:text-coc-parchment">
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => onDelete(c.id)} className="p-1 text-coc-text-muted hover:text-coc-blood-glow">
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs text-coc-text-secondary mt-1 whitespace-pre-wrap">{c.content}</div>
              {c.imageUrl && (
                <img src={c.imageUrl} alt="" className="mt-2 rounded border border-coc-border max-h-32 object-cover w-full" />
              )}
              {(c.requiresSkill || c.requiresValue) && (
                <div className="mt-1.5 text-[10px] text-coc-accent-gold">
                  要求：{c.requiresSkill || '任意'} {c.requiresValue ? `≥ ${c.requiresValue}` : ''}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
