import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Megaphone, RefreshCw, Save, Trash2, Users } from 'lucide-react';
import {
  createRoomAnnouncement,
  deleteRoomAnnouncement,
  getRoomCoordination,
  saveMyRoomAttendance,
  saveRoomNextSession,
} from '@/services/room-coordination.service';
import type {
  RoomAttendanceStatus,
  RoomCoordinationView,
  RoomNextSessionStatus,
} from '@/types/room-coordination-contract';

interface RoomCoordinationPanelProps {
  roomId: string;
}

const attendanceLabels: Record<RoomAttendanceStatus, string> = {
  PENDING: '待确认',
  AVAILABLE: '可参加',
  LEAVE: '请假',
  TENTATIVE: '待定',
};

const sessionStatusLabels: Record<RoomNextSessionStatus, string> = {
  SCHEDULED: '已排期',
  RESCHEDULED: '已改期',
  CANCELLED: '已取消',
};

function toDatetimeInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDisplayTime(value?: string | null) {
  if (!value) return '尚未设置';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function RoomCoordinationPanel({ roomId }: RoomCoordinationPanelProps) {
  const [coordination, setCoordination] = useState<RoomCoordinationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionNote, setSessionNote] = useState('');
  const [sessionStatus, setSessionStatus] = useState<RoomNextSessionStatus>('SCHEDULED');
  const [myStatus, setMyStatus] = useState<RoomAttendanceStatus>('PENDING');
  const [myNote, setMyNote] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  async function loadCoordination() {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoomCoordination(roomId);
      setCoordination(data);
      setScheduledAt(toDatetimeInputValue(data.nextSession?.scheduledAt));
      setSessionTitle(data.nextSession?.title ?? '');
      setSessionNote(data.nextSession?.note ?? '');
      setSessionStatus(data.nextSession?.status ?? 'SCHEDULED');
      setMyStatus(data.myAttendance?.status ?? 'PENDING');
      setMyNote(data.myAttendance?.note ?? '');
    } catch (err: any) {
      setError(err?.message || '开团协作信息加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoordination();
  }, [roomId]);

  const counts = useMemo(() => {
    const next = {
      PENDING: 0,
      AVAILABLE: 0,
      LEAVE: 0,
      TENTATIVE: 0,
    } satisfies Record<RoomAttendanceStatus, number>;
    for (const entry of coordination?.attendance ?? []) {
      next[entry.status] += 1;
    }
    return next;
  }, [coordination?.attendance]);

  async function handleSaveNextSession() {
    setSaving(true);
    setError(null);
    try {
      const nextSession = await saveRoomNextSession(roomId, {
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        timezone: 'Asia/Shanghai',
        title: sessionTitle,
        note: sessionNote,
        status: sessionStatus,
      });
      setCoordination(prev => prev ? { ...prev, nextSession } : prev);
    } catch (err: any) {
      setError(err?.message || '下次开团时间保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAttendance() {
    setSaving(true);
    setError(null);
    try {
      const attendance = await saveMyRoomAttendance(roomId, {
        status: myStatus,
        note: myNote,
      });
      setCoordination(prev => {
        if (!prev) return prev;
        const exists = prev.attendance.some(entry => entry.userId === attendance.userId);
        return {
          ...prev,
          myAttendance: attendance,
          attendance: exists
            ? prev.attendance.map(entry => entry.userId === attendance.userId ? attendance : entry)
            : [attendance, ...prev.attendance],
        };
      });
    } catch (err: any) {
      setError(err?.message || '参加状态保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAnnouncement() {
    if (!announcementContent.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const announcement = await createRoomAnnouncement(roomId, {
        title: announcementTitle,
        content: announcementContent,
        isPinned: true,
      });
      setCoordination(prev => prev ? { ...prev, announcements: [announcement, ...prev.announcements] } : prev);
      setAnnouncementTitle('');
      setAnnouncementContent('');
    } catch (err: any) {
      setError(err?.message || '房间公告发布失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAnnouncement(announcementId: string) {
    setSaving(true);
    setError(null);
    try {
      await deleteRoomAnnouncement(roomId, announcementId);
      setCoordination(prev => prev
        ? { ...prev, announcements: prev.announcements.filter(item => item.id !== announcementId) }
        : prev
      );
    } catch (err: any) {
      setError(err?.message || '房间公告删除失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mb-3 rounded-lg border border-[#3a3a3a]/50 bg-[#101018]/80 p-3 text-sm text-[#8f8778]">
        开团协作加载中...
      </section>
    );
  }

  if (!coordination) return null;

  return (
    <section className="mb-3 rounded-lg border border-[#3a3a3a]/55 bg-[#101018]/88 p-3 shadow-lg shadow-black/20">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f4ead1]">
          <CalendarClock size={16} className="text-[#c9a227]" />
          开团协作
        </div>
        <button
          type="button"
          onClick={() => void loadCoordination()}
          className="btn-v2 inline-flex min-h-8 items-center gap-1 rounded border border-[#3a3a3a]/60 px-2 text-xs text-[#b0a898]"
        >
          <RefreshCw size={13} />
          刷新
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded border border-[#a63848]/50 bg-[#4a111a]/35 px-3 py-2 text-xs text-[#f1b7bd]">
          {error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-[#8f8778]">
            <CalendarClock size={14} />
            下次开团
          </div>
          <div className="mb-2 text-sm font-medium text-[#f4ead1]">
            {coordination.nextSession?.title || toDisplayTime(coordination.nextSession?.scheduledAt)}
          </div>
          <div className="mb-3 text-xs text-[#b0a898]">
            {toDisplayTime(coordination.nextSession?.scheduledAt)}
            {coordination.nextSession?.status && ` · ${sessionStatusLabels[coordination.nextSession.status]}`}
          </div>
          {coordination.nextSession?.note && (
            <p className="mb-3 whitespace-pre-wrap text-xs text-[#d8ccb4]">{coordination.nextSession.note}</p>
          )}

          {coordination.canManageCoordination && (
            <div className="space-y-2">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={event => setScheduledAt(event.target.value)}
                className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <input
                value={sessionTitle}
                onChange={event => setSessionTitle(event.target.value)}
                placeholder="标题，例如：第二幕继续调查"
                className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <select
                value={sessionStatus}
                onChange={event => setSessionStatus(event.target.value as RoomNextSessionStatus)}
                className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              >
                {Object.entries(sessionStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <textarea
                value={sessionNote}
                onChange={event => setSessionNote(event.target.value)}
                rows={2}
                placeholder="补充说明"
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <button
                type="button"
                onClick={() => void handleSaveNextSession()}
                disabled={saving}
                className="btn-v2 inline-flex min-h-9 items-center gap-1.5 rounded border border-[#c9a227]/45 bg-[#3a2d10]/55 px-3 text-xs font-bold text-[#f4d778] disabled:opacity-50"
              >
                <Save size={14} />
                保存排期
              </button>
            </div>
          )}
        </div>

        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-[#8f8778]">
            <Users size={14} />
            参加确认
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
            {Object.entries(attendanceLabels).map(([status, label]) => (
              <div key={status} className="rounded border border-[#3a3a3a]/40 px-2 py-1 text-[#d8ccb4]">
                {label}：{counts[status as RoomAttendanceStatus]}
              </div>
            ))}
          </div>
          <div className="mb-3 space-y-2">
            <select
              value={myStatus}
              onChange={event => setMyStatus(event.target.value as RoomAttendanceStatus)}
              className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
            >
              {Object.entries(attendanceLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              value={myNote}
              onChange={event => setMyNote(event.target.value)}
              placeholder="备注，例如：可能迟到 10 分钟"
              className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
            />
            <button
              type="button"
              onClick={() => void handleSaveAttendance()}
              disabled={saving}
              className="btn-v2 inline-flex min-h-9 items-center gap-1.5 rounded border border-[#3a3a3a]/60 px-3 text-xs text-[#e8d4a0] disabled:opacity-50"
            >
              <Save size={14} />
              更新我的状态
            </button>
          </div>
          <div className="max-h-36 space-y-1 overflow-y-auto pr-1 text-xs">
            {coordination.attendance.map(entry => (
              <div key={entry.userId} className="flex items-center justify-between gap-2 rounded bg-black/20 px-2 py-1">
                <span className="truncate text-[#d8ccb4]">{entry.userNickname}</span>
                <span className="shrink-0 text-[#8f8778]">{attendanceLabels[entry.status]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-[#8f8778]">
            <Megaphone size={14} />
            KP 公告
          </div>
          {coordination.canManageCoordination && (
            <div className="mb-3 space-y-2">
              <input
                value={announcementTitle}
                onChange={event => setAnnouncementTitle(event.target.value)}
                placeholder="公告标题"
                className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <textarea
                value={announcementContent}
                onChange={event => setAnnouncementContent(event.target.value)}
                rows={2}
                placeholder="公告内容"
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <button
                type="button"
                onClick={() => void handleCreateAnnouncement()}
                disabled={saving || !announcementContent.trim()}
                className="btn-v2 inline-flex min-h-9 items-center gap-1.5 rounded border border-[#c9a227]/45 bg-[#3a2d10]/55 px-3 text-xs font-bold text-[#f4d778] disabled:opacity-50"
              >
                <Megaphone size={14} />
                发布公告
              </button>
            </div>
          )}
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {coordination.announcements.length === 0 ? (
              <div className="text-xs text-[#6b6558]">暂无公告</div>
            ) : coordination.announcements.map(item => (
              <article key={item.id} className="rounded border border-[#3a3a3a]/35 bg-black/20 p-2">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="min-w-0 text-sm font-medium text-[#f4ead1]">{item.title || '房间公告'}</div>
                  {coordination.canManageCoordination && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteAnnouncement(item.id)}
                      className="shrink-0 rounded p-1 text-[#8f8778] hover:bg-[#a63848]/15 hover:text-[#f1b7bd]"
                      aria-label="删除公告"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-xs text-[#d8ccb4]">{item.content}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
