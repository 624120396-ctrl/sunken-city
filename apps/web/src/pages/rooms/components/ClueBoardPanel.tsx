import { useEffect, useState } from 'react';
import { Eye, EyeOff, Plus, Save } from 'lucide-react';
import {
  deleteInvestigationClue,
  getInvestigationClues,
  revealInvestigationClue,
  saveInvestigationClue,
} from '@/services/investigation.service';
import type {
  ClueStatus,
  InvestigationCluePayload,
  InvestigationClueView,
  InvestigationVisibility,
} from '@/types/investigation-contract';

const clueStatusLabels: Record<ClueStatus, string> = {
  UNREVEALED: '未发现',
  REVEALED: '已公开',
  ANALYZED: '已分析',
  KEY: '关键',
  DOUBTFUL: '存疑',
};

const clueStatusOptions = Object.keys(clueStatusLabels) as ClueStatus[];

interface ClueFormState {
  id: string | null;
  title: string;
  content: string;
  source: string;
  status: ClueStatus;
  visibility: InvestigationVisibility;
}

interface ClueBoardPanelProps {
  roomId: string;
  canManage: boolean;
}

const emptyForm: ClueFormState = {
  id: null,
  title: '',
  content: '',
  source: '',
  status: 'UNREVEALED',
  visibility: 'KP_ONLY',
};

function buildForm(clue: InvestigationClueView): ClueFormState {
  return {
    id: clue.id,
    title: clue.title,
    content: clue.content,
    source: clue.source ?? '',
    status: clue.status,
    visibility: clue.visibility,
  };
}

function toPayload(form: ClueFormState): InvestigationCluePayload {
  return {
    title: form.title.trim(),
    content: form.content,
    source: form.source.trim() || null,
    status: form.status,
    visibility: form.visibility,
  };
}

export function ClueBoardPanel({ roomId, canManage }: ClueBoardPanelProps) {
  const [clues, setClues] = useState<InvestigationClueView[]>([]);
  const [form, setForm] = useState<ClueFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClues = async () => {
    try {
      setLoading(true);
      setError(null);
      setClues(await getInvestigationClues(roomId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '线索加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClues();
  }, [roomId]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('线索标题不能为空');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const saved = await saveInvestigationClue(roomId, toPayload(form), form.id ?? undefined);
      setClues(prev => form.id ? prev.map(clue => clue.id === saved.id ? saved : clue) : [saved, ...prev]);
      setForm(emptyForm);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '线索保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReveal = async (clueId: string) => {
    try {
      setError(null);
      const revealed = await revealInvestigationClue(roomId, clueId);
      setClues(prev => prev.map(clue => clue.id === clueId ? revealed : clue));
    } catch (revealError) {
      setError(revealError instanceof Error ? revealError.message : '线索公开失败');
    }
  };

  const handleDelete = async (clueId: string) => {
    if (!window.confirm('删除这条线索吗？')) return;
    try {
      setError(null);
      await deleteInvestigationClue(roomId, clueId);
      setClues(prev => prev.filter(clue => clue.id !== clueId));
      setForm(current => current.id === clueId ? emptyForm : current);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '线索删除失败');
    }
  };

  return (
    <div className="grid min-h-0 gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-8 text-center text-sm text-[#9c9486]">正在读取线索...</div>
        ) : clues.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#3a3a3a]/70 p-5 text-center text-sm text-[#9c9486]">
            暂无公开线索
          </div>
        ) : (
          clues.map(clue => (
            <article key={clue.id} className="rounded-lg border border-[#2f2f38] bg-[#111119]/80 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-[#f4ead1]">{clue.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-[#8f8778]">
                    <span>{clueStatusLabels[clue.status]}</span>
                    <span>{clue.visibility === 'PUBLIC' ? '公开' : 'KP 可见'}</span>
                    {clue.source && <span>来源：{clue.source}</span>}
                  </div>
                </div>
                {clue.visibility === 'PUBLIC' ? (
                  <Eye size={16} className="shrink-0 text-[#7fd1a7]" />
                ) : (
                  <EyeOff size={16} className="shrink-0 text-[#b0a898]" />
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#d8ccb4]">{clue.content || '未填写内容'}</p>
              {canManage && (
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {clue.visibility !== 'PUBLIC' && (
                    <button
                      type="button"
                      onClick={() => void handleReveal(clue.id)}
                      className="btn-v2 rounded border border-[#2f6f58]/70 bg-[#143528]/80 px-2.5 py-1.5 text-xs text-[#bdebd5]"
                    >
                      公开
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setForm(buildForm(clue))}
                    className="btn-v2 rounded border border-[#3a3a3a]/70 bg-[#1b1b24] px-2.5 py-1.5 text-xs text-[#e8d4a0]"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(clue.id)}
                    className="btn-v2 rounded border border-[#a63848]/50 bg-[#4a111a]/35 px-2.5 py-1.5 text-xs text-[#f1b7bd]"
                  >
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
            <h3 className="text-sm font-bold text-[#f4ead1]">{form.id ? '编辑线索' : '新增线索'}</h3>
            {form.id && (
              <button type="button" onClick={() => setForm(emptyForm)} className="text-xs text-[#b0a898]">
                新建
              </button>
            )}
          </div>
          {error && <div className="mb-3 rounded border border-[#a63848]/40 bg-[#4a111a]/30 p-2 text-xs text-[#f1b7bd]">{error}</div>}
          <label className="block text-xs text-[#b0a898]">
            标题
            <input
              value={form.title}
              onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
              className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
            />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            内容
            <textarea
              value={form.content}
              onChange={event => setForm(prev => ({ ...prev, content: event.target.value }))}
              className="mt-1 h-28 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
            />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            来源
            <input
              value={form.source}
              onChange={event => setForm(prev => ({ ...prev, source: event.target.value }))}
              className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-[#b0a898]">
              状态
              <select
                value={form.status}
                onChange={event => setForm(prev => ({ ...prev, status: event.target.value as ClueStatus }))}
                className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              >
                {clueStatusOptions.map(status => (
                  <option key={status} value={status}>{clueStatusLabels[status]}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[#b0a898]">
              可见性
              <select
                value={form.visibility}
                onChange={event => setForm(prev => ({ ...prev, visibility: event.target.value as InvestigationVisibility }))}
                className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              >
                <option value="KP_ONLY">KP 可见</option>
                <option value="PUBLIC">公开</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="btn-v2 mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded border border-[#c9a227]/50 bg-[#3a2d10]/80 px-3 py-2 text-xs font-bold text-[#f4d778] disabled:opacity-60"
          >
            {form.id ? <Save size={14} /> : <Plus size={14} />}
            {saving ? '保存中...' : form.id ? '保存线索' : '新增线索'}
          </button>
        </aside>
      )}
      {!canManage && error && <div className="text-xs text-[#f1b7bd]">{error}</div>}
    </div>
  );
}
