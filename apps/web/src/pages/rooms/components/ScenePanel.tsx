import { useEffect, useState } from 'react';
import { MapPin, Plus, Save, Trash2 } from 'lucide-react';
import {
  deleteInvestigationScene,
  getInvestigationScenes,
  saveInvestigationScene,
  setCurrentInvestigationScene,
} from '@/services/investigation.service';
import type { InvestigationScenePayload, InvestigationSceneView } from '@/types/investigation-contract';

interface SceneFormState {
  id: string | null;
  title: string;
  publicSummary: string;
  keeperNotes: string;
  atmosphere: string;
  imageUrl: string;
  sortOrder: string;
  isCurrent: boolean;
}

interface ScenePanelProps {
  roomId: string;
  canManage: boolean;
}

const emptyForm: SceneFormState = {
  id: null,
  title: '',
  publicSummary: '',
  keeperNotes: '',
  atmosphere: 'normal',
  imageUrl: '',
  sortOrder: '0',
  isCurrent: false,
};

function buildForm(scene: InvestigationSceneView): SceneFormState {
  return {
    id: scene.id,
    title: scene.title,
    publicSummary: scene.publicSummary,
    keeperNotes: scene.keeperNotes ?? '',
    atmosphere: scene.atmosphere,
    imageUrl: scene.imageUrl ?? '',
    sortOrder: String(scene.sortOrder),
    isCurrent: scene.isCurrent,
  };
}

function toPayload(form: SceneFormState): InvestigationScenePayload {
  const sortOrder = Number(form.sortOrder);
  return {
    title: form.title.trim(),
    publicSummary: form.publicSummary,
    keeperNotes: form.keeperNotes,
    atmosphere: form.atmosphere.trim() || 'normal',
    imageUrl: form.imageUrl.trim() || null,
    sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
    isCurrent: form.isCurrent,
  };
}

export function ScenePanel({ roomId, canManage }: ScenePanelProps) {
  const [scenes, setScenes] = useState<InvestigationSceneView[]>([]);
  const [form, setForm] = useState<SceneFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScenes = async () => {
    try {
      setLoading(true);
      setError(null);
      setScenes(await getInvestigationScenes(roomId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '场景加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadScenes();
  }, [roomId]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('场景标题不能为空');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const saved = await saveInvestigationScene(roomId, toPayload(form), form.id ?? undefined);
      setScenes(prev => {
        const next = form.id ? prev.map(scene => scene.id === saved.id ? saved : scene) : [saved, ...prev];
        return saved.isCurrent ? next.map(scene => scene.id === saved.id ? saved : { ...scene, isCurrent: false }) : next;
      });
      setForm(emptyForm);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '场景保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSetCurrent = async (sceneId: string) => {
    try {
      setError(null);
      const current = await setCurrentInvestigationScene(roomId, sceneId);
      setScenes(prev => prev.map(scene => scene.id === sceneId ? current : { ...scene, isCurrent: false }));
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : '当前场景切换失败');
    }
  };

  const handleDelete = async (sceneId: string) => {
    if (!window.confirm('删除这个场景吗？')) return;
    try {
      setError(null);
      await deleteInvestigationScene(roomId, sceneId);
      setScenes(prev => prev.filter(scene => scene.id !== sceneId));
      setForm(current => current.id === sceneId ? emptyForm : current);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '场景删除失败');
    }
  };

  return (
    <div className="grid min-h-0 gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-8 text-center text-sm text-[#9c9486]">正在读取场景...</div>
        ) : scenes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#3a3a3a]/70 p-5 text-center text-sm text-[#9c9486]">
            当前场景尚未设定
          </div>
        ) : (
          scenes.map(scene => (
            <article key={scene.id} className="rounded-lg border border-[#2f2f38] bg-[#111119]/80 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-bold text-[#f4ead1]">{scene.title}</h3>
                    {scene.isCurrent && <span className="rounded bg-[#2f6f58]/30 px-1.5 py-0.5 text-[10px] text-[#bdebd5]">当前</span>}
                  </div>
                  <div className="mt-1 text-[11px] text-[#8f8778]">{scene.atmosphere} · 顺序 {scene.sortOrder}</div>
                </div>
                <MapPin size={16} className={scene.isCurrent ? 'text-[#7fd1a7]' : 'text-[#b0a898]'} />
              </div>
              {scene.imageUrl && <img src={scene.imageUrl} alt="" className="mb-2 max-h-32 w-full rounded object-cover" />}
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#d8ccb4]">{scene.publicSummary || '未填写公开摘要'}</p>
              {canManage && scene.keeperNotes && (
                <p className="mt-2 rounded border border-[#3a3a3a]/50 bg-[#0d0d13] p-2 text-xs leading-5 text-[#b0a898]">
                  KP 备注：{scene.keeperNotes}
                </p>
              )}
              {canManage && (
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {!scene.isCurrent && (
                    <button type="button" onClick={() => void handleSetCurrent(scene.id)} className="btn-v2 rounded border border-[#2f6f58]/70 bg-[#143528]/80 px-2.5 py-1.5 text-xs text-[#bdebd5]">
                      设为当前
                    </button>
                  )}
                  <button type="button" onClick={() => setForm(buildForm(scene))} className="btn-v2 rounded border border-[#3a3a3a]/70 bg-[#1b1b24] px-2.5 py-1.5 text-xs text-[#e8d4a0]">
                    编辑
                  </button>
                  <button type="button" onClick={() => void handleDelete(scene.id)} className="btn-v2 inline-flex items-center gap-1 rounded border border-[#a63848]/50 bg-[#4a111a]/35 px-2.5 py-1.5 text-xs text-[#f1b7bd]">
                    <Trash2 size={12} />
                    删除
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </div>

      {canManage && (
        <aside className="rounded-lg border border-[#2f2f38] bg-[#15151d]/90 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#f4ead1]">{form.id ? '编辑场景' : '新增场景'}</h3>
            {form.id && <button type="button" onClick={() => setForm(emptyForm)} className="text-xs text-[#b0a898]">新建</button>}
          </div>
          {error && <div className="mb-3 rounded border border-[#a63848]/40 bg-[#4a111a]/30 p-2 text-xs text-[#f1b7bd]">{error}</div>}
          <label className="block text-xs text-[#b0a898]">
            标题
            <input value={form.title} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            公开摘要
            <textarea value={form.publicSummary} onChange={event => setForm(prev => ({ ...prev, publicSummary: event.target.value }))} className="mt-1 h-24 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            KP 私密备注
            <textarea value={form.keeperNotes} onChange={event => setForm(prev => ({ ...prev, keeperNotes: event.target.value }))} className="mt-1 h-20 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-[#b0a898]">
              氛围
              <input value={form.atmosphere} onChange={event => setForm(prev => ({ ...prev, atmosphere: event.target.value }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
            </label>
            <label className="text-xs text-[#b0a898]">
              顺序
              <input type="number" value={form.sortOrder} onChange={event => setForm(prev => ({ ...prev, sortOrder: event.target.value }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
            </label>
          </div>
          <label className="mt-3 block text-xs text-[#b0a898]">
            图片 URL
            <input value={form.imageUrl} onChange={event => setForm(prev => ({ ...prev, imageUrl: event.target.value }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 flex items-center gap-2 text-xs text-[#b0a898]">
            <input type="checkbox" checked={form.isCurrent} onChange={event => setForm(prev => ({ ...prev, isCurrent: event.target.checked }))} />
            保存后设为当前场景
          </label>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-v2 mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded border border-[#c9a227]/50 bg-[#3a2d10]/80 px-3 py-2 text-xs font-bold text-[#f4d778] disabled:opacity-60">
            {form.id ? <Save size={14} /> : <Plus size={14} />}
            {saving ? '保存中...' : form.id ? '保存场景' : '新增场景'}
          </button>
        </aside>
      )}
      {!canManage && error && <div className="text-xs text-[#f1b7bd]">{error}</div>}
    </div>
  );
}
