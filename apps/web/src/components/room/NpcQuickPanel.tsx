import { useState } from 'react';
import { Users, Plus, Trash2, Edit3, User, Eye, EyeOff, Heart, Zap, Brain, Footprints } from 'lucide-react';

export interface RoomNpcItem {
  id: string;
  name: string;
  avatarUrl?: string;
  description?: string;
  statsJson: string;
  isActive: boolean;
}

interface NpcQuickPanelProps {
  npcs: RoomNpcItem[];
  isKP: boolean;
  onCreate: (payload: { name: string; avatarUrl?: string; description?: string; statsJson?: any }) => void;
  onUpdate: (id: string, payload: { name?: string; avatarUrl?: string; description?: string; statsJson?: any; isActive?: boolean }) => void;
  onDelete: (id: string) => void;
  className?: string;
}

function parseStats(json: string) {
  try {
    return JSON.parse(json || '{}');
  } catch {
    return {};
  }
}

export function NpcQuickPanel({
  npcs,
  isKP,
  onCreate,
  onUpdate,
  onDelete,
  className = '',
}: NpcQuickPanelProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    avatarUrl: '',
    description: '',
    hp: 10,
    mp: 10,
    san: 50,
    dex: 50,
  });

  const resetForm = () => {
    setForm({ name: '', avatarUrl: '', description: '', hp: 10, mp: 10, san: 50, dex: 50 });
    setAdding(false);
    setEditingId(null);
  };

  const startEdit = (n: RoomNpcItem) => {
    const stats = parseStats(n.statsJson);
    setEditingId(n.id);
    setForm({
      name: n.name,
      avatarUrl: n.avatarUrl || '',
      description: n.description || '',
      hp: stats.hp ?? 10,
      mp: stats.mp ?? 10,
      san: stats.san ?? 50,
      dex: stats.dex ?? 50,
    });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      avatarUrl: form.avatarUrl.trim() || undefined,
      description: form.description.trim() || undefined,
      statsJson: { hp: form.hp, mp: form.mp, san: form.san, dex: form.dex },
    };
    if (editingId) {
      onUpdate(editingId, payload);
    } else {
      onCreate(payload);
    }
    resetForm();
  };

  const activeNpcs = npcs.filter((n) => n.isActive);
  const displayNpcs = isKP ? npcs : activeNpcs;

  if (!isKP && activeNpcs.length === 0) return null;

  return (
    <div className={`coc-card flex flex-col max-h-[40vh] ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-coc-accent-gold" />
          <div className="font-bold text-sm">房间 NPC</div>
          {displayNpcs.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-coc-bg-tertiary text-coc-text-muted">{displayNpcs.length}</span>
          )}
        </div>
        {isKP && (
          <button
            onClick={() => setAdding(true)}
            className="p-1 rounded hover:bg-coc-bg-tertiary text-coc-text-secondary transition-colors"
            title="新增 NPC"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {(adding || editingId) && (
          <div className="p-3 rounded border border-coc-border bg-coc-bg-tertiary space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="NPC 名称 *"
              className="w-full bg-coc-bg-primary border border-coc-border rounded px-2 py-1.5 text-sm text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none"
            />
            <input
              value={form.avatarUrl}
              onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
              placeholder="头像 URL（可选）"
              className="w-full bg-coc-bg-primary border border-coc-border rounded px-2 py-1.5 text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="描述（可选）"
              rows={2}
              className="w-full bg-coc-bg-primary border border-coc-border rounded px-2 py-1.5 text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none resize-none"
            />

            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'hp', label: 'HP', icon: Heart, min: 0 },
                { key: 'mp', label: 'MP', icon: Zap, min: 0 },
                { key: 'san', label: 'SAN', icon: Brain, min: 0 },
                { key: 'dex', label: 'DEX', icon: Footprints, min: 0 },
              ].map(({ key, label, icon: Icon, min }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] text-coc-text-muted flex items-center gap-1">
                    <Icon size={10} /> {label}
                  </label>
                  <input
                    type="number"
                    min={min}
                    value={form[key as keyof typeof form] as number}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: parseInt(e.target.value || '0', 10) }))}
                    className="w-full bg-coc-bg-primary border border-coc-border rounded px-1.5 py-1 text-xs text-coc-parchment focus:border-coc-gold focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={resetForm}
                className="px-2 py-1 text-xs rounded border border-coc-border text-coc-text-muted hover:text-coc-parchment hover:border-coc-rift transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-2 py-1 text-xs rounded bg-coc-gold text-coc-abyss font-medium hover:bg-coc-gold-glow transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {displayNpcs.length === 0 ? (
          <div className="text-xs text-coc-text-muted text-center py-4">暂无 NPC</div>
        ) : (
          displayNpcs.map((n) => {
            const stats = parseStats(n.statsJson);
            return (
              <div
                key={n.id}
                className={`group flex items-center gap-2 p-2 rounded border transition-colors ${
                  n.isActive
                    ? 'border-coc-border bg-coc-bg-tertiary/40'
                    : 'border-coc-border/40 bg-coc-bg-tertiary/20 opacity-60'
                }`}
              >
                {n.avatarUrl ? (
                  <img
                    src={n.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-coc-border bg-coc-bg-secondary"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-coc-bg-secondary border border-coc-border flex items-center justify-center">
                    <User size={14} className="text-coc-text-muted" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`text-sm truncate ${n.isActive ? 'text-coc-parchment' : 'text-coc-text-muted'}`}>
                      {n.name}
                    </div>
                    {!n.isActive && (
                      <span className="text-[9px] px-1 rounded bg-coc-border text-coc-text-muted">隐藏</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-coc-text-muted mt-0.5">
                    {stats.hp !== undefined && (
                      <span className="flex items-center gap-0.5"><Heart size={9} /> {stats.hp}</span>
                    )}
                    {stats.mp !== undefined && (
                      <span className="flex items-center gap-0.5"><Zap size={9} /> {stats.mp}</span>
                    )}
                    {stats.san !== undefined && (
                      <span className="flex items-center gap-0.5"><Brain size={9} /> {stats.san}</span>
                    )}
                    {stats.dex !== undefined && (
                      <span className="flex items-center gap-0.5"><Footprints size={9} /> {stats.dex}</span>
                    )}
                  </div>
                  {n.description && <div className="text-[10px] text-coc-text-muted truncate mt-0.5">{n.description}</div>}
                </div>
                {isKP && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onUpdate(n.id, { isActive: !n.isActive })}
                      title={n.isActive ? '隐藏' : '显示'}
                      className="p-1.5 rounded hover:bg-coc-bg-primary text-coc-text-muted hover:text-coc-parchment"
                    >
                      {n.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      onClick={() => startEdit(n)}
                      className="p-1.5 rounded hover:bg-coc-bg-primary text-coc-text-muted hover:text-coc-parchment"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => onDelete(n.id)}
                      className="p-1.5 rounded hover:bg-coc-bg-primary text-coc-text-muted hover:text-coc-blood-glow"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
