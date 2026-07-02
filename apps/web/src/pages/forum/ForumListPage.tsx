import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { SkeletonCard } from '@components/ui/Skeleton';
import { Link } from 'react-router-dom';
import { LayoutGrid, School, Anchor, Moon, Flame, Landmark } from 'lucide-react';
import { getForumBoards } from '../../services/forum.service';
import { useQuery } from '@tanstack/react-query';
import { ActionCard, DataCard, PageShell } from '@components/system';

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
    <PageShell
      eyebrow="community archive"
      title="旧日低语"
      description="选择版块，进入你的讨论领域。长文、记录和回复会使用更稳的可读 Surface。"
      actions={
        <DataCard
          label="开放版块"
          value={boards.length}
          detail="论坛索引"
          icon={<LayoutGrid size={16} />}
          tone="gold"
        />
      }
    >

      {/* Board Cards - 2x2 layout, longer cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3 [@media(min-width:2200px)]:grid-cols-4">
        {boards.map((b: any) => {
          const Icon = boardIconMap[b.key] || LayoutGrid;
          return (
            <Link
              key={b.key}
              to={`/forums/board/${b.key}`}
              className="group block"
            >
              <ActionCard
                title={b.name}
                description={b.description}
                icon={<Icon size={24} />}
                meta={
                  <span className="inline-flex items-center gap-1">
                    <LayoutGrid size={14} />
                    {b.postCount} 主题
                  </span>
                }
                className="min-h-[190px] md:min-h-[220px]"
              />
            </Link>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3 [@media(min-width:2200px)]:grid-cols-4">
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
    </PageShell>
  );
}
