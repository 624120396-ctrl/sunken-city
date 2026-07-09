import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ThumbsUp,
  MessageSquare,
  Eye,
  Award,
  Trash2,
  Lock,
  Pin,
  Pencil,
  Clock3,
  UserRound,
  ShieldCheck,
  ScrollText,
} from 'lucide-react';
import { UserProfileModal } from '@components/UserProfileModal';
import {
  getPostDetail,
  createReply,
  updateReply,
  toggleLike,
  setBestReply,
  deletePost,
  deleteReply,
  toggleEssence,
  togglePin,
  updatePost,
  getMyModeratedBoards,
  ForumPostDetail,
  ForumReplyItem,
} from '../../services/forum.service';
import { useAuthStore } from '../../stores/auth.store';
import { formatTimeAgo } from '../../lib/utils';
import { HtmlContent } from '../../components/HtmlContent';
import { RichTextEditor } from '../../components/RichTextEditor';
import { PageShell, Surface } from '@components/system';

function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'pin' | 'essence' | 'bounty' | 'lock' | 'best' | 'default';
}) {
  const variants: Record<typeof variant, string> = {
    pin: 'border-amber-400/60 text-amber-400',
    essence: 'border-coc-accent-gold/60 text-coc-accent-gold',
    bounty: 'border-amber-500/60 text-amber-500 bg-amber-500/10',
    lock: 'border-coc-text-muted text-coc-text-muted',
    best: 'border-amber-400/60 text-amber-400',
    default: 'border-[#3a3a3a]/40 text-coc-text-muted',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

function AvatarWithFrame({
  avatarUrl,
  frameUrl,
  nickname,
  size = 44,
  onClick,
}: {
  avatarUrl?: string;
  frameUrl?: string;
  nickname: string;
  size?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`}
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={nickname}
          className="rounded-full object-cover border border-[#3a3a3a]/40 bg-black/20"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full bg-black/20 border border-[#3a3a3a]/40 flex items-center justify-center text-[#6b6558] font-bold"
          style={{ width: size, height: size }}
        >
          {nickname[0]?.toUpperCase()}
        </div>
      )}
      {frameUrl && (
        <img
          src={frameUrl}
          alt=""
          className="absolute inset-0 pointer-events-none"
          style={{ width: size, height: size, transform: 'scale(1.35)' }}
        />
      )}
    </button>
  );
}

function ThreadMetric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded border border-[var(--coc-border-subtle)] bg-black/15 px-3 py-2">
      <div className="flex items-center gap-2 text-[var(--coc-accent-gold)]">
        {icon}
        <span className="text-lg font-bold tabular-nums text-[var(--coc-on-surface-primary)]">{value}</span>
      </div>
      <div className="mt-1 text-xs text-[var(--coc-on-surface-muted)]">{label}</div>
    </div>
  );
}

function PostAside({
  post,
  canModeratePost,
  onToggleEssence,
  onTogglePin,
}: {
  post: ForumPostDetail;
  canModeratePost: boolean;
  onToggleEssence: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div className="coc-section-stack">
      <Surface variant="solid" tone="gold" padding="md" className="space-y-4">
        <div className="flex items-center gap-3">
          <AvatarWithFrame
            avatarUrl={post.author.avatarUrl}
            frameUrl={post.author.frameUrl}
            nickname={post.author.nickname}
            size={48}
          />
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase text-[var(--coc-accent-gold-strong)]">thread author</div>
            <div className="truncate text-base font-bold text-[var(--coc-on-surface-primary)]">{post.author.nickname}</div>
            <div className="truncate text-xs text-[var(--coc-on-surface-muted)]">
              {post.author.rankName || '未知位阶'}
              {post.author.titleName ? ` · ${post.author.titleName}` : ''}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ThreadMetric icon={<Eye size={15} />} value={post.viewCount} label="阅览" />
          <ThreadMetric icon={<ThumbsUp size={15} />} value={post.likeCount} label="赞同" />
          <ThreadMetric icon={<MessageSquare size={15} />} value={post.replyCount} label="回声" />
          <ThreadMetric icon={<Clock3 size={15} />} value={formatTimeAgo(post.createdAt)} label="誊录" />
        </div>
      </Surface>

      <Surface variant="panel" padding="md" className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--coc-on-surface-primary)]">
          <ScrollText size={16} className="text-[var(--coc-accent-gold)]" />
          线程状态
        </div>
        <div className="flex flex-wrap gap-2">
          {post.isPinned && (
            <Badge variant="pin">
              <Pin size={10} /> 置顶
            </Badge>
          )}
          {post.isEssence && (
            <Badge variant="essence">
              <Award size={10} /> 精华
            </Badge>
          )}
          {post.isLocked && (
            <Badge variant="lock">
              <Lock size={10} /> 锁定
            </Badge>
          )}
          {post.bountyCoin > 0 && <Badge variant="bounty">悬赏 {post.bountyCoin} 锈蚀硬币</Badge>}
          {!post.isPinned && !post.isEssence && !post.isLocked && post.bountyCoin <= 0 && (
            <span className="text-sm text-[var(--coc-on-surface-muted)]">未标注低语</span>
          )}
        </div>

        {canModeratePost && (
          <div className="grid gap-2 border-t border-[var(--coc-border-subtle)] pt-3">
            <button
              type="button"
              onClick={onToggleEssence}
              className="btn-v2 coc-btn-secondary flex min-h-[2.5rem] items-center justify-center gap-2 text-xs"
            >
              <Award size={14} />
              {post.isEssence ? '移出典藏' : '列为典藏'}
            </button>
            <button
              type="button"
              onClick={onTogglePin}
              className="btn-v2 coc-btn-secondary flex min-h-[2.5rem] items-center justify-center gap-2 text-xs"
            >
              <Pin size={14} />
              {post.isPinned ? '撤下告示' : '列为告示'}
            </button>
          </div>
        )}
      </Surface>

      <Surface variant="panel" padding="md" className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--coc-on-surface-primary)]">
          <ShieldCheck size={16} className="text-[var(--coc-accent-gold)]" />
          版务提示
        </div>
        <p className="text-sm leading-6 text-[var(--coc-on-surface-secondary)]">
          原始记录与回声在稳定阅读层中显示；危险操作只在作者或版务权限下开放。
        </p>
      </Surface>
    </div>
  );
}

export function ForumPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [post, setPost] = useState<ForumPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<NonNullable<ForumPostDetail['author']> | null>(null);
  const [editingPost, setEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState('');
  const [editReplyId, setEditReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState('');
  const [meModeratorBoards, setMeModeratorBoards] = useState<string[]>([]);

  const fetchPost = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await getPostDetail(postId);
      setPost(res.post);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
    if (user?.id) {
      getMyModeratedBoards()
        .then((data) => setMeModeratorBoards(data.boardKeys))
        .catch(() => setMeModeratorBoards([]));
    }
  }, [postId, user?.id]);

  const handleLike = async () => {
    if (!post) return;
    try {
      const res = await toggleLike(post.id);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              hasLiked: res.liked,
              likeCount: prev.likeCount + (res.liked ? 1 : -1),
            }
          : prev
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async () => {
    if (!postId || !replyContent.trim()) return;
    setSubmitting(true);
    try {
      await createReply(postId, replyContent.trim());
      setReplyContent('');
      await fetchPost();
    } catch (err) {
      alert('回声未能封存');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBestReply = async (replyId: string) => {
    if (!post) return;
    try {
      await setBestReply(post.id, replyId);
      await fetchPost();
    } catch (err: any) {
      alert(err.message || '标记未能写入');
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (!confirm('确定要删除这则低语吗？此操作不可撤销。')) return;
    try {
      await deletePost(post.id);
      navigate('/forums');
    } catch (err: any) {
      alert(err.message || '删除未能完成');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('确定要删除这段回声吗？此操作不可撤销。')) return;
    try {
      await deleteReply(replyId);
      await fetchPost();
    } catch (err: any) {
      alert(err.message || '删除未能完成');
    }
  };

  const handleUpdatePost = async () => {
    if (!post || !editPostContent.trim()) return;
    try {
      await updatePost(post.id, { content: editPostContent.trim() });
      setEditingPost(false);
      await fetchPost();
    } catch (err: any) {
      alert(err.message || '修订未能保存');
    }
  };

  const handleUpdateReply = async (replyId: string) => {
    if (!editReplyContent.trim()) return;
    try {
      await updateReply(replyId, editReplyContent.trim());
      setEditReplyId(null);
      setEditReplyContent('');
      await fetchPost();
    } catch (err: any) {
      alert(err.message || '修订未能保存');
    }
  };

  const handleToggleEssence = async () => {
    if (!post) return;
    try {
      await toggleEssence(post.id);
      await fetchPost();
    } catch (err: any) {
      alert(err.message || '标记未能写入');
    }
  };

  const handleTogglePin = async () => {
    if (!post) return;
    try {
      await togglePin(post.id);
      await fetchPost();
    } catch (err: any) {
      alert(err.message || '标记未能写入');
    }
  };

  const isAuthor = post?.author.id === user?.id;
  const isAdmin = user?.isAdmin;
  const isBoardModerator = post?.board.key ? meModeratorBoards.includes(post.board.key) : false;
  const canModeratePost = isAdmin || isBoardModerator;

  return (
    <PageShell
      eyebrow="低语档案"
      title={post?.title || '加载中...'}
      description="原始记录、回声档案与版务标记会被安置在稳定可读层中。"
      actions={
        (isAuthor || canModeratePost) && (
          <button
            type="button"
            onClick={handleDeletePost}
            aria-label="删除低语"
            title="删除低语"
            className="btn-v2 inline-flex min-h-[2.5rem] items-center gap-2 rounded border border-[var(--coc-border-danger)] px-3 text-sm text-red-300 hover:text-red-200"
          >
            <Trash2 size={18} />
            删除
          </button>
        )
      }
      aside={
        post ? (
          <PostAside
            post={post}
            canModeratePost={!!canModeratePost}
            onToggleEssence={handleToggleEssence}
            onTogglePin={handleTogglePin}
          />
        ) : undefined
      }
      className="forum-post-page"
    >
      <Surface variant="panel" padding="sm" className="forum-thread-breadcrumb">
        <Link
          to={post?.board.key ? `/forums/board/${post.board.key}` : '/forums'}
          className="coc-btn-secondary inline-flex min-h-[2.5rem] items-center justify-center p-2"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[#6b6558]">
            {post ? (
              <>
                <Link to="/forums" className="hover:text-[#e8d4a0]">旧日低语</Link>
                <span className="mx-1">/</span>
                <Link to={`/forums/board/${post.board.key}`} className="hover:text-[#e8d4a0]">{post.board.name}</Link>
              </>
            ) : (
              '旧日低语'
            )}
          </div>
        </div>
      </Surface>

      {loading || !post ? (
        <div className="text-center py-12 text-[#6b6558]">加载中...</div>
      ) : (
        <div className="coc-section-stack">
          {/* 原始记录 */}
          <Surface variant="solid" tone="gold" padding="lg" className="forum-thread-card space-y-4">
            <div className="text-xs font-semibold text-[var(--coc-accent-gold-strong)]">原始记录</div>
            <div className="flex items-start gap-3">
              <AvatarWithFrame
                avatarUrl={post.author.avatarUrl}
                frameUrl={post.author.frameUrl}
                nickname={post.author.nickname}
                onClick={() => setSelectedProfileUser(post.author)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedProfileUser(post.author)}
                      className="text-sm font-bold text-[#e8d4a0] hover:text-[#c9a227] transition-colors"
                    >
                      {post.author.nickname}
                    </button>
                    {post.isPinned && (
                      <Badge variant="pin">
                        <Pin size={10} /> 置顶
                      </Badge>
                    )}
                    {post.isEssence && (
                      <Badge variant="essence">
                        <Award size={10} /> 精华
                      </Badge>
                    )}
                    {post.isLocked && (
                      <Badge variant="lock">
                        <Lock size={10} /> 锁定
                      </Badge>
                    )}
                    {post.bountyCoin > 0 && (
                      <Badge variant="bounty">悬赏 {post.bountyCoin} 锈蚀硬币</Badge>
                    )}
                  </div>
                  <div className="text-xs text-[#6b6558] whitespace-nowrap">
                    {formatTimeAgo(post.createdAt)}
                    {post.updatedAt !== post.createdAt && ` · 编辑于 ${formatTimeAgo(post.updatedAt)}`}
                  </div>
                </div>
                <div className="text-xs text-[#6b6558] mt-0.5">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound size={13} />
                    {post.author.rankName || '未知位阶'}
                  </span>
                  {post.author.titleName && (
                    <span style={{ color: post.author.titleColor || '#a69b85' }}> · {post.author.titleName}</span>
                  )}
                </div>
              </div>
            </div>

            {editingPost ? (
              <div className="space-y-2">
                <RichTextEditor
                  value={editPostContent}
                  onChange={setEditPostContent}
                  minHeight="160px"
                />
                <div className="flex items-center gap-2">
                  <button onClick={handleUpdatePost} className="coc-btn-primary">保存</button>
                  <button
                    onClick={() => {
                      setEditingPost(false);
                      setEditPostContent(post.content);
                    }}
                    className="coc-btn-secondary"
                  >取消</button>
                </div>
              </div>
            ) : (
              <HtmlContent className="forum-thread-body" html={post.content} />
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    post.hasLiked ? 'text-coc-accent-gold' : 'text-[#6b6558] hover:text-[#e8d4a0]'
                  }`}
                >
                  <ThumbsUp size={16} /> {post.likeCount}
                </button>
                <span className="flex items-center gap-1.5 text-sm text-[#6b6558]">
                  <Eye size={16} /> {post.viewCount}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-[#6b6558]">
                  <MessageSquare size={16} /> {post.replyCount}
                </span>
              </div>
              {(isAuthor || isAdmin || canModeratePost) && (
                <div className="flex items-center gap-2">
                  {(isAuthor || isAdmin) && (
                    <button
                      onClick={() => {
                        setEditPostContent(post.content);
                        setEditingPost(true);
                      }}
                      className="text-xs text-[#6b6558] hover:text-[#e8d4a0] flex items-center gap-1"
                    >
                      <Pencil size={12} /> 编辑
                    </button>
                  )}
                </div>
              )}
            </div>
          </Surface>

          {/* 回声档案 */}
          <section className="coc-section-group">
            <div className="coc-section-group__header">
              <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--coc-on-surface-primary)]">
                <MessageSquare size={15} className="text-[var(--coc-accent-gold)]" />
                回声档案
              </h2>
              <span className="text-xs text-[var(--coc-on-surface-muted)]">{post.replies.length} 段回声</span>
            </div>
            <div className="coc-section-group__body">
              {post.replies.length === 0 ? (
                <Surface variant="solid" padding="lg" className="text-center">
                  <div className="text-base font-bold text-[var(--coc-on-surface-primary)]">尚无回声</div>
                  <p className="mt-2 text-sm text-[var(--coc-on-surface-secondary)]">写下第一段回声，或继续观察这条低语。</p>
                </Surface>
              ) : (
                <div className="grid gap-3">
                  {post.replies.map((reply) => (
                    <ReplyItem
                      key={reply.id}
                      reply={reply}
                      post={post}
                      currentUserId={user?.id}
                      isAdmin={!!isAdmin}
                      isAuthor={isAuthor}
                      isBoardModerator={isBoardModerator}
                      onBest={() => handleBestReply(reply.id)}
                      onDelete={() => handleDeleteReply(reply.id)}
                      onAuthorClick={() => setSelectedProfileUser(reply.author)}
                      editing={editReplyId === reply.id}
                      editContent={editReplyContent}
                      onStartEdit={(content) => {
                        setEditReplyId(reply.id);
                        setEditReplyContent(content);
                      }}
                      onChangeEdit={setEditReplyContent}
                      onSaveEdit={() => handleUpdateReply(reply.id)}
                      onCancelEdit={() => {
                        setEditReplyId(null);
                        setEditReplyContent('');
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 誊写回声 */}
          {!post.isLocked && (
            <section className="coc-section-group">
              <div className="coc-section-group__header">
                <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--coc-on-surface-primary)]">
                  <Pencil size={15} className="text-[var(--coc-accent-gold)]" />
                  誊写回声
                </h2>
              </div>
              <div className="coc-section-group__body">
                <Surface variant="solid" padding="md" className="forum-reply-editor space-y-3">
                  <RichTextEditor
                    value={replyContent}
                    onChange={setReplyContent}
                    placeholder="将你听见的回声誊写在此..."
                    minHeight="160px"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleReply}
                      disabled={submitting || !replyContent.trim()}
                      className="coc-btn-primary disabled:opacity-50"
                    >
                      {submitting ? '封存中...' : '封存回声'}
                    </button>
                  </div>
                </Surface>
              </div>
            </section>
          )}

          <UserProfileModal
            user={selectedProfileUser}
            isOpen={!!selectedProfileUser}
            onClose={() => setSelectedProfileUser(null)}
          />
        </div>
      )}
    </PageShell>
  );
}

function ReplyItem({
  reply,
  post,
  currentUserId,
  isAdmin,
  isAuthor,
  isBoardModerator,
  onBest,
  onDelete,
  onAuthorClick,
  editing,
  editContent,
  onStartEdit,
  onChangeEdit,
  onSaveEdit,
  onCancelEdit,
}: {
  reply: ForumReplyItem;
  post: ForumPostDetail;
  currentUserId?: string;
  isAdmin: boolean;
  isAuthor: boolean;
  isBoardModerator: boolean;
  onBest: () => void;
  onDelete: () => void;
  onAuthorClick?: () => void;
  editing: boolean;
  editContent: string;
  onStartEdit: (content: string) => void;
  onChangeEdit: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const canMarkBest = isAuthor || isAdmin;
  const canEdit = reply.author.id === currentUserId || isAdmin;
  const canDelete = reply.author.id === currentUserId || isAdmin || isBoardModerator;
  const isLandlord = reply.author.id === post.author.id;

  return (
    <Surface
      variant="solid"
      tone={reply.isBestReply ? 'gold' : 'neutral'}
      padding="md"
      className={`forum-reply-card ${reply.isBestReply ? 'border-amber-500/40 relative overflow-hidden' : ''}`}
    >
      {reply.isBestReply && (
        <div className="absolute top-0 left-0 bg-amber-500 text-coc-abyss text-[10px] px-2 py-0.5 rounded-br flex items-center gap-1 font-bold">
          <Award size={10} /> 最佳回声
        </div>
      )}
      <div className={`flex items-start gap-3 ${reply.isBestReply ? 'pt-5' : ''}`}>
        <AvatarWithFrame
          avatarUrl={reply.author.avatarUrl}
          frameUrl={reply.author.frameUrl}
          nickname={reply.author.nickname}
          size={40}
          onClick={onAuthorClick}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onAuthorClick}
                className={`text-sm font-bold hover:text-[#c9a227] transition-colors ${
                  isLandlord ? 'text-amber-400' : 'text-coc-parchment'
                }`}
              >
                {reply.author.nickname}
              </button>
              {isLandlord && (
                <Badge variant="pin"><Pin size={10} /> 原记录者</Badge>
              )}
            </div>
            <div className="text-xs text-[#6b6558] whitespace-nowrap">
              {formatTimeAgo(reply.createdAt)}
              {reply.updatedAt !== reply.createdAt && ` · 修订于 ${formatTimeAgo(reply.updatedAt)}`}
            </div>
          </div>
          <div className="text-xs text-[#6b6558] mt-0.5">
            {reply.author.rankName || '未知位阶'}
            {reply.author.titleName && (
              <span style={{ color: reply.author.titleColor || '#a69b85' }}> · {reply.author.titleName}</span>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <RichTextEditor
                value={editContent}
                onChange={onChangeEdit}
                minHeight="120px"
              />
              <div className="flex items-center gap-2">
                <button onClick={onSaveEdit} className="coc-btn-primary text-xs">保存修订</button>
                <button onClick={onCancelEdit} className="coc-btn-secondary text-xs">取消</button>
              </div>
            </div>
          ) : (
            <HtmlContent className="forum-thread-body mt-3" html={reply.content} />
          )}

          {!editing && (
            <div className="flex items-center gap-3 mt-2">
              {canMarkBest && !reply.isBestReply && (
                <button onClick={onBest} className="text-xs text-amber-400 hover:text-amber-300">
                  记为最佳回声
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => onStartEdit(reply.content)}
                  className="text-xs text-[#6b6558] hover:text-[#e8d4a0]"
                >
                  修订
                </button>
              )}
              {canDelete && (
                <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300">
                  删除
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Surface>
  );
}
