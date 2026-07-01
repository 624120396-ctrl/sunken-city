import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
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

const boardIconMap: Record<string, React.ElementType> = {
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
      {post.bountyCoin > 0 && (
        <Badge variant="bounty">悬赏 {post.bountyCoin} 锈蚀硬币</Badge>
      )}
    </>
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
    <Link
      key={post.id}
      to={`/forums/${post.id}`}
      className="group block"
    >
      <Surface
        variant="solid"
        padding="md"
        interactive
        className={`relative overflow-hidden ${post.isEssence ? 'bg-gradient-to-r from-[#c9a227]/5 to-transparent' : ''}`}
      >
        {/* hover 金色竖线 */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-coc-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <PostBadges post={post} />
              <h3 className="font-bold text-[#e8d4a0] truncate">{post.title}</h3>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-4 text-xs text-[#6b6558]">
              <span className="flex items-center gap-1">
                <Eye size={14} /> {post.viewCount}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp size={14} /> {post.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare size={14} /> {post.replyCount}
              </span>
            </div>
            {showLastReply && post.lastReplyBy && (
              <div className="text-xs text-[#6b6558]">
                最后回复：<span className="text-[#e8d4a0]">{post.lastReplyBy.nickname}</span> ·{' '}
                {formatTimeAgo(post.lastReplyAt)}
              </div>
            )}
          </div>
        </div>
      </Surface>
    </Link>
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

  const {
    data: boardData,
    isLoading: loading,
  } = useQuery({
    queryKey: ['boardPosts', boardKey, page, sort],
    queryFn: () =>
      boardKey ? getBoardPosts(boardKey, page, 20, sort) : Promise.resolve(null),
    enabled: !!boardKey,
    staleTime: 30 * 1000,
  });

  const { data: modData } = useQuery({
    queryKey: ['boardModerators', boardKey],
    queryFn: () =>
      boardKey ? getBoardModerators(boardKey).catch(() => ({ moderators: [] })) : Promise.resolve({ moderators: [] }),
    enabled: !!boardKey,
    staleTime: 60 * 1000,
  });

  const pinnedPosts = boardData?.pinnedPosts || [];
  const essencePosts = boardData?.essencePosts || [];
  const posts = boardData?.posts || [];
  const pagination = boardData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };
  const moderators = modData?.moderators || [];

  const boardName = boards.find((b: any) => b.key === boardKey)?.name || boardKey;
  const BoardIcon = boardIconMap[boardKey || ''] || LayoutGrid;

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

  return (
    <PageShell
      eyebrow="forum board"
      title={
        <span className="flex items-center gap-2">
          <BoardIcon size={24} className="text-[var(--coc-accent-gold)]" />
          {boardName}
        </span>
      }
      description="版块主题、置顶、精华与最近回复。"
      actions={
        <Link
          to={`/forums/new?board=${boardKey}`}
          className="btn-v2 coc-btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          发布主题
        </Link>
      }
      contentClassName="max-w-5xl"
    >
      {/* Breadcrumb */}
      <Surface variant="panel" padding="sm" className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/forums" className="text-[#6b6558] hover:text-[#e8d4a0]">旧日低语</Link>
          <span className="text-[#6b6558]">/</span>
          <span className="flex items-center gap-1.5 text-[#e8d4a0] font-bold">
            <BoardIcon size={16} className="text-[#c9a227]" />
            {boardName}
          </span>
        </div>
      </Surface>

      {/* 版主展示 */}
      <Surface variant="panel" tone="gold" padding="sm">
        <div className="flex flex-wrap items-center gap-3">
          {moderators.length > 0 ? (
            moderators.map((mod: any) => (
              <div
                key={mod.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#c9a227]/50 backdrop-blur-md bg-black/60 shadow-sm"
              >
                <span className="text-base text-[#c9a227] font-bold tracking-wide">
                  {BOARD_MODERATOR_TITLES[boardKey || ''] || '版主'}
                </span>
                <Tooltip content={`${BOARD_MODERATOR_TITLES[boardKey || ''] || '版主'} — 该版块的管理者`}>
                  <span className="text-sm text-[#e8d4a0] font-medium cursor-help">{mod.nickname}</span>
                </Tooltip>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#c9a227]/30 backdrop-blur-md bg-black/40">
              <span className="text-base text-[#c9a227]/70 font-bold tracking-wide">
                {BOARD_MODERATOR_TITLES[boardKey || ''] || '版主'}
              </span>
              <span className="text-sm text-[#9b9080]">虚位以待</span>
            </div>
          )}
        </div>
      </Surface>

      <Surface variant="panel" padding="sm" className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setSortValue('last_reply')}
            className={`px-3 py-1.5 rounded border text-sm transition-colors btn-v2 ${
              sort === 'last_reply'
                ? 'bg-coc-gold text-coc-abyss border-coc-gold'
                : 'border-coc-void text-[#e8d4a0] hover:border-coc-gold'
            }`}
          >
            最后回复
          </button>
          <button
            onClick={() => setSortValue('newest')}
            className={`px-3 py-1.5 rounded border text-sm transition-colors btn-v2 ${
              sort === 'newest'
                ? 'bg-coc-gold text-coc-abyss border-coc-gold'
                : 'border-coc-void text-[#e8d4a0] hover:border-coc-gold'
            }`}
          >
            最新发布
          </button>
        </div>
      </Surface>

      {loading ? (
        <div className="space-y-3">
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* 置顶帖 */}
          {pinnedPosts.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Pin size={12} /> 置顶
              </div>
              <div className="space-y-2">
                {pinnedPosts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </div>
            </div>
          )}

          {/* 精华帖 */}
          {essencePosts.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#c9a227] flex items-center gap-1">
                <Award size={12} /> 精华
              </div>
              <div className="space-y-2">
                {essencePosts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </div>
            </div>
          )}

          {/* 普通帖 */}
          <div className="space-y-2">
            {posts.length === 0 && pinnedPosts.length === 0 && essencePosts.length === 0 ? (
              <div className="text-center py-12 text-[#6b6558]">该版块暂无帖子，来发布第一条吧</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-[#6b6558] text-sm">没有更多帖子了</div>
            ) : (
              posts.map((post) => <PostRow key={post.id} post={post} />)
            )}
          </div>

          <CompactPagination
            page={page}
            totalPages={pagination.totalPages}
            onChange={handlePageChange}
          />
        </div>
      )}
    </PageShell>
  );
}
