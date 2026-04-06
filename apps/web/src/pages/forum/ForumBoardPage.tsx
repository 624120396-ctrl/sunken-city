import { useState, useEffect } from 'react';
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
    default: 'border-coc-border text-coc-text-muted',
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
        <Badge variant="bounty">悬赏 {post.bountyCoin} 硬币</Badge>
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
      className="group block p-4 rounded border border-coc-border bg-coc-bg-tertiary hover:border-coc-gold/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <PostBadges post={post} />
            <h3 className="font-bold text-coc-parchment truncate">{post.title}</h3>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-4 text-xs text-coc-text-muted">
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
            <div className="text-xs text-coc-text-muted">
              最后回复：<span className="text-coc-parchment">{post.lastReplyBy.nickname}</span> ·{' '}
              {formatTimeAgo(post.lastReplyAt)}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ForumBoardPage() {
  const { boardKey } = useParams<{ boardKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [boards, setBoards] = useState<{ key: string; name: string }[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<ForumPostSummary[]>([]);
  const [essencePosts, setEssencePosts] = useState<ForumPostSummary[]>([]);
  const [posts, setPosts] = useState<ForumPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [moderators, setModerators] = useState<{ id: string; userId: string; nickname: string; avatarUrl?: string }[]>([]);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const sort = (searchParams.get('sort') as 'newest' | 'last_reply') || 'last_reply';

  useEffect(() => {
    getForumBoards().then((res) => setBoards(res.boards));
  }, []);

  useEffect(() => {
    if (!boardKey) return;
    setLoading(true);
    setModerators([]);
    getBoardPosts(boardKey, page, 20, sort)
      .then((res) => {
        setPinnedPosts(res.pinnedPosts);
        setEssencePosts(res.essencePosts);
        setPosts(res.posts);
        setPagination(res.pagination);
      })
      .finally(() => setLoading(false));
    getBoardModerators(boardKey)
      .then((res) => setModerators(res.moderators))
      .catch(() => setModerators([]));
  }, [boardKey, page, sort]);

  const boardName = boards.find((b) => b.key === boardKey)?.name || boardKey;
  const BoardIcon = boardIconMap[boardKey || ''] || LayoutGrid;

  const handlePageChange = (newPage: number) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('page', String(newPage));
    setSearchParams(sp);
  };

  const setSort = (value: 'newest' | 'last_reply') => {
    const sp = new URLSearchParams(searchParams);
    sp.set('sort', value);
    sp.set('page', '1');
    setSearchParams(sp);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {/* Breadcrumb + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/forums" className="text-coc-text-muted hover:text-coc-parchment">旧日低语</Link>
          <span className="text-coc-text-muted">/</span>
          <span className="flex items-center gap-1.5 text-coc-parchment font-bold">
            <BoardIcon size={16} className="text-coc-gold" />
            {boardName}
          </span>
        </div>
        <Link
          to={`/forums/new?board=${boardKey}`}
          className="coc-btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          发布主题
        </Link>
      </div>

      {/* 版主展示 */}
      <div className="rounded-lg border border-coc-gold/30 bg-gradient-to-r from-coc-gold/10 to-transparent px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {moderators.length > 0 ? (
            moderators.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-coc-gold/50 bg-coc-bg-primary shadow-sm"
              >
                <span className="text-base text-coc-gold font-bold tracking-wide">
                  {BOARD_MODERATOR_TITLES[boardKey || ''] || '版主'}
                </span>
                <span className="text-sm text-coc-parchment font-medium">{mod.nickname}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-coc-gold/30 bg-coc-bg-primary/50">
              <span className="text-base text-coc-gold/70 font-bold tracking-wide">
                {BOARD_MODERATOR_TITLES[boardKey || ''] || '版主'}
              </span>
              <span className="text-sm text-coc-text-muted">虚位以待</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setSort('last_reply')}
            className={`px-3 py-1.5 rounded border text-sm transition-colors ${
              sort === 'last_reply'
                ? 'bg-coc-gold text-coc-abyss border-coc-gold'
                : 'border-coc-void text-coc-parchment hover:border-coc-gold'
            }`}
          >
            最后回复
          </button>
          <button
            onClick={() => setSort('newest')}
            className={`px-3 py-1.5 rounded border text-sm transition-colors ${
              sort === 'newest'
                ? 'bg-coc-gold text-coc-abyss border-coc-gold'
                : 'border-coc-void text-coc-parchment hover:border-coc-gold'
            }`}
          >
            最新发布
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-coc-text-muted">加载中...</div>
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
              <div className="text-xs font-bold text-coc-accent-gold flex items-center gap-1">
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
              <div className="text-center py-12 text-coc-text-muted">该版块暂无帖子，来发布第一条吧</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-coc-text-muted text-sm">没有更多帖子了</div>
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
    </div>
  );
}
