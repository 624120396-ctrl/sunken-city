import { useEffect, useState } from 'react';
import { Eye, EyeOff, Plus, Save } from 'lucide-react';
import {
  deleteInvestigationNpc,
  getInvestigationNpcs,
  revealInvestigationNpc,
  saveInvestigationNpc,
} from '@/services/investigation.service';
import type {
  InvestigationNpcPayload,
  InvestigationNpcView,
  InvestigationVisibility,
  NpcStatus,
} from '@/types/investigation-contract';

const npcStatusLabels: Record<NpcStatus, string> = {
  UNSEEN: '未登场',
  APPEARED: '已登场',
  MISSING: '失踪',
  DEAD: '死亡',
  SUSPECT: '嫌疑',
  ALLY: '盟友',
  HOSTILE: '敌对',
};

const npcStatusOptions = Object.keys(npcStatusLabels) as NpcStatus[];

interface NpcFormState {
  id: string | null;
  name: string;
  avatarUrl: string;
  publicProfile: string;
  keeperNotes: string;
  status: NpcStatus;
  visibility: InvestigationVisibility;
}

interface NpcArchivePanelProps {
  roomId: string;
  canManage: boolean;
}

const emptyForm: NpcFormState = {
  id: null,
  name: '',
  avatarUrl: '',
  publicProfile: '',
  keeperNotes: '',
  status: 'UNSEEN',
  visibility: 'KP_ONLY',
};

function buildForm(npc: InvestigationNpcView): NpcFormState {
  return {
    id: npc.id,
    name: npc.name,
    avatarUrl: npc.avatarUrl ?? '',
    publicProfile: npc.publicProfile,
    keeperNotes: npc.keeperNotes ?? '',
    status: npc.status,
    visibility: npc.visibility,
  };
}

function toPayload(form: NpcFormState): InvestigationNpcPayload {
  return {
    name: form.name.trim(),
    avatarUrl: form.avatarUrl.trim() || null,
    publicProfile: form.publicProfile,
    keeperNotes: form.keeperNotes,
    status: form.status,
    visibility: form.visibility,
  };
}

export function NpcArchivePanel({ roomId, canManage }: NpcArchivePanelProps) {
  const [npcs, setNpcs] = useState<InvestigationNpcView[]>([]);
  const [form, setForm] = useState<NpcFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNpcs = async () => {
    try {
      setLoading(true);
      setError(null);
      setNpcs(await getInvestigationNpcs(roomId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'NPC 档案加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNpcs();
  }, [roomId]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('NPC 名称不能为空');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const saved = await saveInvestigationNpc(roomId, toPayload(form), form.id ?? undefined);
      setNpcs(prev => form.id ? prev.map(npc => npc.id === saved.id ? saved : npc) : [saved, ...prev]);
      setForm(emptyForm);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'NPC 保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReveal = async (npcId: string) => {
    try {
      setError(null);
      const revealed = await revealInvestigationNpc(roomId, npcId);
      setNpcs(prev => prev.map(npc => npc.id === npcId ? revealed : npc));
    } catch (revealError) {
      setError(revealError instanceof Error ? revealError.message : 'NPC 公开失败');
    }
  };

  const handleDelete = async (npcId: string) => {
    if (!window.confirm('删除这个 NPC 档案吗？')) return;
    try {
      setError(null);
      await deleteInvestigationNpc(roomId, npcId);
      setNpcs(prev => prev.filter(npc => npc.id !== npcId));
      setForm(current => current.id === npcId ? emptyForm : current);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'NPC 删除失败');
    }
  };

  return (
    <div className="grid min-h-0 gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-8 text-center text-sm text-[#9c9486]">正在读取 NPC 档案...</div>
        ) : npcs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#3a3a3a]/70 p-5 text-center text-sm text-[#9c9486]">
            暂无公开 NPC 档案
          </div>
        ) : (
          npcs.map(npc => (
            <article key={npc.id} className="rounded-lg border border-[#2f2f38] bg-[#111119]/80 p-3">
              <div className="mb-2 flex items-start gap-3">
                {npc.avatarUrl ? (
                  <img src={npc.avatarUrl} alt="" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1b1b24] text-xs text-[#8f8778]">NPC</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-bold text-[#f4ead1]">{npc.name}</h3>
                    {npc.visibility === 'PUBLIC' ? <Eye size={16} className="text-[#7fd1a7]" /> : <EyeOff size={16} className="text-[#b0a898]" />}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-[#8f8778]">
                    <span>{npcStatusLabels[npc.status]}</span>
                    <span>{npc.visibility === 'PUBLIC' ? '公开' : 'KP 可见'}</span>
                  </div>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#d8ccb4]">{npc.publicProfile || '未填写公开档案'}</p>
              {canManage && npc.keeperNotes && (
                <p className="mt-2 rounded border border-[#3a3a3a]/50 bg-[#0d0d13] p-2 text-xs leading-5 text-[#b0a898]">
                  KP 备注：{npc.keeperNotes}
                </p>
              )}
              {canManage && (
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {npc.visibility !== 'PUBLIC' && (
                    <button type="button" onClick={() => void handleReveal(npc.id)} className="btn-v2 rounded border border-[#2f6f58]/70 bg-[#143528]/80 px-2.5 py-1.5 text-xs text-[#bdebd5]">
                      公开
                    </button>
                  )}
                  <button type="button" onClick={() => setForm(buildForm(npc))} className="btn-v2 rounded border border-[#3a3a3a]/70 bg-[#1b1b24] px-2.5 py-1.5 text-xs text-[#e8d4a0]">
                    编辑
                  </button>
                  <button type="button" onClick={() => void handleDelete(npc.id)} className="btn-v2 rounded border border-[#a63848]/50 bg-[#4a111a]/35 px-2.5 py-1.5 text-xs text-[#f1b7bd]">
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
            <h3 className="text-sm font-bold text-[#f4ead1]">{form.id ? '编辑 NPC' : '新增 NPC'}</h3>
            {form.id && <button type="button" onClick={() => setForm(emptyForm)} className="text-xs text-[#b0a898]">新建</button>}
          </div>
          {error && <div className="mb-3 rounded border border-[#a63848]/40 bg-[#4a111a]/30 p-2 text-xs text-[#f1b7bd]">{error}</div>}
          <label className="block text-xs text-[#b0a898]">
            名称
            <input value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            头像 URL
            <input value={form.avatarUrl} onChange={event => setForm(prev => ({ ...prev, avatarUrl: event.target.value }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            公开档案
            <textarea value={form.publicProfile} onChange={event => setForm(prev => ({ ...prev, publicProfile: event.target.value }))} className="mt-1 h-24 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            KP 私密备注
            <textarea value={form.keeperNotes} onChange={event => setForm(prev => ({ ...prev, keeperNotes: event.target.value }))} className="mt-1 h-20 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-[#b0a898]">
              状态
              <select value={form.status} onChange={event => setForm(prev => ({ ...prev, status: event.target.value as NpcStatus }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]">
                {npcStatusOptions.map(status => <option key={status} value={status}>{npcStatusLabels[status]}</option>)}
              </select>
            </label>
            <label className="text-xs text-[#b0a898]">
              可见性
              <select value={form.visibility} onChange={event => setForm(prev => ({ ...prev, visibility: event.target.value as InvestigationVisibility }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]">
                <option value="KP_ONLY">KP 可见</option>
                <option value="PUBLIC">公开</option>
              </select>
            </label>
          </div>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-v2 mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded border border-[#c9a227]/50 bg-[#3a2d10]/80 px-3 py-2 text-xs font-bold text-[#f4d778] disabled:opacity-60">
            {form.id ? <Save size={14} /> : <Plus size={14} />}
            {saving ? '保存中...' : form.id ? '保存 NPC' : '新增 NPC'}
          </button>
        </aside>
      )}
      {!canManage && error && <div className="text-xs text-[#f1b7bd]">{error}</div>}
    </div>
  );
}
