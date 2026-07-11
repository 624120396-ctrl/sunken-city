import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarClock, Check, Download, Plus, Save, X } from 'lucide-react';
import { cn } from '@lib/utils';
import {
  cancelRoomSchedulePoll,
  closeRoomSchedulePoll,
  createRoomSchedulePoll,
  downloadRoomNextSessionCalendar,
  finalizeRoomSchedulePoll,
  getRoomSchedulePolls,
  remindRoomSchedulePollPending,
  saveRoomScheduleVotes,
  updateRoomSchedulePoll,
} from '@/services/room-coordination.service';
import type {
  RoomSchedulePollPayload,
  RoomSchedulePollView,
  RoomScheduleVoteStatus,
} from '@/types/room-coordination-contract';
import { fromZonedDateTimeInput, toZonedDateTimeInput } from './room-schedule-time';
import { canEditSchedulePoll } from './room-schedule-summary';

interface RoomSchedulePollPanelProps {
  roomId: string;
  canManage: boolean;
}

type DraftOption = { id?: string; startsAt: string; endsAt: string };

const voteLabels: Record<RoomScheduleVoteStatus, string> = {
  AVAILABLE: '可参加',
  TENTATIVE: '待定',
  UNAVAILABLE: '不可参加',
};

function formatTime(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function emptyOptions(): DraftOption[] {
  return [{ startsAt: '', endsAt: '' }, { startsAt: '', endsAt: '' }];
}

export function RoomSchedulePollPanel({ roomId, canManage }: RoomSchedulePollPanelProps) {
  const [polls, setPolls] = useState<RoomSchedulePollView[]>([]);
  const [hasDownloadableNextSession, setHasDownloadableNextSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('开团时间投票');
  const [note, setNote] = useState('');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai');
  const [closesAt, setClosesAt] = useState('');
  const [options, setOptions] = useState<DraftOption[]>(emptyOptions);
  const [draftVotes, setDraftVotes] = useState<Record<string, RoomScheduleVoteStatus>>({});

  const openPoll = polls.find(poll => poll.status === 'OPEN') ?? null;
  const history = polls.filter(poll => poll.status !== 'OPEN');
  const answeredCount = openPoll
    ? openPoll.options.filter(option => draftVotes[option.id] || option.myVote?.status).length
    : 0;
  const canVote = Boolean(openPoll && !openPoll.isVotingClosed);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await getRoomSchedulePolls(roomId);
      setPolls(data.polls);
      setHasDownloadableNextSession(data.hasDownloadableNextSession);
    } catch (err: any) {
      setError(err?.message || '排期投票加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [roomId]);

  useEffect(() => {
    if (!openPoll) return;
    setDraftVotes(Object.fromEntries(openPoll.options.flatMap(option => (
      option.myVote ? [[option.id, option.myVote.status] as const] : []
    ))));
  }, [openPoll?.id, openPoll?.updatedAt]);

  const sortedOptions = useMemo(() => {
    if (!openPoll) return [];
    return [...openPoll.options].sort((a, b) => a.recommendationRank - b.recommendationRank);
  }, [openPoll]);

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setTitle('开团时间投票');
    setNote('');
    setClosesAt('');
    setOptions(emptyOptions());
  }

  function editPoll(poll: RoomSchedulePollView) {
    setEditingId(poll.id);
    setTitle(poll.title);
    setNote(poll.note);
    setTimezone(poll.timezone);
    setClosesAt(poll.closesAt ? toZonedDateTimeInput(poll.closesAt, poll.timezone) : '');
    setOptions(poll.options.map(option => ({
      id: option.id,
      startsAt: toZonedDateTimeInput(option.startsAt, poll.timezone),
      endsAt: toZonedDateTimeInput(option.endsAt, poll.timezone),
    })));
    setShowForm(true);
  }

  async function run(action: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      if (success) window.alert(success);
      await load();
      return true;
    } catch (err: any) {
      setError(err?.message || '操作失败');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitPoll() {
    let payload: RoomSchedulePollPayload;
    try {
      payload = {
        title,
        note,
        timezone,
        closesAt: closesAt ? fromZonedDateTimeInput(closesAt, timezone) : null,
        options: options.map(option => ({
          id: option.id,
          startsAt: fromZonedDateTimeInput(option.startsAt, timezone),
          endsAt: fromZonedDateTimeInput(option.endsAt, timezone),
        })),
      };
    } catch (err: any) {
      setError(err?.message || '候选时间无效');
      return;
    }
    const succeeded = await run(
      () => editingId
        ? updateRoomSchedulePoll(roomId, editingId, payload)
        : createRoomSchedulePoll(roomId, payload)
    );
    if (succeeded) resetForm();
  }

  async function submitVotes() {
    if (!openPoll) return;
    const votes = openPoll.options.flatMap(option => {
      const status = draftVotes[option.id] ?? option.myVote?.status;
      return status ? [{ optionId: option.id, status }] : [];
    });
    await run(() => saveRoomScheduleVotes(roomId, openPoll.id, votes));
  }

  async function downloadCalendar() {
    await run(async () => {
      const blob = await downloadRoomNextSessionCalendar(roomId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `room-${roomId}.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  if (loading) return <div className="text-sm text-[#8b8375]">排期信息加载中...</div>;

  return (
    <section className="space-y-4 border-b border-[#3a3a3a]/50 pb-5" data-testid="room-schedule-poll-panel">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-[#e8d4a0]">
            <CalendarClock size={17} /> 开团排期
          </h3>
          {openPoll && (
            <p className="mt-1 text-xs text-[#8b8375]">
              {openPoll.options.length} 个候选 · {openPoll.isVotingClosed ? '投票已截止' : `已回复 ${answeredCount}/${openPoll.options.length}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasDownloadableNextSession && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void downloadCalendar()}
              className="inline-flex items-center gap-1 rounded border border-[#3a3a3a] px-2 py-1 text-xs text-[#c9a227]"
            >
              <Download size={13} /> 日历
            </button>
          )}
          {canManage && !openPoll && !showForm && (
            <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-1 rounded bg-[#c9a227] px-2 py-1 text-xs text-black">
              <Plus size={13} /> 创建排期
            </button>
          )}
        </div>
      </header>

      {error && <div className="rounded border border-[#a63848]/60 bg-[#a63848]/10 px-3 py-2 text-sm text-[#e9a8b0]">{error}</div>}

      {showForm && canManage && (
        <div className="space-y-3 border-l-2 border-[#c9a227]/60 pl-3">
          <div className="grid gap-2 md:grid-cols-2">
            <label className="text-xs text-[#8b8375]">标题<input value={title} onChange={event => setTitle(event.target.value)} className="mt-1 w-full rounded border border-[#3a3a3a] bg-black/20 px-2 py-1.5 text-sm text-[#e8d4a0]" /></label>
            <label className="text-xs text-[#8b8375]">IANA 时区<input value={timezone} onChange={event => setTimezone(event.target.value)} className="mt-1 w-full rounded border border-[#3a3a3a] bg-black/20 px-2 py-1.5 text-sm text-[#e8d4a0]" /></label>
            <label className="text-xs text-[#8b8375] md:col-span-2">说明<textarea value={note} onChange={event => setNote(event.target.value)} rows={2} className="mt-1 w-full rounded border border-[#3a3a3a] bg-black/20 px-2 py-1.5 text-sm text-[#e8d4a0]" /></label>
            <label className="text-xs text-[#8b8375]">截止时间<input type="datetime-local" value={closesAt} onChange={event => setClosesAt(event.target.value)} className="mt-1 w-full rounded border border-[#3a3a3a] bg-black/20 px-2 py-1.5 text-sm text-[#e8d4a0]" /></label>
          </div>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={option.id ?? index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input aria-label={`候选 ${index + 1} 开始`} type="datetime-local" value={option.startsAt} onChange={event => setOptions(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, startsAt: event.target.value } : item))} className="min-w-0 rounded border border-[#3a3a3a] bg-black/20 px-2 py-1.5 text-xs text-[#e8d4a0]" />
                <input aria-label={`候选 ${index + 1} 结束`} type="datetime-local" value={option.endsAt} onChange={event => setOptions(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, endsAt: event.target.value } : item))} className="min-w-0 rounded border border-[#3a3a3a] bg-black/20 px-2 py-1.5 text-xs text-[#e8d4a0]" />
                <button type="button" aria-label="移除候选" disabled={options.length <= 2} onClick={() => setOptions(items => items.filter((_, itemIndex) => itemIndex !== index))} className="p-1 text-[#8b8375] disabled:opacity-30"><X size={15} /></button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={options.length >= 8} onClick={() => setOptions(items => [...items, { startsAt: '', endsAt: '' }])} className="inline-flex items-center gap-1 rounded border border-[#3a3a3a] px-2 py-1 text-xs text-[#c9a227]"><Plus size={13} /> 候选</button>
            <button type="button" disabled={busy} onClick={() => void submitPoll()} className="inline-flex items-center gap-1 rounded bg-[#c9a227] px-2 py-1 text-xs text-black"><Save size={13} /> 保存</button>
            <button type="button" onClick={resetForm} className="rounded border border-[#3a3a3a] px-2 py-1 text-xs text-[#8b8375]">取消</button>
          </div>
        </div>
      )}

      {openPoll ? (
        <div className="space-y-2">
          <div>
            <strong className="text-sm text-[#e8d4a0]">{openPoll.title}</strong>
            {openPoll.note && <p className="mt-1 text-xs text-[#8b8375]">{openPoll.note}</p>}
            {openPoll.closesAt && <p className="mt-1 text-xs text-[#8b8375]">截止：{formatTime(openPoll.closesAt, openPoll.timezone)} · {openPoll.timezone}</p>}
          </div>
          {sortedOptions.map(option => (
            <div key={option.id} className="border-t border-[#3a3a3a]/50 py-3 first:border-t-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-sm text-[#e8d4a0]">
                    {formatTime(option.startsAt, openPoll.timezone)} - {formatTime(option.endsAt, openPoll.timezone).split(' ').slice(-1)[0]}
                    {option.isRecommended && <span className="rounded bg-[#4db8b8]/15 px-1.5 py-0.5 text-[11px] text-[#73d4d4]">推荐</span>}
                  </div>
                  <p className="mt-1 text-xs text-[#8b8375]">可参加 {option.summary.AVAILABLE} · 待定 {option.summary.TENTATIVE} · 不可 {option.summary.UNAVAILABLE} · 未回复 {option.summary.PENDING}</p>
                </div>
                {canManage && (
                  <button type="button" disabled={busy} onClick={() => void run(() => finalizeRoomSchedulePoll(roomId, openPoll.id, option.id))} className="inline-flex items-center gap-1 rounded border border-[#c9a227]/60 px-2 py-1 text-xs text-[#c9a227]"><Check size={13} /> 选定</button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(Object.keys(voteLabels) as RoomScheduleVoteStatus[]).map(status => {
                  const selected = (draftVotes[option.id] ?? option.myVote?.status) === status;
                  return (
                    <button key={status} type="button" disabled={!canVote || busy} onClick={() => setDraftVotes(values => ({ ...values, [option.id]: status }))} className={cn('rounded border px-2 py-1 text-xs', selected ? 'border-[#4db8b8] bg-[#4db8b8]/15 text-[#73d4d4]' : 'border-[#3a3a3a] text-[#8b8375]')}>
                      {voteLabels[status]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            {canVote && <button type="button" disabled={busy || answeredCount === 0} onClick={() => void submitVotes()} className="inline-flex items-center gap-1 rounded bg-[#4db8b8] px-2 py-1 text-xs text-black"><Save size={13} /> 提交回复</button>}
            {canEditSchedulePoll(canManage, openPoll.isVotingClosed) && <button type="button" disabled={busy} onClick={() => editPoll(openPoll)} className="rounded border border-[#3a3a3a] px-2 py-1 text-xs text-[#e8d4a0]">编辑</button>}
            {canManage && !openPoll.isVotingClosed && <button type="button" disabled={busy} onClick={() => void run(() => closeRoomSchedulePoll(roomId, openPoll.id))} className="rounded border border-[#3a3a3a] px-2 py-1 text-xs text-[#e8d4a0]">截止投票</button>}
            {canManage && !openPoll.isVotingClosed && <button type="button" disabled={busy} onClick={() => void run(async () => { const result = await remindRoomSchedulePollPending(roomId, openPoll.id); return result; }, '已提醒待回复成员')} className="inline-flex items-center gap-1 rounded border border-[#3a3a3a] px-2 py-1 text-xs text-[#e8d4a0]"><Bell size={13} /> 提醒</button>}
            {canManage && <button type="button" disabled={busy} onClick={() => void run(() => cancelRoomSchedulePoll(roomId, openPoll.id))} className="rounded border border-[#a63848]/60 px-2 py-1 text-xs text-[#e9a8b0]">取消排期</button>}
          </div>
        </div>
      ) : !showForm ? (
        <p className="text-sm text-[#8b8375]">当前没有进行中的排期投票。</p>
      ) : null}

      {history.length > 0 && (
        <details className="text-xs text-[#8b8375]">
          <summary className="cursor-pointer">历史排期（{history.length}）</summary>
          <div className="mt-2 space-y-2">
            {history.map(poll => (
              <details key={poll.id} className="border-t border-[#3a3a3a]/40 pt-2">
                <summary className="cursor-pointer text-[#c9a227]">{poll.status === 'FINALIZED' ? '已确定' : '已取消'} · {poll.title} · {poll.options.length} 个候选</summary>
                <div className="mt-2 space-y-2 pl-2">
                  {poll.options.map(option => (
                    <div key={option.id}>
                      <p className="text-[#e8d4a0]">
                        {formatTime(option.startsAt, poll.timezone)} - {formatTime(option.endsAt, poll.timezone).split(' ').slice(-1)[0]}
                        {poll.finalizedOptionId === option.id ? ' · 最终选定' : ''}
                      </p>
                      <p>可参加 {option.summary.AVAILABLE} · 待定 {option.summary.TENTATIVE} · 不可 {option.summary.UNAVAILABLE} · 未回复 {option.summary.PENDING}{option.myVote ? ` · 我的选择：${voteLabels[option.myVote.status]}` : ''}</p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
