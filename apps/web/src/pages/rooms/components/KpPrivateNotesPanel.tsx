import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
  deleteKpPrivateNote,
  getKpPrivateNotes,
  saveKpPrivateNote,
} from '@/services/investigation.service';
import type { KpPrivateNotePayload, KpPrivateNoteView } from '@/types/investigation-contract';

interface NoteFormState {
  id: string | null;
  title: string;
  content: string;
  tagsText: string;
}

interface KpPrivateNotesPanelProps {
  roomId: string;
}

const emptyForm: NoteFormState = {
  id: null,
  title: '',
  content: '',
  tagsText: '',
};

function buildForm(note: KpPrivateNoteView): NoteFormState {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    tagsText: note.tags.join(', '),
  };
}

function toPayload(form: NoteFormState): KpPrivateNotePayload {
  return {
    title: form.title.trim(),
    content: form.content,
    tags: form.tagsText.split(',').map(tag => tag.trim()).filter(Boolean),
  };
}

export function KpPrivateNotesPanel({ roomId }: KpPrivateNotesPanelProps) {
  const [notes, setNotes] = useState<KpPrivateNoteView[]>([]);
  const [form, setForm] = useState<NoteFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      setNotes(await getKpPrivateNotes(roomId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'KP 便签加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotes();
  }, [roomId]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('便签标题不能为空');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const note = await saveKpPrivateNote(roomId, toPayload(form), form.id ?? undefined);
      setNotes(prev => form.id ? prev.map(item => item.id === note.id ? note : item) : [note, ...prev]);
      setForm(emptyForm);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'KP 便签保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm('删除这条 KP 便签吗？')) return;
    try {
      setError(null);
      await deleteKpPrivateNote(roomId, noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      setForm(current => current.id === noteId ? emptyForm : current);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'KP 便签删除失败');
    }
  };

  return (
    <div className="grid min-h-0 gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-8 text-center text-sm text-[#9c9486]">正在读取 KP 便签...</div>
        ) : notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#3a3a3a]/70 p-5 text-center text-sm text-[#9c9486]">
            KP 便签仅主持人可见
          </div>
        ) : (
          notes.map(note => (
            <article key={note.id} className="rounded-lg border border-[#2f2f38] bg-[#111119]/80 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#f4ead1]">{note.title}</h3>
                  {note.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {note.tags.map(tag => <span key={tag} className="rounded bg-[#3a2d10]/70 px-1.5 py-0.5 text-[10px] text-[#f4d778]">{tag}</span>)}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-[#8f8778]">{new Date(note.updatedAt).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#d8ccb4]">{note.content || '未填写内容'}</p>
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setForm(buildForm(note))} className="btn-v2 rounded border border-[#3a3a3a]/70 bg-[#1b1b24] px-2.5 py-1.5 text-xs text-[#e8d4a0]">
                  编辑
                </button>
                <button type="button" onClick={() => void handleDelete(note.id)} className="btn-v2 inline-flex items-center gap-1 rounded border border-[#a63848]/50 bg-[#4a111a]/35 px-2.5 py-1.5 text-xs text-[#f1b7bd]">
                  <Trash2 size={12} />
                  删除
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <aside className="rounded-lg border border-[#2f2f38] bg-[#15151d]/90 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#f4ead1]">{form.id ? '编辑便签' : '新增便签'}</h3>
          {form.id && <button type="button" onClick={() => setForm(emptyForm)} className="text-xs text-[#b0a898]">新建</button>}
        </div>
        {error && <div className="mb-3 rounded border border-[#a63848]/40 bg-[#4a111a]/30 p-2 text-xs text-[#f1b7bd]">{error}</div>}
        <label className="block text-xs text-[#b0a898]">
          标题
          <input value={form.title} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
        </label>
        <label className="mt-3 block text-xs text-[#b0a898]">
          内容
          <textarea value={form.content} onChange={event => setForm(prev => ({ ...prev, content: event.target.value }))} className="mt-1 h-40 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
        </label>
        <label className="mt-3 block text-xs text-[#b0a898]">
          标签（用逗号分隔）
          <input value={form.tagsText} onChange={event => setForm(prev => ({ ...prev, tagsText: event.target.value }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
        </label>
        <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-v2 mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded border border-[#c9a227]/50 bg-[#3a2d10]/80 px-3 py-2 text-xs font-bold text-[#f4d778] disabled:opacity-60">
          {form.id ? <Save size={14} /> : <Plus size={14} />}
          {saving ? '保存中...' : form.id ? '保存便签' : '新增便签'}
        </button>
      </aside>
    </div>
  );
}
