import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, RefreshCw, Search, UsersRound } from 'lucide-react';
import { Surface } from '@components/system';
import { getRoomOperationsOverview } from '@/services/room-overview.service';
import type { RoomOperationsOverview } from '@/types/room-overview-contract';

interface RoomOperationsOverviewPanelProps {
  roomId: string;
}

function normalizeOverview(value: Partial<RoomOperationsOverview> | null | undefined): RoomOperationsOverview | null {
  if (!value) return null;

  return {
    role: value.role ?? 'OBSERVER',
    lifecycle: value.lifecycle ?? 'UNKNOWN',
    canUseKpTools: value.canUseKpTools ?? false,
    focus: value.focus ?? null,
    investigation: {
      publicClueCount: value.investigation?.publicClueCount ?? 0,
      kpOnlyClueCount: value.investigation?.kpOnlyClueCount ?? 0,
      publicNpcCount: value.investigation?.publicNpcCount ?? 0,
      kpOnlyNpcCount: value.investigation?.kpOnlyNpcCount ?? 0,
      sceneCount: value.investigation?.sceneCount ?? 0,
      pinnedLogCount: value.investigation?.pinnedLogCount ?? 0,
      recentPublicLogs: Array.isArray(value.investigation?.recentPublicLogs) ? value.investigation.recentPublicLogs : [],
      kpPrivateNoteCount: value.investigation?.kpPrivateNoteCount ?? 0,
    },
    coordination: {
      schedulePoll: value.coordination?.schedulePoll ?? null,
      nextSession: value.coordination?.nextSession ?? null,
      attendanceSummary: value.coordination?.attendanceSummary ?? {},
      activeMemberCount: value.coordination?.activeMemberCount ?? 0,
      pinnedAnnouncement: value.coordination?.pinnedAnnouncement ?? null,
    },
    communication: {
      currentTopic: value.communication?.currentTopic ?? '',
      spotlightUserId: value.communication?.spotlightUserId ?? null,
      keeperPrompt: value.communication?.keeperPrompt ?? '',
      waitingQueueCount: value.communication?.waitingQueueCount ?? 0,
      activeQueueCount: value.communication?.activeQueueCount ?? 0,
      queuePreview: Array.isArray(value.communication?.queuePreview) ? value.communication.queuePreview : [],
    },
    recruitment: {
      status: value.recruitment?.status ?? 'UNKNOWN',
      headline: value.recruitment?.headline ?? '',
      pendingApplicationCount: value.recruitment?.pendingApplicationCount ?? 0,
      pendingInvitationCount: value.recruitment?.pendingInvitationCount ?? 0,
    },
    launchReadiness: value.launchReadiness
      ? {
          status: value.launchReadiness.status ?? 'NEEDS_ATTENTION',
          doneCount: value.launchReadiness.doneCount ?? 0,
          todoCount: value.launchReadiness.todoCount ?? 0,
          items: Array.isArray(value.launchReadiness.items) ? value.launchReadiness.items : [],
        }
      : undefined,
  };
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
      setOverview(normalizeOverview(await getRoomOperationsOverview(roomId)));
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
      <Surface variant="panel" material="basalt" padding="sm" className="room-operations-panel room-operations-panel--loading">
        房间总览加载中...
      </Surface>
    );
  }

  if (!overview) return null;

  const nextSession = overview.coordination?.nextSession ?? null;
  const schedulePoll = overview.coordination?.schedulePoll ?? null;
  const attendance = overview.coordination?.attendanceSummary ?? {};
  const launchTodos = overview.launchReadiness?.items.filter(item => item.status === 'TODO').slice(0, 3) ?? [];

  return (
    <Surface variant="panel" material="basalt" padding="sm" className="room-operations-panel">
      <div className="room-operations-panel__header">
        <div className="room-operations-panel__title">
          <ClipboardList size={16} />
          房间总览
        </div>
        <button
          type="button"
          onClick={() => void loadOverview()}
          className="room-operations-panel__refresh"
        >
          <RefreshCw size={13} />
          刷新
        </button>
      </div>

      {error && (
        <div className="room-operations-panel__error">
          {error}
        </div>
      )}

      <div className="room-operations-grid">
        <div className="room-operations-card">
          <div className="room-operations-card__label">
            <Search size={14} />
            当前调查
          </div>
          <div className="room-operations-card__value">
            {overview.focus?.currentObjective || '尚未设置当前目标'}
          </div>
          <div className="room-operations-card__meta">
            未解决问题 {overview.focus?.unresolvedQuestionCount ?? 0} · 置顶日志 {overview.investigation.pinnedLogCount}
          </div>
          {overview.focus?.pinnedMessage && (
            <p className="room-operations-card__note">{overview.focus.pinnedMessage}</p>
          )}
        </div>

        <div className="room-operations-card">
          <div className="room-operations-card__label">
            <CalendarClock size={14} />
            下次开团
          </div>
          <div className="room-operations-card__value">
            {schedulePoll
              ? `${schedulePoll.candidateCount} 个候选，${schedulePoll.pendingMemberCount} 人待回复`
              : formatTime(nextSession?.scheduledAt ?? null, nextSession?.timezone ?? 'Asia/Shanghai')}
          </div>
          <div className="room-operations-card__meta">
            {schedulePoll
              ? schedulePoll.closesAt
                ? `截止 ${formatTime(schedulePoll.closesAt, schedulePoll.timezone)}`
                : '进行中的排期投票'
              : `可参加 ${attendance.AVAILABLE ?? 0} / 请假 ${attendance.LEAVE ?? 0} / 待确认 ${attendance.PENDING ?? 0}`}
          </div>
          {(schedulePoll?.title || nextSession?.title) && <p className="room-operations-card__note">{schedulePoll?.title || nextSession?.title}</p>}
        </div>

        <div className="room-operations-card">
          <div className="room-operations-card__label">
            <UsersRound size={14} />
            沟通秩序
          </div>
          <div className="room-operations-card__value">
            {overview.communication.currentTopic || '暂无当前讨论主题'}
          </div>
          <div className="room-operations-card__meta">
            行动中 {overview.communication.activeQueueCount} · 等待 {overview.communication.waitingQueueCount}
          </div>
          {overview.communication.queuePreview[0] && (
            <p className="room-operations-card__note">{overview.communication.queuePreview[0].label}</p>
          )}
        </div>

        <div className="room-operations-card room-operations-card--accent">
          <div className="room-operations-card__label">
            {overview.canUseKpTools ? 'KP 待办' : '案件档案'}
          </div>
          {overview.canUseKpTools ? (
            <>
              <div className="room-operations-card__value">{kpTodoCount} 项待处理</div>
              <div className="room-operations-card__meta">
                开团准备 {overview.launchReadiness?.todoCount ?? 0} · 申请 {overview.recruitment.pendingApplicationCount ?? 0} · 邀请 {overview.recruitment.pendingInvitationCount ?? 0}
              </div>
              {launchTodos.length > 0 && (
                <div className="room-operations-card__list">
                  {launchTodos.map(item => (
                    <p key={item.key}>
                      {item.label}：{item.detail}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="room-operations-card__value">
                线索 {overview.investigation.publicClueCount} · NPC {overview.investigation.publicNpcCount}
              </div>
              <div className="room-operations-card__meta">
                场景 {overview.investigation.sceneCount} · 招募 {overview.recruitment.status}
              </div>
            </>
          )}
        </div>
      </div>
    </Surface>
  );
}
