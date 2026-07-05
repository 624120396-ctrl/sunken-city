import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, RefreshCw, Search, UsersRound } from 'lucide-react';
import { getRoomOperationsOverview } from '@/services/room-overview.service';
import type { RoomOperationsOverview } from '@/types/room-overview-contract';

interface RoomOperationsOverviewPanelProps {
  roomId: string;
}

function formatTime(value: string | null, timezone: string) {
  if (!value) return '未设置';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone || 'Asia/Shanghai',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function RoomOperationsOverviewPanel({ roomId }: RoomOperationsOverviewPanelProps) {
  const [overview, setOverview] = useState<RoomOperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOverview() {
    setLoading(true);
    setError(null);
    try {
      setOverview(await getRoomOperationsOverview(roomId));
    } catch (err: any) {
      setError(err?.message || '房间总览加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, [roomId]);

  const kpTodoCount = useMemo(() => {
    if (!overview?.canUseKpTools) return 0;
    return (
      (overview.recruitment.pendingApplicationCount ?? 0) +
      (overview.recruitment.pendingInvitationCount ?? 0) +
      (overview.communication.waitingQueueCount ?? 0) +
      (overview.launchReadiness?.todoCount ?? 0)
    );
  }, [overview]);

  if (loading) {
    return (
      <section className="mb-3 rounded-lg border border-[#3a3a3a]/50 bg-[#101018]/80 p-3 text-sm text-[#8f8778]">
        房间总览加载中...
      </section>
    );
  }

  if (!overview) return null;

  const nextSession = overview.coordination.nextSession;
  const attendance = overview.coordination.attendanceSummary;
  const launchTodos = overview.launchReadiness?.items.filter(item => item.status === 'TODO').slice(0, 3) ?? [];

  return (
    <section className="mb-3 rounded-lg border border-[#3a3a3a]/55 bg-[#101018]/88 p-3 shadow-lg shadow-black/20">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f4ead1]">
          <ClipboardList size={16} className="text-[#c9a227]" />
          房间总览
        </div>
        <button
          type="button"
          onClick={() => void loadOverview()}
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

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-[#8f8778]">
            <Search size={14} />
            当前调查
          </div>
          <div className="text-sm font-medium text-[#f4ead1]">
            {overview.focus?.currentObjective || '尚未设置当前目标'}
          </div>
          <div className="mt-2 text-xs text-[#b0a898]">
            未解决问题 {overview.focus?.unresolvedQuestionCount ?? 0} · 置顶日志 {overview.investigation.pinnedLogCount}
          </div>
          {overview.focus?.pinnedMessage && (
            <p className="mt-2 line-clamp-2 text-xs text-[#d8ccb4]">{overview.focus.pinnedMessage}</p>
          )}
        </div>

        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-[#8f8778]">
            <CalendarClock size={14} />
            下次开团
          </div>
          <div className="text-sm font-medium text-[#f4ead1]">
            {formatTime(nextSession?.scheduledAt ?? null, nextSession?.timezone ?? 'Asia/Shanghai')}
          </div>
          <div className="mt-2 text-xs text-[#b0a898]">
            可参加 {attendance.AVAILABLE ?? 0} / 请假 {attendance.LEAVE ?? 0} / 待确认 {attendance.PENDING ?? 0}
          </div>
          {nextSession?.title && <p className="mt-2 text-xs text-[#d8ccb4]">{nextSession.title}</p>}
        </div>

        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-[#8f8778]">
            <UsersRound size={14} />
            沟通秩序
          </div>
          <div className="text-sm font-medium text-[#f4ead1]">
            {overview.communication.currentTopic || '暂无当前讨论主题'}
          </div>
          <div className="mt-2 text-xs text-[#b0a898]">
            行动中 {overview.communication.activeQueueCount} · 等待 {overview.communication.waitingQueueCount}
          </div>
          {overview.communication.queuePreview[0] && (
            <p className="mt-2 line-clamp-2 text-xs text-[#d8ccb4]">{overview.communication.queuePreview[0].label}</p>
          )}
        </div>

        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 text-xs text-[#8f8778]">
            {overview.canUseKpTools ? 'KP 待办' : '案件档案'}
          </div>
          {overview.canUseKpTools ? (
            <>
              <div className="text-sm font-medium text-[#f4ead1]">{kpTodoCount} 项待处理</div>
              <div className="mt-2 text-xs text-[#b0a898]">
                开团准备 {overview.launchReadiness?.todoCount ?? 0} · 申请 {overview.recruitment.pendingApplicationCount ?? 0} · 邀请 {overview.recruitment.pendingInvitationCount ?? 0}
              </div>
              {launchTodos.length > 0 && (
                <div className="mt-2 space-y-1">
                  {launchTodos.map(item => (
                    <p key={item.key} className="line-clamp-1 text-[11px] text-[#d8ccb4]">
                      {item.label}：{item.detail}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-sm font-medium text-[#f4ead1]">
                线索 {overview.investigation.publicClueCount} · NPC {overview.investigation.publicNpcCount}
              </div>
              <div className="mt-2 text-xs text-[#b0a898]">
                场景 {overview.investigation.sceneCount} · 招募 {overview.recruitment.status}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
