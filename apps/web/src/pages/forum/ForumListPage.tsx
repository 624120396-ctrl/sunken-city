import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { SkeletonCard } from '@components/ui/Skeleton';
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
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h1 className="text-2xl font-ritual font-bold text-[#e8d4a0]">旧日低语</h1>
            <p className="text-sm mt-1 text-[#b0a898]">选择版块，进入你的讨论领域</p>
          </div>
          <div className="hidden sm:block w-16 h-px" style={{ background: 'linear-gradient(90deg, rgba(201,162,39,0.4) 0%, transparent 100%)' }} />
        </div>
        <div className="flex items-center gap-2 text-[#b0a898] text-sm">
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
              className="group card-layer-2 p-5 md:p-6 min-h-[190px] md:min-h-[220px] flex flex-col justify-between rounded-lg hover:border-[#c9a227]/50 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold group-hover:text-[#c9a227] transition-colors truncate text-[#e8d4a0]">
                      {b.name}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-2xl font-bold text-[#e8d4a0]">{b.postCount}</span>
                    <span className="text-xs text-[#8b8375]">主题</span>
                  </div>
                </div>
                {b.description && (
                  <p className="text-sm text-[#b0a898] mt-3 leading-relaxed whitespace-pre-line line-clamp-4">
                    {b.description}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end">
                <Icon
                  size={32}
                  className="text-[#8b8375] group-hover:text-[#c9a227] transition-colors"
                />
              </div>
            </Link>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SkeletonCard className="h-[220px]" />
          <SkeletonCard className="h-[220px]" />
          <SkeletonCard className="h-[220px]" />
          <SkeletonCard className="h-[220px]" />
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
