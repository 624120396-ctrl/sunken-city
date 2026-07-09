import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { SkeletonCard } from '@components/ui/Skeleton';
import { Link } from 'react-router-dom';
import { ArrowRight, LayoutGrid, School, Anchor, Moon, Flame, Landmark, MessageSquare } from 'lucide-react';
import { getForumBoards, type ForumBoard } from '../../services/forum.service';
import { useQuery } from '@tanstack/react-query';
import { DataCard, PageShell } from '@components/system';

const boardIconMap: Record<string, React.ElementType> = {
  lore: School,
  strategy: Anchor,
  creative: Moon,
  tavern: Flame,
  arkham_hall: Landmark,
};

const boardCeremonyMap: Record<string, { order: string; oath: string; seal: string }> = {
  lore: { order: 'I', oath: '学院秘档', seal: 'VERITAS' },
  strategy: { order: 'II', oath: '调查协约', seal: 'DOSSIER' },
  creative: { order: 'III', oath: '梦境手稿', seal: 'ONEIRON' },
  tavern: { order: 'IV', oath: '炉边证词', seal: 'TAVERN' },
  arkham_hall: { order: 'V', oath: '市政告示', seal: 'ARKHAM' },
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
      eyebrow="COMMUNITY ARCHIVE"
      title="旧日低语"
      description="从这些低语卷宗进入不同的调查层。长文、证词与回声会被安置在更稳定的可读 Surface 中。"
      actions={
        <DataCard
          label="已启封分卷"
          value={boards.length}
          detail="低语卷宗"
          icon={<LayoutGrid size={16} />}
          tone="gold"
        />
      }
    >

      <div className="forum-list-grid">
        {boards.map((b: ForumBoard, index) => {
          const Icon = boardIconMap[b.key] || LayoutGrid;
          const ceremony = boardCeremonyMap[b.key] || {
            order: String(index + 1).padStart(2, '0'),
            oath: '开放卷宗',
            seal: 'ARCHIVE',
          };

          return (
            <Link
              key={b.key}
              to={`/forums/board/${b.key}`}
              className="forum-board-index-card group"
              aria-label={`进入${b.name}分卷`}
            >
              <article className="forum-board-index-card__inner">
                <div className="forum-board-index-card__seal" aria-hidden="true">
                  <Icon size={24} />
                  <span>{ceremony.order}</span>
                </div>

                <div className="forum-board-index-card__content">
                  <div className="forum-board-index-card__topline">
                    <span>{ceremony.seal}</span>
                    <span>{ceremony.oath}</span>
                  </div>

                  <h2 className="forum-board-index-card__title">{b.name}</h2>
                  <p className="forum-board-index-card__description">
                    {b.description || '该卷宗尚未写入说明。'}
                  </p>

                  <div className="forum-board-index-card__footer">
                    <span className="forum-board-index-card__stat">
                      <MessageSquare size={14} />
                      {b.postCount} 则低语
                    </span>
                    <span className="forum-board-index-card__cta">
                      进入档案
                      <ArrowRight size={15} />
                    </span>
                  </div>
                </div>
              </article>
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
          title="暂无已启封分卷"
          description="未启封的档案仍在深处沉睡。"
          size="md"
          animate={false}
        />
      ) : null}
    </PageShell>
  );
}
