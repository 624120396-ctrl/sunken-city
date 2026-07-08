import { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardList, RefreshCw, Save, UserPlus, X } from 'lucide-react';
import { Surface } from '@components/system';
import {
  cancelRoomInvitation,
  getRoomRecruitment,
  inviteRoomUser,
  reviewRoomJoinApplication,
  saveRoomRecruitmentProfile,
} from '@/services/room-recruitment.service';
import type {
  RecruitmentStyleMatchLevel,
  RoomJoinApplicationStatus,
  RoomInvitationRole,
  RoomInvitationStatus,
  RoomRecruitmentStatus,
  RoomRecruitmentView,
} from '@/types/room-recruitment-contract';

interface RoomRecruitmentPanelProps {
  roomId: string;
}

const recruitmentStatusLabels: Record<RoomRecruitmentStatus, string> = {
  CLOSED: '关闭招募',
  OPEN: '开放招募',
  PAUSED: '暂停招募',
};

const applicationStatusLabels: Record<RoomJoinApplicationStatus, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  DECLINED: '已拒绝',
  WITHDRAWN: '已撤回',
  JOINED: '已入房',
};

const invitationStatusLabels: Record<RoomInvitationStatus, string> = {
  PENDING: '待回应',
  ACCEPTED: '已接受',
  DECLINED: '已拒绝',
  CANCELLED: '已取消',
};

const invitationRoleLabels: Record<RoomInvitationRole, string> = {
  PLAYER: '调查员',
  OBSERVER: '观察者',
};

const styleMatchLabels: Record<RecruitmentStyleMatchLevel, string> = {
  HIGH: '高匹配',
  MEDIUM: '需确认',
  LOW: '低匹配',
  UNKNOWN: '待判断',
};

const styleMatchClasses: Record<RecruitmentStyleMatchLevel, string> = {
  HIGH: 'border-[#3f7f55]/45 text-[#9fd7aa]',
  MEDIUM: 'border-[#c9a227]/45 text-[#f4d778]',
  LOW: 'border-[#a63848]/45 text-[#f1b7bd]',
  UNKNOWN: 'border-[#3a3a3a]/45 text-[#b0a898]',
};

const defaultStyleTags = ['严肃调查', '恐怖氛围', '新手友好'];
const defaultPlGuide = '进房后先绑定角色，阅读当前目标和公开线索；需要发言或行动时可使用沟通队列；需要私下确认时再私聊 KP。';
const defaultKpChecklist = '确认玩家人数、角色绑定、当前场景、关键线索、开团时间、当前焦点和房间公告。';

function splitLines(value: string) {
  return value.split('\n').map(item => item.trim()).filter(Boolean);
}

export function RoomRecruitmentPanel({ roomId }: RoomRecruitmentPanelProps) {
  const [data, setData] = useState<RoomRecruitmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RoomRecruitmentStatus>('CLOSED');
  const [headline, setHeadline] = useState('');
  const [pitch, setPitch] = useState('');
  const [styleTagsText, setStyleTagsText] = useState(defaultStyleTags.join('\n'));
  const [scheduleText, setScheduleText] = useState('');
  const [requirements, setRequirements] = useState('');
  const [safetyTools, setSafetyTools] = useState('');
  const [playerCountMin, setPlayerCountMin] = useState(3);
  const [playerCountMax, setPlayerCountMax] = useState(4);
  const [newcomerFriendly, setNewcomerFriendly] = useState(true);
  const [plGuide, setPlGuide] = useState(defaultPlGuide);
  const [kpChecklist, setKpChecklist] = useState(defaultKpChecklist);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<RoomInvitationRole>('PLAYER');
  const [inviteMessage, setInviteMessage] = useState('');

  async function loadRecruitment() {
    setLoading(true);
    setError(null);
    try {
      const loaded = await getRoomRecruitment(roomId);
      setData(loaded);
      const profile = loaded.profile;
      setStatus(profile?.status ?? 'CLOSED');
      setHeadline(profile?.headline ?? '');
      setPitch(profile?.pitch ?? '');
      setStyleTagsText((profile?.styleTags.length ? profile.styleTags : defaultStyleTags).join('\n'));
      setScheduleText(profile?.scheduleText ?? '');
      setRequirements(profile?.requirements ?? '');
      setSafetyTools(profile?.safetyTools ?? '');
      setPlayerCountMin(profile?.playerCountMin ?? 3);
      setPlayerCountMax(profile?.playerCountMax ?? 4);
      setNewcomerFriendly(profile?.newcomerFriendly ?? true);
      setPlGuide(profile?.plGuide || defaultPlGuide);
      setKpChecklist(profile?.kpChecklist || defaultKpChecklist);
    } catch (err: any) {
      setError(err?.message || '招募资料加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecruitment();
  }, [roomId]);

  const pendingApplications = useMemo(
    () => data?.applications.filter(item => item.status === 'PENDING') ?? [],
    [data?.applications]
  );

  async function handleSaveProfile() {
    setSaving(true);
    setError(null);
    try {
      const profile = await saveRoomRecruitmentProfile(roomId, {
        status,
        headline,
        pitch,
        styleTags: splitLines(styleTagsText),
        scheduleText,
        requirements,
        safetyTools,
        playerCountMin,
        playerCountMax,
        newcomerFriendly,
        plGuide,
        kpChecklist,
      });
      setData(prev => prev ? { ...prev, profile } : prev);
    } catch (err: any) {
      setError(err?.message || '招募资料保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(applicationId: string, nextStatus: Extract<RoomJoinApplicationStatus, 'APPROVED' | 'DECLINED'>) {
    setSaving(true);
    setError(null);
    try {
      const application = await reviewRoomJoinApplication(roomId, applicationId, {
        status: nextStatus,
      });
      setData(prev => prev ? {
        ...prev,
        applications: prev.applications.map(item => item.id === application.id ? application : item),
      } : prev);
    } catch (err: any) {
      setError(err?.message || '申请审核失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const invitation = await inviteRoomUser(roomId, {
        email: inviteEmail.trim(),
        role: inviteRole,
        message: inviteMessage,
      });
      setData(prev => prev ? {
        ...prev,
        invitations: [
          invitation,
          ...prev.invitations.filter(item => item.id !== invitation.id),
        ],
      } : prev);
      setInviteEmail('');
      setInviteMessage('');
    } catch (err: any) {
      setError(err?.message || '邀请发送失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    setSaving(true);
    setError(null);
    try {
      const invitation = await cancelRoomInvitation(roomId, invitationId);
      setData(prev => prev ? {
        ...prev,
        invitations: prev.invitations.map(item => item.id === invitation.id ? invitation : item),
      } : prev);
    } catch (err: any) {
      setError(err?.message || '邀请取消失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Surface variant="panel" material="basalt" padding="sm" className="room-recruitment-panel room-recruitment-panel--loading">
        招募资料加载中...
      </Surface>
    );
  }

  if (!data) return null;
  const profile = data.profile;
  const tags = profile?.styleTags.length ? profile.styleTags : splitLines(styleTagsText);

  return (
    <Surface variant="panel" material="basalt" padding="sm" className="room-recruitment-panel">
      <div className="room-recruitment-panel__header">
        <div className="room-recruitment-panel__title">
          <UserPlus size={16} />
          招募与风格
        </div>
        <button
          type="button"
          onClick={() => void loadRecruitment()}
          className="room-recruitment-panel__refresh"
        >
          <RefreshCw size={13} />
          刷新
        </button>
      </div>

      {error && (
        <div className="room-recruitment-panel__error">
          {error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr_1fr]">
        <div className="room-recruitment-card">
          <div className="mb-2 text-xs text-[#8f8778]">房间招募资料</div>
          <div className="mb-2 text-sm font-medium text-[#f4ead1]">
            {profile?.headline || headline || '尚未填写招募标题'}
          </div>
          <div className="mb-2 text-xs text-[#b0a898]">
            {recruitmentStatusLabels[profile?.status ?? status]} · 建议 {profile?.playerCountMin ?? playerCountMin}-{profile?.playerCountMax ?? playerCountMax} 名 PL
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span key={tag} className="rounded border border-[#3a3a3a]/45 px-2 py-1 text-[11px] text-[#d8ccb4]">
                {tag}
              </span>
            ))}
          </div>
          {profile?.pitch && <p className="mb-3 whitespace-pre-wrap text-xs text-[#d8ccb4]">{profile.pitch}</p>}
          {data.canManageRecruitment && (
            <div className="space-y-2">
              <select
                value={status}
                onChange={event => setStatus(event.target.value as RoomRecruitmentStatus)}
                className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              >
                {Object.entries(recruitmentStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input
                value={headline}
                onChange={event => setHeadline(event.target.value)}
                placeholder="招募标题"
                className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <textarea
                value={pitch}
                onChange={event => setPitch(event.target.value)}
                rows={3}
                placeholder="本团介绍"
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <textarea
                value={styleTagsText}
                onChange={event => setStyleTagsText(event.target.value)}
                rows={3}
                placeholder="风格标签，每行一个"
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={playerCountMin}
                  onChange={event => setPlayerCountMin(Number(event.target.value))}
                  className="rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
                />
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={playerCountMax}
                  onChange={event => setPlayerCountMax(Number(event.target.value))}
                  className="rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#d8ccb4]">
                <input
                  type="checkbox"
                  checked={newcomerFriendly}
                  onChange={event => setNewcomerFriendly(event.target.checked)}
                />
                新手友好
              </label>
            </div>
          )}
        </div>

        <div className="room-recruitment-card">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-[#8f8778]">
            <ClipboardList size={14} />
            新手与 KP 小抄
          </div>
          {data.canManageRecruitment ? (
            <div className="space-y-2">
              <textarea
                value={scheduleText}
                onChange={event => setScheduleText(event.target.value)}
                rows={2}
                placeholder="时间安排"
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <textarea
                value={requirements}
                onChange={event => setRequirements(event.target.value)}
                rows={2}
                placeholder="报名门槛"
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <textarea
                value={safetyTools}
                onChange={event => setSafetyTools(event.target.value)}
                rows={2}
                placeholder="安全工具 / 边界说明"
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <textarea
                value={plGuide}
                onChange={event => setPlGuide(event.target.value)}
                rows={3}
                placeholder="PL 入房小抄"
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <textarea
                value={kpChecklist}
                onChange={event => setKpChecklist(event.target.value)}
                rows={3}
                placeholder="KP 开团检查清单"
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={saving}
                className="btn-v2 inline-flex min-h-9 items-center gap-1.5 rounded border border-[#c9a227]/45 bg-[#3a2d10]/55 px-3 text-xs font-bold text-[#f4d778] disabled:opacity-50"
              >
                <Save size={14} />
                保存招募资料
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-xs text-[#d8ccb4]">
              <p className="whitespace-pre-wrap">{profile?.scheduleText || '暂无时间说明'}</p>
              <p className="whitespace-pre-wrap">{profile?.requirements || '暂无报名门槛'}</p>
              <p className="whitespace-pre-wrap">{profile?.plGuide || defaultPlGuide}</p>
            </div>
          )}
        </div>

        <div className="room-recruitment-card">
          <div className="mb-2 text-xs text-[#8f8778]">
            申请审核 {pendingApplications.length > 0 ? `· ${pendingApplications.length} 待处理` : ''}
          </div>
          {data.canManageRecruitment ? (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              <div className="room-recruitment-item room-recruitment-item--form">
                <div className="mb-2 text-[11px] text-[#8f8778]">邀请用户入房</div>
                <input
                  value={inviteEmail}
                  onChange={event => setInviteEmail(event.target.value)}
                  placeholder="用户邮箱"
                  className="mb-2 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-xs text-[#f4ead1]"
                />
                <div className="mb-2 grid grid-cols-[1fr_auto] gap-2">
                  <select
                    value={inviteRole}
                    onChange={event => setInviteRole(event.target.value as RoomInvitationRole)}
                    className="rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-xs text-[#f4ead1]"
                  >
                    {Object.entries(invitationRoleLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleInvite()}
                    disabled={saving || !inviteEmail.trim()}
                    className="btn-v2 inline-flex min-h-8 items-center gap-1 rounded border border-[#c9a227]/40 px-2 text-[11px] text-[#f4d778] disabled:opacity-50"
                  >
                    <UserPlus size={12} />
                    邀请
                  </button>
                </div>
                <textarea
                  value={inviteMessage}
                  onChange={event => setInviteMessage(event.target.value)}
                  rows={2}
                  placeholder="邀请留言"
                  className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-xs text-[#f4ead1]"
                />
              </div>

              {data.invitations.length > 0 && (
                <div className="space-y-2">
                  {data.invitations.map(invitation => (
                    <article key={invitation.id} className="room-recruitment-item">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-[#f4ead1]">{invitation.inviteeName}</div>
                          <div className="text-[11px] text-[#8f8778]">
                            {invitationRoleLabels[invitation.role]} · {invitationStatusLabels[invitation.status]}
                          </div>
                        </div>
                        {invitation.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => void handleCancelInvitation(invitation.id)}
                            disabled={saving}
                            className="btn-v2 inline-flex min-h-7 items-center gap-1 rounded border border-[#a63848]/35 px-2 text-[11px] text-[#f1b7bd] disabled:opacity-50"
                          >
                            <X size={11} />
                            取消
                          </button>
                        )}
                      </div>
                      {invitation.message && <p className="whitespace-pre-wrap text-xs text-[#d8ccb4]">{invitation.message}</p>}
                    </article>
                  ))}
                </div>
              )}

              {data.applications.length === 0 ? (
                <div className="text-xs text-[#6b6558]">暂无申请</div>
              ) : data.applications.map(application => (
                <article key={application.id} className="room-recruitment-item">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-[#f4ead1]">{application.applicantName}</div>
                      <div className="text-[11px] text-[#8f8778]">{applicationStatusLabels[application.status]}</div>
                    </div>
                    {application.styleMatch && (
                      <span className={`rounded border px-2 py-0.5 text-[10px] ${styleMatchClasses[application.styleMatch.level]}`}>
                        {styleMatchLabels[application.styleMatch.level]}
                        {application.styleMatch.score !== null ? ` ${application.styleMatch.score}%` : ''}
                      </span>
                    )}
                  </div>
                  <p className="mb-2 whitespace-pre-wrap text-xs text-[#d8ccb4]">{application.message || '未填写留言'}</p>
                  {application.styleMatch && (
                    <div className="room-recruitment-match">
                      <div>{application.styleMatch.summary}</div>
                      {application.styleMatch.matchedTags.length > 0 && (
                        <div className="mt-1 text-[#9fd7aa]">重合：{application.styleMatch.matchedTags.join('、')}</div>
                      )}
                      {application.styleMatch.unmatchedTags.length > 0 && (
                        <div className="mt-1 text-[#f1b7bd]">需确认：{application.styleMatch.unmatchedTags.join('、')}</div>
                      )}
                    </div>
                  )}
                  {application.preferredStyleTags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {application.preferredStyleTags.map(tag => (
                        <span key={tag} className="rounded border border-[#3a3a3a]/35 px-1.5 py-0.5 text-[10px] text-[#b0a898]">{tag}</span>
                      ))}
                    </div>
                  )}
                  {application.status === 'PENDING' && (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleReview(application.id, 'APPROVED')}
                        disabled={saving}
                        className="btn-v2 inline-flex min-h-8 items-center gap-1 rounded border border-[#c9a227]/40 px-2 text-[11px] text-[#f4d778] disabled:opacity-50"
                      >
                        <Check size={12} />
                        通过
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReview(application.id, 'DECLINED')}
                        disabled={saving}
                        className="btn-v2 inline-flex min-h-8 items-center gap-1 rounded border border-[#a63848]/35 px-2 text-[11px] text-[#f1b7bd] disabled:opacity-50"
                      >
                        <X size={12} />
                        拒绝
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-xs text-[#d8ccb4]">
              <p>{profile?.newcomerFriendly ? '本团标记为新手友好。' : '本团更适合已有经验的玩家。'}</p>
              <p className="whitespace-pre-wrap">{profile?.safetyTools || '暂无额外边界说明。'}</p>
              {data.ownApplication && (
                <p>你的申请状态：{applicationStatusLabels[data.ownApplication.status]}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Surface>
  );
}
