import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { LayoutGrid, School, Anchor, Moon, Flame, Landmark } from 'lucide-react';
import { getForumBoards } from '../../services/forum.service';
import { useQuery } from '@tanstack/react-query';

const boardIconMap: Record<string, React.ElementType> = {
  lore: School,
  strategy: Anchor,
  creative: Moon,
  tavern: Flame,
  arkham_hall: Landmark,
};

export function ForumListPage() {
  const { data: boardsData, isLoading } = useQuery({
    queryKey: ['forumBoards'],
    queryFn: getForumBoards,
    staleTime: 5 * 60 * 1000,
  });
  const boards = boardsData?.boards || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-ritual font-bold text-coc-parchment">旧日低语</h1>
          <p className="text-sm text-coc-text-muted mt-1">选择版块，进入你的讨论领域</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-coc-text-muted text-sm">
          <LayoutGrid size={16} />
          <span>共 {boards.length} 个版块</span>
        </div>
      </div>

      {/* Board Cards - 2x2 layout, longer cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {boards.map((b: any) => {
          const Icon = boardIconMap[b.key] || LayoutGrid;
          return (
            <Link
              key={b.key}
              to={`/forums/board/${b.key}`}
              className="group p-6 bg-coc-bg-tertiary border border-coc-border rounded-lg hover:border-coc-gold/60 transition-all hover:shadow-lg hover:shadow-coc-gold/5 min-h-[220px] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-coc-parchment group-hover:text-coc-gold transition-colors truncate">
                      {b.name}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-2xl font-bold text-coc-parchment">{b.postCount}</span>
                    <span className="text-xs text-coc-text-muted">主题</span>
                  </div>
                </div>
                {b.description && (
                  <p className="text-sm text-coc-text-muted mt-3 leading-relaxed whitespace-pre-line">
                    {b.description}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end">
                <Icon
                  size={32}
                  className="text-coc-text-muted group-hover:text-coc-gold transition-colors"
                />
              </div>
            </Link>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-coc-text-muted">
          <EmptyState icon={EmptyIcons.Clue} title="加载中..." size="md" animate={false} />
        </div>
      ) : boards.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.Clue}
          title="暂无可用版块"
          description="论坛版块尚未开放，敬请期待。"
          size="md"
          animate={false}
        />
      ) : null}
    </div>
  );
}
