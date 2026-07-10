import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ClipboardList,
  Lock,
  MapPin,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, PageShell, Surface } from '@components/system';
import { cn, formatTimeAgo } from '@lib/utils';
import {
  createGlobalRecruitment,
  listGlobalRecruitments,
  reportGlobalRecruitment,
  respondGlobalRecruitment,
  updateGlobalRecruitment,
  updateGlobalRecruitmentResponse,
} from '@services/global-recruitment.service';
import type {
  GlobalRecruitmentContactVisibility,
  GlobalRecruitmentPostPayload,
  GlobalRecruitmentPostView,
  GlobalRecruitmentReportReason,
  GlobalRecruitmentResponseStatus,
  GlobalRecruitmentSourceType,
} from '@/types/global-recruitment-contract';

type BoardStatusFilter = 'OPEN' | 'CLOSED' | 'EXPIRED' | 'ALL';
type BoardSourceFilter = GlobalRecruitmentSourceType | 'ALL';

const statusLabels: Record<string, string> = {
  OPEN: '招募中',
  CLOSED: '已关闭',
  EXPIRED: '已过期',
};

const sourceLabels: Record<GlobalRecruitmentSourceType, string> = {
  INTERNAL_ROOM: '站内房间',
  EXTERNAL_EVENT: '外部活动',
};

const visibilityLabels: Record<GlobalRecruitmentContactVisibility, string> = {
  PUBLIC: '公开显示',
  LOGGED_IN: '登录可见',
  RESPONDERS: '报名后可见',
};

const responseLabels: Record<GlobalRecruitmentResponseStatus, string> = {
  PENDING: '待确认',
  ACCEPTED: '已接纳',
  DECLINED: '已婉拒',
  WITHDRAWN: '已撤回',
};

const initialForm: GlobalRecruitmentPostPayload = {
  title: '',
  sourceType: 'EXTERNAL_EVENT',
  roomPublicId: '',
  systemOrTheme: 'CoC7',
  playFormat: '线上语音/文字',
  locationOrPlatform: '',
  scheduleText: '',
  playerCountMin: 3,
  playerCountMax: 4,
  experienceRequirement: '新手可来，提前沟通角色与安全边界。',
  contactMethod: '',
  contactVisibility: 'RESPONDERS',
  status: 'OPEN',
  description: '',
  safetyNote: '请在报名前说明可接受的恐怖、暴力与缺席边界。',
  tags: ['新手友好'],
  expiresAt: '',
};

function splitTags(raw: string) {
  return raw
    .split(/[，,]/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function toDateTimeLocalValue(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoOrNull(value?: string | null) {
  return value ? new Date(value).toISOString() : null;
}

export function GlobalRecruitmentBoardPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<BoardStatusFilter>('OPEN');
  const [sourceType, setSourceType] = useState<BoardSourceFilter>('ALL');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<GlobalRecruitmentPostView | null>(null);
  const [form, setForm] = useState<GlobalRecruitmentPostPayload>(initialForm);
  const [tagText, setTagText] = useState(initialForm.tags?.join('，') ?? '');
  const [responsePostId, setResponsePostId] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [responseContact, setResponseContact] = useState('');
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<GlobalRecruitmentReportReason>('HARASSMENT');
  const [reportNote, setReportNote] = useState('');

  const filters = useMemo(() => ({ status, sourceType, q: query }), [status, sourceType, query]);
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['global-recruitments', filters],
    queryFn: () => listGlobalRecruitments(filters),
    staleTime: 20 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['global-recruitments'] });

  const saveMutation = useMutation({
    mutationFn: (payload: GlobalRecruitmentPostPayload) =>
      editingPost ? updateGlobalRecruitment(editingPost.id, payload) : createGlobalRecruitment(payload),
    onSuccess: () => {
      setShowForm(false);
      setEditingPost(null);
      setForm(initialForm);
      setTagText(initialForm.tags?.join('，') ?? '');
      invalidate();
    },
  });

  const responseMutation = useMutation({
    mutationFn: (postId: string) => respondGlobalRecruitment(postId, { message: responseMessage, contactNote: responseContact }),
    onSuccess: () => {
      setResponsePostId(null);
      setResponseMessage('');
      setResponseContact('');
      invalidate();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ post, nextStatus }: { post: GlobalRecruitmentPostView; nextStatus: 'OPEN' | 'CLOSED' }) =>
      updateGlobalRecruitment(post.id, { status: nextStatus }),
    onSuccess: invalidate,
  });

  const responseStatusMutation = useMutation({
    mutationFn: ({ postId, responseId, nextStatus }: { postId: string; responseId: string; nextStatus: GlobalRecruitmentResponseStatus }) =>
      updateGlobalRecruitmentResponse(postId, responseId, nextStatus),
    onSuccess: invalidate,
  });

  const reportMutation = useMutation({
    mutationFn: (postId: string) => reportGlobalRecruitment(postId, { reason: reportReason, note: reportNote }),
    onSuccess: () => {
      setReportPostId(null);
      setReportReason('HARASSMENT');
      setReportNote('');
    },
  });

  const openCreateForm = () => {
    setEditingPost(null);
    setForm(initialForm);
    setTagText(initialForm.tags?.join('，') ?? '');
    setShowForm(true);
  };

  const openEditForm = (post: GlobalRecruitmentPostView) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      sourceType: post.sourceType,
      roomPublicId: post.roomId ?? '',
      systemOrTheme: post.systemOrTheme,
      playFormat: post.playFormat,
      locationOrPlatform: post.locationOrPlatform,
      scheduleText: post.scheduleText,
      playerCountMin: post.playerCountMin,
      playerCountMax: post.playerCountMax,
      experienceRequirement: post.experienceRequirement,
      contactMethod: post.contactMethod,
      contactVisibility: post.contactVisibility,
      status: post.rawStatus,
      description: post.description,
      safetyNote: post.safetyNote,
      tags: post.tags,
      expiresAt: toDateTimeLocalValue(post.expiresAt),
    });
    setTagText(post.tags.join('，'));
    setShowForm(true);
  };

  const submitForm = () => {
    saveMutation.mutate({
      ...form,
      playerCountMin: Number(form.playerCountMin) || 1,
      playerCountMax: Number(form.playerCountMax) || Number(form.playerCountMin) || 1,
      tags: splitTags(tagText),
      expiresAt: toIsoOrNull(form.expiresAt),
    });
  };

  const openCount = posts.filter(post => post.status === 'OPEN').length;
  const internalCount = posts.filter(post => post.sourceType === 'INTERNAL_ROOM').length;
  const externalCount = posts.filter(post => post.sourceType === 'EXTERNAL_EVENT').length;

  return (
    <PageShell
      className="global-recruitment-page"
      eyebrow="PUBLIC RECRUITMENT LEDGER"
      title="招募板"
      description="发布或寻找站内、站外、线上、线下的跑团招募。外部活动可以独立存在，不需要绑定沉没之城房间。"
      actions={
        <div className="global-recruitment-ledger" aria-label="招募板摘要">
          <span><b>{openCount}</b><small>当前可报名</small></span>
          <span><b>{internalCount}</b><small>站内房间</small></span>
          <span><b>{externalCount}</b><small>外部活动</small></span>
        </div>
      }
      aside={
        <div className="global-recruitment-aside">
          <Surface variant="panel" material="archive" padding="md" className="global-recruitment-note">
            <h2><ShieldAlert size={15} /> 联系边界</h2>
            <p>发布者可以选择公开、登录可见或报名后可见。建议默认使用“报名后可见”，先通过简短说明确认时间、题材和安全边界。</p>
          </Surface>
          <Surface variant="panel" material="archive" padding="md" className="global-recruitment-note">
            <h2><ClipboardList size={15} /> 作者管理</h2>
            <p>作者可以编辑、关闭或重开自己的招募，并处理报名。关闭只影响全站招募板，不会改变房间成员、邀请、准备度或生命周期。</p>
          </Surface>
          <Surface variant="panel" material="archive" padding="md" className="global-recruitment-note">
            <h2><AlertTriangle size={15} /> 举报路径</h2>
            <p>每条招募都可记录骚扰、垃圾信息、不实内容或安全风险举报。V1 只做最低限度记录，后续后台审核另开范围。</p>
          </Surface>
        </div>
      }
    >
      <Surface variant="panel" material="archive" padding="md" className="global-recruitment-toolbar">
        <div className="global-recruitment-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索系统、题材、地点或说明"
          />
        </div>
        <div className="global-recruitment-filter-row" aria-label="招募筛选">
          {(['OPEN', 'CLOSED', 'EXPIRED', 'ALL'] as const).map(item => (
            <button key={item} type="button" aria-pressed={status === item} onClick={() => setStatus(item)}>
              {item === 'ALL' ? '全部' : statusLabels[item]}
            </button>
          ))}
        </div>
        <div className="global-recruitment-filter-row" aria-label="来源筛选">
          {(['ALL', 'INTERNAL_ROOM', 'EXTERNAL_EVENT'] as const).map(item => (
            <button key={item} type="button" aria-pressed={sourceType === item} onClick={() => setSourceType(item)}>
              {item === 'ALL' ? '全部来源' : sourceLabels[item]}
            </button>
          ))}
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openCreateForm}>发布招募</Button>
      </Surface>

      {showForm && (
        <Surface variant="panel" material="archive" padding="lg" className="global-recruitment-form">
          <div className="global-recruitment-section-title">
            <h2>{editingPost ? '编辑招募' : '发布招募'}</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="关闭表单"><X size={18} /></button>
          </div>
          <div className="global-recruitment-form-grid">
            <label>
              标题
              <input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="雾港失踪案长团招募" />
            </label>
            <label>
              类型
              <select value={form.sourceType} onChange={event => setForm({ ...form, sourceType: event.target.value as GlobalRecruitmentSourceType })}>
                <option value="EXTERNAL_EVENT">外部活动</option>
                <option value="INTERNAL_ROOM">站内房间</option>
              </select>
            </label>
            {form.sourceType === 'INTERNAL_ROOM' && (
              <label>
                站内房间短 ID
                <input value={form.roomPublicId ?? ''} onChange={event => setForm({ ...form, roomPublicId: event.target.value })} placeholder="例如 A1B2C3" />
              </label>
            )}
            <label>
              系统或题材
              <input value={form.systemOrTheme} onChange={event => setForm({ ...form, systemOrTheme: event.target.value })} placeholder="CoC7 / DND5E / 原创怪谈" />
            </label>
            <label>
              形式
              <input value={form.playFormat} onChange={event => setForm({ ...form, playFormat: event.target.value })} placeholder="线上文字 / 线上语音 / 线下面团" />
            </label>
            <label>
              地点或平台
              <input value={form.locationOrPlatform} onChange={event => setForm({ ...form, locationOrPlatform: event.target.value })} placeholder="沉没之城房间 / Discord / 上海线下" />
            </label>
            <label>
              时间
              <input value={form.scheduleText} onChange={event => setForm({ ...form, scheduleText: event.target.value })} placeholder="每周六 20:00，预计 4 次" />
            </label>
            <label>
              人数下限
              <input type="number" min={1} max={20} value={form.playerCountMin} onChange={event => setForm({ ...form, playerCountMin: Number(event.target.value) })} />
            </label>
            <label>
              人数上限
              <input type="number" min={1} max={20} value={form.playerCountMax} onChange={event => setForm({ ...form, playerCountMax: Number(event.target.value) })} />
            </label>
            <label>
              经验要求
              <input value={form.experienceRequirement ?? ''} onChange={event => setForm({ ...form, experienceRequirement: event.target.value })} placeholder="新手友好 / 需熟悉规则 / 需稳定出勤" />
            </label>
            <label>
              联系方式
              <input value={form.contactMethod} onChange={event => setForm({ ...form, contactMethod: event.target.value })} placeholder="站内私信、QQ、Discord 或邮箱" />
            </label>
            <label>
              联系方式公开范围
              <select value={form.contactVisibility} onChange={event => setForm({ ...form, contactVisibility: event.target.value as GlobalRecruitmentContactVisibility })}>
                <option value="RESPONDERS">报名后可见</option>
                <option value="LOGGED_IN">登录可见</option>
                <option value="PUBLIC">公开显示</option>
              </select>
            </label>
            <label>
              过期时间
              <input type="datetime-local" value={form.expiresAt ?? ''} onChange={event => setForm({ ...form, expiresAt: event.target.value })} />
            </label>
            <label>
              标签（逗号分隔）
              <input value={tagText} onChange={event => setTagText(event.target.value)} placeholder="新手友好，长团，恐怖氛围" />
            </label>
            <label className="global-recruitment-form-wide">
              说明
              <textarea value={form.description ?? ''} onChange={event => setForm({ ...form, description: event.target.value })} rows={5} placeholder="写清楚故事基调、节奏、报名期望和不适合的人群。" />
            </label>
            <label className="global-recruitment-form-wide">
              安全与防骚扰说明
              <textarea value={form.safetyNote ?? ''} onChange={event => setForm({ ...form, safetyNote: event.target.value })} rows={3} />
            </label>
          </div>
          {saveMutation.error && <div className="global-recruitment-error">{(saveMutation.error as Error).message}</div>}
          <div className="global-recruitment-form-actions">
            <Button variant="ghost" onClick={() => setShowForm(false)}>取消</Button>
            <Button variant="primary" loading={saveMutation.isPending} onClick={submitForm}>
              {editingPost ? '保存修改' : '发布'}
            </Button>
          </div>
        </Surface>
      )}

      <div className="global-recruitment-list">
        {isLoading ? (
          <Surface variant="panel" material="archive" padding="lg" className="global-recruitment-empty">正在翻阅招募卷宗...</Surface>
        ) : posts.length === 0 ? (
          <Surface variant="panel" material="archive" padding="lg" className="global-recruitment-empty">
            当前筛选下暂无招募。你可以放宽筛选，或发布一条新的招募。
          </Surface>
        ) : (
          posts.map(post => (
            <RecruitmentPostCard
              key={post.id}
              post={post}
              onEdit={() => openEditForm(post)}
              onToggleStatus={() => statusMutation.mutate({ post, nextStatus: post.rawStatus === 'OPEN' ? 'CLOSED' : 'OPEN' })}
              onRespond={() => setResponsePostId(post.id)}
              onReport={() => setReportPostId(post.id)}
              onReview={(responseId, nextStatus) => responseStatusMutation.mutate({ postId: post.id, responseId, nextStatus })}
            />
          ))
        )}
      </div>

      {responsePostId && (
        <InlineDialog title="报名或联系" onClose={() => setResponsePostId(null)}>
          <label>
            给发起人的说明
            <textarea value={responseMessage} onChange={event => setResponseMessage(event.target.value)} rows={4} placeholder="说明你的经验、偏好、可参与时间。" />
          </label>
          <label>
            你的联系方式或备注
            <input value={responseContact} onChange={event => setResponseContact(event.target.value)} placeholder="可留站内私信偏好、邮箱或其他方式" />
          </label>
          {responseMutation.error && <div className="global-recruitment-error">{(responseMutation.error as Error).message}</div>}
          <div className="global-recruitment-form-actions">
            <Button variant="ghost" onClick={() => setResponsePostId(null)}>取消</Button>
            <Button variant="primary" loading={responseMutation.isPending} onClick={() => responseMutation.mutate(responsePostId)}>发送</Button>
          </div>
        </InlineDialog>
      )}

      {reportPostId && (
        <InlineDialog title="举报招募" onClose={() => setReportPostId(null)}>
          <label>
            原因
            <select value={reportReason} onChange={event => setReportReason(event.target.value as GlobalRecruitmentReportReason)}>
              <option value="HARASSMENT">骚扰或越界联系</option>
              <option value="SPAM">垃圾信息</option>
              <option value="MISLEADING">内容不实</option>
              <option value="UNSAFE">安全风险</option>
              <option value="OTHER">其他</option>
            </select>
          </label>
          <label>
            补充说明
            <textarea value={reportNote} onChange={event => setReportNote(event.target.value)} rows={4} />
          </label>
          <div className="global-recruitment-form-actions">
            <Button variant="ghost" onClick={() => setReportPostId(null)}>取消</Button>
            <Button variant="danger" loading={reportMutation.isPending} onClick={() => reportMutation.mutate(reportPostId)}>提交举报</Button>
          </div>
        </InlineDialog>
      )}
    </PageShell>
  );
}

function RecruitmentPostCard({
  post,
  onEdit,
  onToggleStatus,
  onRespond,
  onReport,
  onReview,
}: {
  post: GlobalRecruitmentPostView;
  onEdit: () => void;
  onToggleStatus: () => void;
  onRespond: () => void;
  onReport: () => void;
  onReview: (responseId: string, nextStatus: GlobalRecruitmentResponseStatus) => void;
}) {
  const canRespond = !post.canManage && post.status === 'OPEN';

  return (
    <Surface variant="panel" material="archive" padding="lg" className="global-recruitment-card">
      <div className="global-recruitment-card-head">
        <div className="min-w-0">
          <div className="global-recruitment-card-meta">
            <span data-source={post.sourceType}>{sourceLabels[post.sourceType]}</span>
            <span data-status={post.status}>{statusLabels[post.status]}</span>
            {post.roomId && <span>房间 {post.roomId}</span>}
          </div>
          <h2>{post.title}</h2>
          <p>{post.description || '发起人尚未补充详细说明。'}</p>
        </div>
        <div className="global-recruitment-card-actions">
          {post.canManage ? (
            <>
              <Button variant="ghost" size="sm" onClick={onEdit}>编辑</Button>
              <Button variant={post.rawStatus === 'OPEN' ? 'danger' : 'secondary'} size="sm" onClick={onToggleStatus}>
                {post.rawStatus === 'OPEN' ? '关闭' : '重开'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" size="sm" disabled={!canRespond} onClick={onRespond} icon={<MessageSquare size={15} />}>
                {post.ownResponse ? '更新报名' : '报名/联系'}
              </Button>
              <Button variant="icon" aria-label="举报" title="举报" onClick={onReport}>
                <ShieldAlert size={16} />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="global-recruitment-facts">
        <span><Megaphone size={14} />{post.systemOrTheme}</span>
        <span><Users size={14} />{post.playerCountMin}-{post.playerCountMax} 人</span>
        <span><MapPin size={14} />{post.locationOrPlatform}</span>
        <span><CalendarClock size={14} />{post.scheduleText}</span>
      </div>

      <div className="global-recruitment-detail-grid">
        <div>
          <h3>经验要求</h3>
          <p>{post.experienceRequirement || '未特别限制。'}</p>
        </div>
        <div>
          <h3>联系方式</h3>
          {post.contactLocked ? (
            <p className="global-recruitment-locked"><Lock size={14} /> {visibilityLabels[post.contactVisibility]}，报名后或由作者处理后查看。</p>
          ) : (
            <p>{post.contactMethod}</p>
          )}
        </div>
        <div>
          <h3>安全边界</h3>
          <p>{post.safetyNote || '未填写。报名前建议主动沟通题材边界与缺席规则。'}</p>
        </div>
        <div>
          <h3>状态</h3>
          <p>{post.responseCount} 条报名/联系 · {formatTimeAgo(post.updatedAt)} 更新</p>
        </div>
      </div>

      {post.tags.length > 0 && (
        <div className="global-recruitment-tags">
          {post.tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
      )}

      {post.ownResponse && !post.canManage && (
        <div className="global-recruitment-own-response">
          <Check size={15} />
          <span>你的报名状态：{responseLabels[post.ownResponse.status]}</span>
        </div>
      )}

      {post.canManage && post.responses.length > 0 && (
        <div className="global-recruitment-responses">
          <h3>报名记录</h3>
          {post.responses.map(response => (
            <div key={response.id} className="global-recruitment-response-row">
              <div>
                <b>{response.responderName}</b>
                <span>{responseLabels[response.status]} · {formatTimeAgo(response.createdAt)}</span>
                {response.message && <p>{response.message}</p>}
                {response.contactNote && <p>联系方式：{response.contactNote}</p>}
              </div>
              <div>
                <button type="button" onClick={() => onReview(response.id, 'ACCEPTED')}>接纳</button>
                <button type="button" onClick={() => onReview(response.id, 'DECLINED')}>婉拒</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}

function InlineDialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="global-recruitment-dialog-backdrop">
      <Surface variant="panel" material="archive" padding="lg" className="global-recruitment-dialog">
        <div className="global-recruitment-section-title">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="关闭"><X size={18} /></button>
        </div>
        <div className={cn('global-recruitment-dialog-body')}>{children}</div>
      </Surface>
    </div>
  );
}
