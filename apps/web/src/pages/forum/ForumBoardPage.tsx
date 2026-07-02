import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { ElementType, ReactNode } from 'react';
import {
  MessageSquare,
  Eye,
  ThumbsUp,
  Pin,
  Lock,
  Plus,
  School,
  Anchor,
  Moon,
  Flame,
  Landmark,
  LayoutGrid,
  Award,
  Clock3,
  UserRound,
  ShieldCheck,
  ArrowRight,
  Crown,
  ScrollText,
  ArrowLeft,
} from 'lucide-react';
import {
  getForumBoards,
  getBoardPosts,
  getBoardModerators,
  ForumPostSummary,
} from '../../services/forum.service';
import { formatTimeAgo } from '../../lib/utils';
import { CompactPagination } from '../../components/forum/CompactPagination';
import { useQuery } from '@tanstack/react-query';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { Tooltip } from '../../components/ui/Tooltip';
import { PageShell, Surface } from '@components/system';

const boardIconMap: Record<string, ElementType> = {
  lore: School,
  strategy: Anchor,
  creative: Moon,
  tavern: Flame,
  arkham_hall: Landmark,
};

const BOARD_MODERATOR_TITLES: Record<string, string> = {
  lore: '校长',
  strategy: '行政官',
  creative: '梦主',
  tavern: '老板',
  arkham_hall: '市长',
};

function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode;
  variant?: 'pin' | 'essence' | 'bounty' | 'lock' | 'best' | 'default';
}) {
  const variants: Record<typeof variant, string> = {
    pin: 'border-amber-400/60 text-amber-300 bg-amber-400/10',
    essence: 'border-coc-accent-gold/60 text-coc-accent-gold bg-coc-accent-gold/10',
    bounty: 'border-amber-500/60 text-amber-300 bg-amber-500/10',
    lock: 'border-[var(--coc-border-subtle)] text-[var(--coc-on-surface-muted)] bg-black/10',
    best: 'border-amber-400/60 text-amber-300 bg-amber-400/10',
    default: 'border-[var(--coc-border-subtle)] text-[var(--coc-on-surface-muted)]',
  };

  return (
    <span
      className={`inline-flex min-h-[1.5rem] items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

function PostBadges({ post }: { post: ForumPostSummary }) {
  return (
    <>
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
    </>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex min-h-[2rem] items-center gap-1.5 rounded border border-[var(--coc-border-subtle)] bg-black/15 px-2.5 text-xs text-[var(--coc-on-surface-secondary)]">
      <span className="text-[var(--coc-accent-gold)]">{icon}</span>
      <span className="font-semibold tabular-nums text-[var(--coc-on-surface-primary)]">{value}</span>
      <span className="text-[var(--coc-on-surface-muted)]">{label}</span>
    </span>
  );
}

function PostRow({
  post,
  showLastReply = true,
}: {
  post: ForumPostSummary;
  showLastReply?: boolean;
}) {
  return (
    <Link key={post.id} to={`/forums/${post.id}`} className="group block">
      <Surface
        variant="solid"
        tone={post.isEssence || post.isPinned ? 'gold' : 'neutral'}
        padding="md"
        interactive
        className="forum-post-row"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <PostBadges post={post} />
              <span className="inline-flex items-center gap-1 text-xs text-[var(--coc-on-surface-muted)]">
                <Clock3 size={13} />
                {formatTimeAgo(post.createdAt)}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold leading-snug text-[var(--coc-on-surface-primary)] transition-colors group-hover:text-[var(--coc-accent-gold-strong)] md:text-lg">
                {post.title || '无标题记录'}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--coc-on-surface-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound size={14} className="text-[var(--coc-accent-gold)]" />
                  {post.author.nickname}
                </span>
                {showLastReply && post.lastReplyBy && (
                  <span className="inline-flex items-center gap-1.5 text-[var(--coc-on-surface-muted)]">
                    <MessageSquare size={14} />
                    最后回复 {post.lastReplyBy.nickname} · {formatTimeAgo(post.lastReplyAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
            <Metric icon={<Eye size={14} />} value={post.viewCount} label="阅览" />
            <Metric icon={<ThumbsUp size={14} />} value={post.likeCount} label="赞同" />
            <Metric icon={<MessageSquare size={14} />} value={post.replyCount} label="回复" />
            <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--coc-border-subtle)] text-[var(--coc-accent-gold)] transition-colors group-hover:border-[var(--coc-accent-gold)]">
              <ArrowRight size={16} />
            </span>
          </div>
        </div>
      </Surface>
    </Link>
  );
}

function ThreadSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="coc-section-group">
      <div className="coc-section-group__header">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--coc-on-surface-primary)]">
          <span className="text-[var(--coc-accent-gold)]">{icon}</span>
          {title}
        </h2>
      </div>
      <div className="coc-section-group__body">
        <div className="grid gap-3">{children}</div>
      </div>
    </section>
  );
}

function ModeratorSeat({
  nickname,
  roleTitle,
}: {
  nickname: string;
  roleTitle: string;
}) {
  return (
    <Tooltip content={`${roleTitle} — 该版块的管理者`}>
      <div className="forum-moderator-seat" role="listitem">
        <div className="forum-moderator-seat__sigil" aria-hidden="true">
          <Crown size={18} />
        </div>
        <div className="min-w-0">
          <div className="forum-moderator-seat__role">{roleTitle}</div>
          <div className="forum-moderator-seat__name">{nickname}</div>
        </div>
      </div>
    </Tooltip>
  );
}

export function ForumBoardPage() {
  const { boardKey } = useParams<{ boardKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sort] = useState<'newest' | 'last_reply'>(
    (searchParams.get('sort') as 'newest' | 'last_reply') || 'last_reply'
  );

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));

  const { data: boardsData } = useQuery({
    queryKey: ['forumBoards'],
    queryFn: getForumBoards,
    staleTime: 5 * 60 * 1000,
  });
  const boards = boardsData?.boards || [];

  const { data: boardData, isLoading: loading } = useQuery({
    queryKey: ['boardPosts', boardKey, page, sort],
    queryFn: () =>
      boardKey ? getBoardPosts(boardKey, page, 20, sort) : Promise.resolve(null),
    enabled: !!boardKey,
    staleTime: 30 * 1000,
  });

  const { data: modData } = useQuery({
    queryKey: ['boardModerators', boardKey],
    queryFn: () =>
      boardKey
        ? getBoardModerators(boardKey).catch(() => ({ moderators: [] }))
        : Promise.resolve({ moderators: [] }),
    enabled: !!boardKey,
    staleTime: 60 * 1000,
  });

  const pinnedPosts = boardData?.pinnedPosts || [];
  const essencePosts = boardData?.essencePosts || [];
  const posts = boardData?.posts || [];
  const pagination = boardData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };
  const moderators = modData?.moderators || [];

  const boardName = boards.find((b) => b.key === boardKey)?.name || boardKey;
  const boardDescription = boards.find((b) => b.key === boardKey)?.description || '版块主题、置顶、精华与最近回复。';
  const BoardIcon = boardIconMap[boardKey || ''] || LayoutGrid;
  const visibleThreadCount = pinnedPosts.length + essencePosts.length + posts.length;

  const handlePageChange = (newPage: number) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('page', String(newPage));
    setSearchParams(sp);
  };

  const setSortValue = (value: 'newest' | 'last_reply') => {
    const sp = new URLSearchParams(searchParams);
    sp.set('sort', value);
    sp.set('page', '1');
    setSearchParams(sp);
  };

  const aside = (
    <div className="coc-section-stack">
      <Surface variant="solid" tone="gold" padding="md" className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded border border-[var(--coc-border-strong)] bg-black/20 text-[var(--coc-accent-gold)]">
            <LayoutGrid size={20} />
          </span>
          <div>
            <div className="text-xs font-bold uppercase text-[var(--coc-accent-gold-strong)]">board overview</div>
            <div className="text-base font-bold text-[var(--coc-on-surface-primary)]">版块概览</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric icon={<LayoutGrid size={14} />} value={pagination.total} label="主题" />
          <Metric icon={<Pin size={14} />} value={pinnedPosts.length} label="置顶" />
          <Metric icon={<Award size={14} />} value={essencePosts.length} label="精华" />
          <Metric icon={<MessageSquare size={14} />} value={visibleThreadCount} label="本页" />
        </div>
      </Surface>

      <Surface variant="panel" padding="md" className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--coc-on-surface-primary)]">
          <ShieldCheck size={16} className="text-[var(--coc-accent-gold)]" />
          版务席位
        </div>
        <p className="text-sm leading-6 text-[var(--coc-on-surface-secondary)]">
          这里显示本版的执印者。置顶、精华与秩序维护由席位成员负责。
        </p>
        <div className="grid gap-3" role="list" aria-label="版主与管理员席位">
          {moderators.length > 0 ? (
            moderators.map((mod, index) => (
              <ModeratorSeat
                key={mod.id}
                nickname={mod.nickname}
                roleTitle={
                  index === 0 && mod.nickname === '管理员'
                    ? '首席管理员'
                    : BOARD_MODERATOR_TITLES[boardKey || ''] || '版主'
                }
              />
            ))
          ) : (
            <div className="forum-moderator-seat forum-moderator-seat--empty" role="listitem">
              <div className="forum-moderator-seat__sigil" aria-hidden="true">
                <Crown size={18} />
              </div>
              <div>
                <div className="forum-moderator-seat__role">
                  {BOARD_MODERATOR_TITLES[boardKey || ''] || '版主'}
                </div>
                <div className="forum-moderator-seat__name">席位虚位以待</div>
              </div>
            </div>
          )}
        </div>
      </Surface>

      <Surface variant="panel" padding="md" className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--coc-on-surface-primary)]">
          <ScrollText size={16} className="text-[var(--coc-accent-gold)]" />
          版块守则
        </div>
        <p className="text-sm leading-6 text-[var(--coc-on-surface-secondary)]">
          置顶与精华优先显示；普通帖子按当前排序规则排列。讨论秩序优先于装饰效果。
        </p>
      </Surface>
    </div>
  );

  return (
    <PageShell
      eyebrow="forum board"
      title={
        <span className="flex items-center gap-2">
          <BoardIcon size={24} className="text-[var(--coc-accent-gold)]" />
          {boardName}
        </span>
      }
      description={boardDescription}
      actions={
        <Link to={`/forums/new?board=${boardKey}`} className="btn-v2 coc-btn-primary flex items-center gap-2">
          <Plus size={16} />
          发布主题
        </Link>
      }
      aside={aside}
      className="forum-board-page"
    >
      <div className="coc-section-stack">
        <Surface variant="panel" padding="sm" className="forum-board-toolbar">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <Link
              to="/forums"
              className="inline-flex min-h-[2.5rem] items-center gap-1.5 text-[var(--coc-on-surface-muted)] hover:text-[var(--coc-accent-gold-strong)]"
            >
              <ArrowLeft size={15} />
              旧日低语
            </Link>
            <span className="text-[var(--coc-on-surface-muted)]">/</span>
            <span className="flex min-w-0 items-center gap-1.5 text-[var(--coc-on-surface-muted)]">
              <LayoutGrid size={15} className="shrink-0 text-[var(--coc-accent-gold)]" />
              <span className="truncate">当前版块</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortValue('last_reply')}
              className={`btn-v2 min-h-[2.5rem] rounded border px-3 text-sm transition-colors ${
                sort === 'last_reply'
                  ? 'border-coc-gold bg-coc-gold text-coc-abyss'
                  : 'border-[var(--coc-border-subtle)] text-[var(--coc-on-surface-primary)] hover:border-[var(--coc-accent-gold)]'
              }`}
            >
              最后回复
            </button>
            <button
              type="button"
              onClick={() => setSortValue('newest')}
              className={`btn-v2 min-h-[2.5rem] rounded border px-3 text-sm transition-colors ${
                sort === 'newest'
                  ? 'border-coc-gold bg-coc-gold text-coc-abyss'
                  : 'border-[var(--coc-border-subtle)] text-[var(--coc-on-surface-primary)] hover:border-[var(--coc-accent-gold)]'
              }`}
            >
              最新发布
            </button>
          </div>
        </Surface>

        {loading ? (
          <div className="grid gap-3">
            <SkeletonCard className="h-28" />
            <SkeletonCard className="h-28" />
            <SkeletonCard className="h-28" />
            <SkeletonCard className="h-28" />
          </div>
        ) : (
          <>
            {pinnedPosts.length > 0 && (
              <ThreadSection title="市政公告 / 置顶" icon={<Pin size={15} />}>
                {pinnedPosts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </ThreadSection>
            )}

            {essencePosts.length > 0 && (
              <ThreadSection title="典藏记录 / 精华" icon={<Award size={15} />}>
                {essencePosts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </ThreadSection>
            )}

            <ThreadSection title="所有低语" icon={<MessageSquare size={15} />}>
              {posts.length === 0 && pinnedPosts.length === 0 && essencePosts.length === 0 ? (
                <Surface variant="solid" padding="lg" className="forum-empty-state text-center">
                  <div className="text-base font-bold text-[var(--coc-on-surface-primary)]">该版块暂无帖子</div>
                  <p className="mt-2 text-sm text-[var(--coc-on-surface-secondary)]">来发布第一条记录吧。</p>
                  <Link
                    to={`/forums/new?board=${boardKey}`}
                    className="btn-v2 coc-btn-primary mt-4 inline-flex items-center justify-center gap-2"
                  >
                    <Plus size={15} />
                    发布主题
                  </Link>
                </Surface>
              ) : posts.length === 0 ? (
                <div className="py-5 text-center text-sm text-[var(--coc-on-surface-muted)]">没有更多帖子了</div>
              ) : (
                posts.map((post) => <PostRow key={post.id} post={post} />)
              )}
            </ThreadSection>

            <CompactPagination page={page} totalPages={pagination.totalPages} onChange={handlePageChange} />
          </>
        )}
      </div>
    </PageShell>
  );
}
