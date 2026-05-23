import { useState, useEffect } from 'react';
import { X, BookOpen, MapPin, Moon, Plus, Trash2, Wand2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';

interface GmNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface ScenePreset {
  id: string;
  name: string;
  atmosphere: string;
  sceneDesc?: string;
  sceneImageUrl?: string;
  sceneMusicUrl?: string;
}

interface GMKitPanelProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'notes' | 'presets';

export function GMKitPanel({ roomId, isOpen, onClose }: GMKitPanelProps) {
  const [tab, setTab] = useState<Tab>('notes');
  const [notes, setNotes] = useState<GmNote[]>([]);
  const [presets, setPresets] = useState<ScenePreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  // 场景预设创建表单
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetAtmosphere, setNewPresetAtmosphere] = useState('normal');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [newPresetImage, setNewPresetImage] = useState('');

  useEffect(() => {
    if (!isOpen || !roomId) return;
    loadData();
  }, [isOpen, roomId, tab]);

  async function loadData() {
    setLoading(true);
    try {
      if (tab === 'notes') {
        const res = await apiFetch(`/api/rooms/${roomId}/gm-notes`);
        const json = await res.json();
        if (json.success) setNotes(json.data.notes || []);
      } else {
        const res = await apiFetch(`/api/rooms/${roomId}/presets`);
        const json = await res.json();
        if (json.success) setPresets(json.data.presets || []);
      }
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createNote() {
    if (!newNoteTitle.trim()) return;
    try {
      const res = await apiFetch(`/api/rooms/${roomId}/gm-notes`, {
        method: 'POST',
        body: JSON.stringify({ title: newNoteTitle, content: newNoteContent }),
      });
      const json = await res.json();
      if (json.success) {
        setNewNoteTitle('');
        setNewNoteContent('');
        loadData();
      }
    } catch (err) {
      console.error('创建笔记失败:', err);
    }
  }

  async function deleteNote(id: string) {
    if (!confirm('确定删除此笔记？')) return;
    try {
      await apiFetch(`/api/rooms/${roomId}/gm-notes/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error('删除笔记失败:', err);
    }
  }

  async function createPreset() {
    if (!newPresetName.trim()) return;
    try {
      const res = await apiFetch(`/api/rooms/${roomId}/presets`, {
        method: 'POST',
        body: JSON.stringify({
          name: newPresetName.trim(),
          atmosphere: newPresetAtmosphere,
          sceneDesc: newPresetDesc,
          sceneImageUrl: newPresetImage || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewPresetName('');
        setNewPresetAtmosphere('normal');
        setNewPresetDesc('');
        setNewPresetImage('');
        loadData();
      }
    } catch (err) {
      console.error('创建场景预设失败:', err);
    }
  }

  async function deletePreset(id: string) {
    if (!confirm('确定删除此场景预设？')) return;
    try {
      await apiFetch(`/api/rooms/${roomId}/presets/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error('删除场景预设失败:', err);
    }
  }

  async function applyPreset(id: string) {
    try {
      const res = await apiFetch(`/api/rooms/${roomId}/presets/${id}/apply`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert(json.data.message);
      }
    } catch (err) {
      console.error('应用预设失败:', err);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="w-[340px] bg-coc-bg border-l border-coc-border flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-coc-border/30">
        <div className="flex items-center gap-2 text-sm text-coc-parchment">
          <Moon size={14} className="text-coc-ether" />
          <span className="font-ritual">KP 工具箱</span>
        </div>
        <button onClick={onClose} className="p-1 text-coc-text-muted hover:text-coc-parchment transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Tab */}
      <div className="flex border-b border-coc-border/20">
        <button
          onClick={() => setTab('notes')}
          className={`flex-1 py-2 text-xs text-center transition-colors ${
            tab === 'notes' ? 'text-coc-gold border-b border-coc-gold' : 'text-coc-text-muted hover:text-coc-parchment'
          }`}
        >
          <BookOpen size={12} className="inline mr-1" />笔记
        </button>
        <button
          onClick={() => setTab('presets')}
          className={`flex-1 py-2 text-xs text-center transition-colors ${
            tab === 'presets' ? 'text-coc-gold border-b border-coc-gold' : 'text-coc-text-muted hover:text-coc-parchment'
          }`}
        >
          <MapPin size={12} className="inline mr-1" />场景预设
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {tab === 'notes' && (
          <div className="space-y-3">
            {/* 新建笔记 */}
            <div className="space-y-2">
              <input
                value={newNoteTitle}
                onChange={e => setNewNoteTitle(e.target.value)}
                placeholder="笔记标题..."
                className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-coc-border/30 rounded text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none"
              />
              <textarea
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                placeholder="笔记内容..."
                rows={3}
                className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-coc-border/30 rounded text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none resize-none"
              />
              <button
                onClick={createNote}
                disabled={!newNoteTitle.trim()}
                className="w-full py-1.5 text-xs bg-coc-gold/10 text-coc-gold border border-coc-gold/20 rounded hover:bg-coc-gold/20 disabled:opacity-30 transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={12} /> 添加笔记
              </button>
            </div>

            {/* 笔记列表 */}
            {notes.length === 0 && !loading && (
              <EmptyState icon={EmptyIcons.Investigator} title="暂无笔记" size="sm" animate={false} />
            )}
            {notes.map(note => (
              <div key={note.id} className="p-2 rounded bg-coc-bg-elevated/30 border border-coc-border/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-ritual text-coc-parchment">{note.title}</span>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-0.5 text-coc-text-muted hover:text-coc-blood transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="text-[11px] text-coc-text-muted line-clamp-3">{note.content}</p>
                {note.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {note.tags.map((tag: string) => (
                      <span key={tag} className="text-[9px] px-1 py-0.5 bg-coc-bg rounded text-coc-text-muted">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'presets' && (
          <div className="space-y-2">
            <div className="space-y-2 mb-3">
              <input
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                placeholder="场景名称..."
                className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-coc-border/30 rounded text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newPresetAtmosphere}
                  onChange={e => setNewPresetAtmosphere(e.target.value)}
                  className="px-2 py-1.5 bg-coc-bg-elevated border border-coc-border/30 rounded text-xs text-coc-parchment"
                >
                  <option value="normal">正常</option>
                  <option value="dark">黑暗</option>
                  <option value="horror">恐怖</option>
                  <option value="mystery">神秘</option>
                  <option value="warm">温暖</option>
                </select>
                <input
                  value={newPresetImage}
                  onChange={e => setNewPresetImage(e.target.value)}
                  placeholder="图片URL（可选）"
                  className="px-2 py-1.5 bg-coc-bg-elevated border border-coc-border/30 rounded text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none"
                />
              </div>
              <textarea
                value={newPresetDesc}
                onChange={e => setNewPresetDesc(e.target.value)}
                placeholder="场景描述..."
                rows={2}
                className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-coc-border/30 rounded text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none resize-none"
              />
              <button
                onClick={createPreset}
                disabled={!newPresetName.trim()}
                className="w-full py-1.5 text-xs bg-coc-gold/10 text-coc-gold border border-coc-gold/20 rounded hover:bg-coc-gold/20 disabled:opacity-30 transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={12} /> 创建场景预设
              </button>
            </div>

            {/* 预设列表 */}
            {presets.length === 0 && !loading && (
              <EmptyState icon={EmptyIcons.Investigator} title="暂无场景预设" description="KP 可创建场景预设快速切换氛围" size="sm" animate={false} />
            )}
            {presets.map(preset => (
              <div key={preset.id} className="p-2 rounded bg-coc-bg-elevated/30 border border-coc-border/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-ritual text-coc-parchment">{preset.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => applyPreset(preset.id)}
                      className="px-2 py-0.5 text-[10px] bg-coc-gold/10 text-coc-gold border border-coc-gold/20 rounded hover:bg-coc-gold/20 transition-colors flex items-center gap-1"
                    >
                      <Wand2 size={10} /> 应用
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="p-0.5 text-coc-text-muted hover:text-coc-blood transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-coc-text-muted">
                  氛围: {preset.atmosphere}
                  {preset.sceneDesc && ` · ${preset.sceneDesc.slice(0, 40)}${preset.sceneDesc.length > 40 ? '...' : ''}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
