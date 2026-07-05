import { useEffect, useState } from 'react';
import { Save, Target } from 'lucide-react';
import { getCurrentFocus, saveCurrentFocus } from '@/services/investigation.service';
import type { RoomCurrentFocusPayload, RoomCurrentFocusView } from '@/types/investigation-contract';

interface CurrentFocusPanelProps {
  roomId: string;
  canManage: boolean;
}

interface FocusFormState {
  lastRecap: string;
  currentObjective: string;
  unresolvedQuestionsText: string;
  pinnedMessage: string;
  keeperNotes: string;
}

const emptyForm: FocusFormState = {
  lastRecap: '',
  currentObjective: '',
  unresolvedQuestionsText: '',
  pinnedMessage: '',
  keeperNotes: '',
};

function buildForm(focus: RoomCurrentFocusView | null): FocusFormState {
  if (!focus) return emptyForm;
  return {
    lastRecap: focus.lastRecap,
    currentObjective: focus.currentObjective,
    unresolvedQuestionsText: focus.unresolvedQuestions.join('\n'),
    pinnedMessage: focus.pinnedMessage,
    keeperNotes: focus.keeperNotes ?? '',
  };
}

function toPayload(form: FocusFormState): RoomCurrentFocusPayload {
  return {
    lastRecap: form.lastRecap,
    currentObjective: form.currentObjective,
    unresolvedQuestions: form.unresolvedQuestionsText.split('\n').map(line => line.trim()).filter(Boolean),
    pinnedMessage: form.pinnedMessage,
    keeperNotes: form.keeperNotes,
  };
}

export function CurrentFocusPanel({ roomId, canManage }: CurrentFocusPanelProps) {
  const [focus, setFocus] = useState<RoomCurrentFocusView | null>(null);
  const [form, setForm] = useState<FocusFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFocus = async () => {
    try {
      setLoading(true);
      setError(null);
      const loaded = await getCurrentFocus(roomId);
      setFocus(loaded);
      setForm(buildForm(loaded));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '当前焦点加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFocus();
  }, [roomId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const saved = await saveCurrentFocus(roomId, toPayload(form));
      setFocus(saved);
      setForm(buildForm(saved));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '当前焦点保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-[#9c9486]">正在读取当前焦点...</div>;
  }

  return (
    <div className="grid min-h-0 gap-3 md:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-h-0 space-y-3 overflow-y-auto pr-1">
        <article className="rounded-lg border border-[#2f2f38] bg-[#111119]/80 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Target size={16} className="text-[#f4d778]" />
            <h3 className="text-sm font-bold text-[#f4ead1]">当前调查目标</h3>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-[#d8ccb4]">{focus?.currentObjective || '尚未设定当前调查目标'}</p>
        </article>

        {focus?.pinnedMessage && (
          <article className="rounded-lg border border-[#c9a227]/35 bg-[#3a2d10]/35 p-3">
            <h3 className="mb-2 text-sm font-bold text-[#f4d778]">KP 置顶消息</h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#f4ead1]">{focus.pinnedMessage}</p>
          </article>
        )}

        <article className="rounded-lg border border-[#2f2f38] bg-[#111119]/80 p-3">
          <h3 className="mb-2 text-sm font-bold text-[#f4ead1]">上次回顾</h3>
          <p className="whitespace-pre-wrap text-sm leading-6 text-[#d8ccb4]">{focus?.lastRecap || '暂无上次回顾'}</p>
        </article>

        <article className="rounded-lg border border-[#2f2f38] bg-[#111119]/80 p-3">
          <h3 className="mb-2 text-sm font-bold text-[#f4ead1]">未解决问题</h3>
          {focus?.unresolvedQuestions.length ? (
            <ul className="space-y-1.5 text-sm text-[#d8ccb4]">
              {focus.unresolvedQuestions.map(question => <li key={question}>· {question}</li>)}
            </ul>
          ) : (
            <div className="text-sm text-[#9c9486]">暂无未解决问题</div>
          )}
        </article>

        {canManage && focus?.keeperNotes && (
          <article className="rounded-lg border border-[#3a3a3a]/60 bg-[#0d0d13] p-3">
            <h3 className="mb-2 text-sm font-bold text-[#f4ead1]">KP 焦点备注</h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#b0a898]">{focus.keeperNotes}</p>
          </article>
        )}
      </section>

      {canManage && (
        <aside className="rounded-lg border border-[#2f2f38] bg-[#15151d]/90 p-3">
          <h3 className="mb-3 text-sm font-bold text-[#f4ead1]">编辑当前焦点</h3>
          {error && <div className="mb-3 rounded border border-[#a63848]/40 bg-[#4a111a]/30 p-2 text-xs text-[#f1b7bd]">{error}</div>}
          <label className="block text-xs text-[#b0a898]">
            当前调查目标
            <textarea value={form.currentObjective} onChange={event => setForm(prev => ({ ...prev, currentObjective: event.target.value }))} className="mt-1 h-20 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            KP 置顶消息
            <textarea value={form.pinnedMessage} onChange={event => setForm(prev => ({ ...prev, pinnedMessage: event.target.value }))} className="mt-1 h-20 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            上次回顾
            <textarea value={form.lastRecap} onChange={event => setForm(prev => ({ ...prev, lastRecap: event.target.value }))} className="mt-1 h-28 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            未解决问题
            <textarea value={form.unresolvedQuestionsText} onChange={event => setForm(prev => ({ ...prev, unresolvedQuestionsText: event.target.value }))} className="mt-1 h-24 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            KP 备注
            <textarea value={form.keeperNotes} onChange={event => setForm(prev => ({ ...prev, keeperNotes: event.target.value }))} className="mt-1 h-20 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-v2 mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded border border-[#c9a227]/50 bg-[#3a2d10]/80 px-3 py-2 text-xs font-bold text-[#f4d778] disabled:opacity-60">
            <Save size={14} />
            {saving ? '保存中...' : '保存当前焦点'}
          </button>
        </aside>
      )}
      {!canManage && error && <div className="text-xs text-[#f1b7bd]">{error}</div>}
    </div>
  );
}
