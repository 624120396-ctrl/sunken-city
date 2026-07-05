import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Save, UserCheck } from 'lucide-react';
import { getCharacterSyncStatus, getSessionPrep, saveSessionPrep } from '@/services/investigation.service';
import type {
  CharacterSyncIssue,
  RoomCharacterSyncStatus,
  RoomSessionPrepPayload,
  RoomSessionPrepView,
  SessionPrepChecklistItem,
  SessionPrepMaterialLink,
} from '@/types/investigation-contract';

interface SessionPrepPanelProps {
  roomId: string;
  canManage: boolean;
}

interface PrepFormState {
  scheduledAt: string;
  publicNotes: string;
  keeperNotes: string;
  checklistText: string;
  materialLinksText: string;
}

const emptyForm: PrepFormState = {
  scheduledAt: '',
  publicNotes: '',
  keeperNotes: '',
  checklistText: '',
  materialLinksText: '',
};

function toLocalDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalDateTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function checklistToText(items: SessionPrepChecklistItem[]) {
  return items.map(item => `${item.done ? '[x]' : '[ ]'} ${item.text}`).join('\n');
}

function textToChecklist(text: string): SessionPrepChecklistItem[] {
  return text.split('\n').map(line => line.trim()).filter(Boolean).map((line, index) => {
    const done = line.startsWith('[x]') || line.startsWith('[X]');
    const normalized = line.replace(/^\[[ xX]\]\s*/, '');
    return {
      id: `prep-${index}`,
      text: normalized,
      done,
      public: true,
    };
  });
}

function linksToText(links: SessionPrepMaterialLink[]) {
  return links.map(link => `${link.title} | ${link.url}`).join('\n');
}

function textToLinks(text: string): SessionPrepMaterialLink[] {
  return text.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const [title, ...urlParts] = line.split('|').map(part => part.trim());
    return {
      title: title || '资料链接',
      url: urlParts.join('|') || title,
      public: true,
    };
  });
}

function buildForm(prep: RoomSessionPrepView | null): PrepFormState {
  if (!prep) return emptyForm;
  return {
    scheduledAt: toLocalDateTime(prep.scheduledAt),
    publicNotes: prep.publicNotes,
    keeperNotes: prep.keeperNotes ?? '',
    checklistText: checklistToText(prep.checklist),
    materialLinksText: linksToText(prep.materialLinks),
  };
}

function toPayload(form: PrepFormState): RoomSessionPrepPayload {
  return {
    scheduledAt: fromLocalDateTime(form.scheduledAt),
    publicNotes: form.publicNotes,
    keeperNotes: form.keeperNotes,
    checklist: textToChecklist(form.checklistText),
    materialLinks: textToLinks(form.materialLinksText),
  };
}

const issueLabels: Record<CharacterSyncIssue, string> = {
  NO_CHARACTER: '未绑定角色',
  HP_OUT_OF_RANGE: 'HP 超出范围',
  MP_OUT_OF_RANGE: 'MP 超出范围',
  SAN_OUT_OF_RANGE: 'SAN 超出范围',
};

export function SessionPrepPanel({ roomId, canManage }: SessionPrepPanelProps) {
  const [prep, setPrep] = useState<RoomSessionPrepView | null>(null);
  const [characterSync, setCharacterSync] = useState<RoomCharacterSyncStatus | null>(null);
  const [form, setForm] = useState<PrepFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheduledLabel = useMemo(() => {
    if (!prep?.scheduledAt) return '未设定开团时间';
    return new Date(prep.scheduledAt).toLocaleString();
  }, [prep?.scheduledAt]);

  const loadPrep = async () => {
    try {
      setLoading(true);
      setError(null);
      const [loaded, syncStatus] = await Promise.all([
        getSessionPrep(roomId),
        getCharacterSyncStatus(roomId),
      ]);
      setPrep(loaded);
      setCharacterSync(syncStatus);
      setForm(buildForm(loaded));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '备团中心加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPrep();
  }, [roomId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const saved = await saveSessionPrep(roomId, toPayload(form));
      setPrep(saved);
      setForm(buildForm(saved));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '备团中心保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-[#9c9486]">正在读取备团中心...</div>;
  }

  return (
    <div className="grid min-h-0 gap-3 md:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-h-0 space-y-3 overflow-y-auto pr-1">
        <article className="rounded-lg border border-[#2f2f38] bg-[#111119]/80 p-3">
          <div className="mb-2 flex items-center gap-2">
            <CalendarClock size={16} className="text-[#f4d778]" />
            <h3 className="text-sm font-bold text-[#f4ead1]">{scheduledLabel}</h3>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-[#d8ccb4]">{prep?.publicNotes || '暂无公开备团备注'}</p>
        </article>

        <article className="rounded-lg border border-[#2f2f38] bg-[#111119]/80 p-3">
          <h3 className="mb-2 text-sm font-bold text-[#f4ead1]">开团检查清单</h3>
          {prep?.checklist.length ? (
            <div className="space-y-1.5">
              {prep.checklist.map((item, index) => (
                <div key={`${item.id ?? index}-${item.text}`} className="flex items-start gap-2 text-sm text-[#d8ccb4]">
                  <span className={item.done ? 'text-[#7fd1a7]' : 'text-[#8f8778]'}>{item.done ? '完成' : '待办'}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[#9c9486]">暂无准备项</div>
          )}
        </article>

        <article className="rounded-lg border border-[#2f2f38] bg-[#111119]/80 p-3">
          <div className="mb-2 flex items-center gap-2">
            <UserCheck size={16} className="text-[#f4d778]" />
            <h3 className="text-sm font-bold text-[#f4ead1]">角色状态同步</h3>
            {characterSync && (
              <span className="text-xs text-[#8f8778]">
                {characterSync.summary.readyCount}/{characterSync.summary.totalPlayers} 就绪
              </span>
            )}
          </div>
          {characterSync?.checks.length ? (
            <div className="space-y-2">
              {characterSync.checks.map(check => (
                <div key={check.memberId} className="rounded border border-[#2a2a32] bg-[#0d0d13]/80 p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-[#f4ead1]">{check.character?.name ?? check.nickname}</span>
                    <span className={check.status === 'READY' ? 'text-[#7fd1a7]' : 'text-[#f1b7bd]'}>
                      {check.status === 'READY' ? '就绪' : '需确认'}
                    </span>
                  </div>
                  {check.character ? (
                    <div className="mt-1 text-xs text-[#9c9486]">
                      HP {check.character.hp}/{check.character.maxHp} · MP {check.character.mp}/{check.character.maxMp} · SAN {check.character.san}/{check.character.maxSan}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-[#9c9486]">玩家尚未绑定角色</div>
                  )}
                  {check.issues.length > 0 && (
                    <div className="mt-1 text-xs text-[#f1b7bd]">
                      {check.issues.map(issue => issueLabels[issue] ?? issue).join('、')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[#9c9486]">暂无玩家角色状态</div>
          )}
        </article>

        <article className="rounded-lg border border-[#2f2f38] bg-[#111119]/80 p-3">
          <h3 className="mb-2 text-sm font-bold text-[#f4ead1]">模组资料链接</h3>
          {prep?.materialLinks.length ? (
            <div className="space-y-1.5">
              {prep.materialLinks.map(link => (
                <a key={`${link.title}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-[#8fd6d6] hover:text-[#d5ffff]">
                  {link.title}
                </a>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[#9c9486]">暂无资料链接</div>
          )}
        </article>

        {canManage && prep?.keeperNotes && (
          <article className="rounded-lg border border-[#3a3a3a]/60 bg-[#0d0d13] p-3">
            <h3 className="mb-2 text-sm font-bold text-[#f4ead1]">KP 备团备注</h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#b0a898]">{prep.keeperNotes}</p>
          </article>
        )}
      </section>

      {canManage && (
        <aside className="rounded-lg border border-[#2f2f38] bg-[#15151d]/90 p-3">
          <h3 className="mb-3 text-sm font-bold text-[#f4ead1]">编辑备团中心</h3>
          {error && <div className="mb-3 rounded border border-[#a63848]/40 bg-[#4a111a]/30 p-2 text-xs text-[#f1b7bd]">{error}</div>}
          <label className="block text-xs text-[#b0a898]">
            开团时间
            <input type="datetime-local" value={form.scheduledAt} onChange={event => setForm(prev => ({ ...prev, scheduledAt: event.target.value }))} className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            公开备团备注
            <textarea value={form.publicNotes} onChange={event => setForm(prev => ({ ...prev, publicNotes: event.target.value }))} className="mt-1 h-20 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            检查清单
            <textarea value={form.checklistText} onChange={event => setForm(prev => ({ ...prev, checklistText: event.target.value }))} className="mt-1 h-28 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            资料链接
            <textarea value={form.materialLinksText} onChange={event => setForm(prev => ({ ...prev, materialLinksText: event.target.value }))} className="mt-1 h-20 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <label className="mt-3 block text-xs text-[#b0a898]">
            KP 备注
            <textarea value={form.keeperNotes} onChange={event => setForm(prev => ({ ...prev, keeperNotes: event.target.value }))} className="mt-1 h-20 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]" />
          </label>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-v2 mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded border border-[#c9a227]/50 bg-[#3a2d10]/80 px-3 py-2 text-xs font-bold text-[#f4d778] disabled:opacity-60">
            <Save size={14} />
            {saving ? '保存中...' : '保存备团中心'}
          </button>
        </aside>
      )}
      {!canManage && error && <div className="text-xs text-[#f1b7bd]">{error}</div>}
    </div>
  );
}
