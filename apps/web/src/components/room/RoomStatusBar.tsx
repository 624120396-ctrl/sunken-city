import { ChevronRight, BookOpen, MapPin, Clock, User } from 'lucide-react';

interface Phase {
  id: string;
  title: string;
  status: string;
}

interface Scene {
  id: string;
  title: string;
  atmosphere: string;
}

interface RoomStatusBarProps {
  currentPhase: Phase | null;
  currentScene: Scene | null;
  roundCount?: number;
  currentActor?: string;
  isKP: boolean;
  phases?: Phase[];
  onActivateScene?: (sceneId: string) => void;
}

export function RoomStatusBar({
  currentPhase,
  currentScene,
  roundCount,
  currentActor,
  phases,
}: RoomStatusBarProps) {
  const hasPhaseSystem = !!phases && phases.length > 0;

  return (
    <div className="w-full bg-coc-bg-elevated/60 backdrop-blur-sm border-b border-coc-border/30 px-3 py-1.5 flex items-center gap-3 text-xs min-h-[36px] select-none">
      {/* 阶段指示 */}
      {hasPhaseSystem && currentPhase && (
        <div className="flex items-center gap-1.5 text-coc-gold/80">
          <BookOpen size={12} />
          <span className="font-ritual font-medium truncate max-w-[120px]">
            {currentPhase.title}
          </span>
          {currentPhase.status === 'completed' && (
            <span className="text-coc-text-muted">(已完成)</span>
          )}
        </div>
      )}

      {/* 分隔线 */}
      {hasPhaseSystem && currentPhase && currentScene && (
        <ChevronRight size={10} className="text-coc-border flex-shrink-0" />
      )}

      {/* 场景指示 */}
      {currentScene && (
        <div className="flex items-center gap-1.5 text-coc-parchment/70">
          <MapPin size={12} />
          <span className="truncate max-w-[160px]">{currentScene.title}</span>
          <span
            className="px-1 py-0.5 rounded text-[10px] capitalize"
            style={{
              background:
                currentScene.atmosphere === 'horror'
                  ? 'rgba(180, 30, 30, 0.25)'
                  : currentScene.atmosphere === 'mystery'
                  ? 'rgba(100, 80, 160, 0.25)'
                  : currentScene.atmosphere === 'dark'
                  ? 'rgba(40, 40, 60, 0.5)'
                  : 'rgba(201, 162, 39, 0.15)',
              color:
                currentScene.atmosphere === 'horror'
                  ? '#e8a0a0'
                  : currentScene.atmosphere === 'mystery'
                  ? '#b8a8e0'
                  : currentScene.atmosphere === 'dark'
                  ? '#8888a0'
                  : '#c9a227',
            }}
          >
            {currentScene.atmosphere}
          </span>
        </div>
      )}

      {/* 无阶段系统时的降级显示 */}
      {!hasPhaseSystem && !currentScene && (
        <span className="text-coc-text-muted italic">自由模式 — 无阶段设定</span>
      )}

      {/* 右侧：战斗信息 */}
      <div className="ml-auto flex items-center gap-3">
        {roundCount !== undefined && roundCount > 0 && (
          <div className="flex items-center gap-1 text-coc-blood/80">
            <Clock size={12} />
            <span>回合 {roundCount}</span>
          </div>
        )}
        {currentActor && (
          <div className="flex items-center gap-1 text-coc-ether/80">
            <User size={12} />
            <span className="truncate max-w-[100px]">{currentActor}</span>
          </div>
        )}
      </div>
    </div>
  );
}
