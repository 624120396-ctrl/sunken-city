import { useEffect, useState } from 'react';
import { Pin, PinOff, Plus } from 'lucide-react';
import {
  createInvestigationLogEntry,
  getInvestigationTimeline,
  setInvestigationLogPinned,
} from '@/services/investigation.service';
import type {
  InvestigationLogEntryView,
  InvestigationLogPayload,
  InvestigationLogVisibility,
} from '@/types/investigation-contract';

interface InvestigationTimelinePanelProps {
  roomId: string;
  canManage: boolean;
}

interface LogFormState {
  eventType: InvestigationLogPayload['eventType'];
  title: string;
  content: string;
  visibility: InvestigationLogVisibility;
  isPinned: boolean;
}

const emptyForm: LogFormState = {
  eventType: 'IMPORTANT_MESSAGE',
  title: '',
  content: '',
  visibility: 'PUBLIC',
  isPinned: false,
};

const eventTypeLabels: Record<string, string> = {
  CLUE_REVEALED: '线索公开',
  NPC_REVEALED: 'NPC 登场',
  SCENE_CHANGED: '场景切换',
  IMPORTANT_MESSAGE: '重要事件',
  KP_NOTE_MARKER: 'KP 标记',
  DICE_KEY: '关键骰点',
};

export function InvestigationTimelinePanel({ roomId, canManage }: InvestigationTimelinePanelProps) {
  const [entries, setEntries] = useState<InvestigationLogEntryView[]>([]);
  const [form, setForm] = useState<LogFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      setEntries(await getInvestigationTimeline(roomId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '调查日志加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEntries();
  }, [roomId]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      setError('日志标题不能为空');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const entry = await createInvestigationLogEntry(roomId, {
        eventType: form.eventType,
        title: form.title.trim(),
        content: form.content.trim() || null,
        visibility: form.visibility,
        isPinned: form.isPinned,
      });
      setEntries(prev => [entry, ...prev]);
      setForm(emptyForm);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '调查日志创建失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePin = async (entryId: string, isPinned: boolean) => {
    try {
      setError(null);
      const entry = await setInvestigationLogPinned(roomId, entryId, isPinned);
      setEntries(prev => prev.map(item => item.id === entryId ? entry : item));
    } catch (pinError) {
      setError(pinError instanceof Error ? pinError.message : '日志置顶更新失败');
    }
  };

  return (
    <div className="grid min-h-0 gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-8 text-center text-sm text-[#9c9486]">正在读取调查日志...</div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#3a3a3a]/70 p-5 text-center text-sm text-[#9c9486]">
            调查日志会记录公开线索、NPC 登场和场景切换
          </div>
        ) : (
          entries.map(entry => (
            <article key={entry.id} className="rounded-lg border border-[#2f2f38] bg-[#111119]/80 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-[#f4ead1]">{entry.title}</h3>
                    {entry.isPinned && <span className="rounded bg-[#c9a227]/20 px-1.5 py-0.5 text-[10px] text-[#f4d778]">置顶</span>}
                  </div>
                  <div className="mt-1 text-[11px] text-[#8f8778]">
                    {eventTypeLabels[entry.eventType] ?? entry.eventType} · {entry.visibility === 'PUBLIC' ? '公开' : 'KP 可见'} · {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
                {canManage && (
                  <button type="button" onClick={() => void handlePin(entry.id, !entry.isPinned)} className="btn-v2 rounded border border-[#3a3a3a]/70 bg-[#1b1b24] p-1.5 text-[#e8d4a0]">
                    {entry.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                )}
              </div>
              {entry.content && <p className="whitespace-pre-wrap text-sm leading-6 text-[#d8ccb4]">{entry.content}</p>}
            </article>
          ))
        )}
      </div>

      {canManage && (
        <aside className="rounded-lg border border-[#2f2f38] bg-[#15151d]/90 p-3">
          <h3 className="mb-3 text-sm font-bold text-[#f4ead1]">新增日志</h3>
          {error && <div className="mb-3 rounded border border-[#a63848]/40 bg-[#4a111a]/30 p-2 text-xs text-[#f1b7bd]">{error}</div>}
          <label className="block text-xs text-[#b0a898]">
            类型
            <select value={form.eventType} onChange={event => setForm(prev => ({ ...prev, eventType: event.target.value as InvestigationLogPayload['eventType'] }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]">
              <option value="IMPORTANT_MESSAGE">重要事件</option>
              <option value="KP_NOTE_MARKER">KP 标记</option>
              <option value="DICE_KEY">关键骰点</option>
            </select>
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            标题
            <input value={form.title} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            内容
            <textarea value={form.content} onChange={event => setForm(prev => ({ ...prev, content: event.target.value }))} className="mt-1 h-24 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-[#b0a898]">
              可见性
              <select value={form.visibility} onChange={event => setForm(prev => ({ ...prev, visibility: event.target.value as InvestigationLogVisibility }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]">
                <option value="PUBLIC">公开</option>
                <option value="KP_ONLY">KP 可见</option>
              </select>
            </label>
            <label className="mt-6 flex items-center gap-2 text-xs text-[#b0a898]">
              <input type="checkbox" checked={form.isPinned} onChange={event => setForm(prev => ({ ...prev, isPinned: event.target.checked }))} />
              置顶
            </label>
          </div>
          <button type="button" onClick={() => void handleCreate()} disabled={saving} className="btn-v2 mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded border border-[#c9a227]/50 bg-[#3a2d10]/80 px-3 py-2 text-xs font-bold text-[#f4d778] disabled:opacity-60">
            <Plus size={14} />
            {saving ? '保存中...' : '新增日志'}
          </button>
        </aside>
      )}
      {!canManage && error && <div className="text-xs text-[#f1b7bd]">{error}</div>}
    </div>
  );
}
