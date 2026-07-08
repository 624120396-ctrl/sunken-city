import { ChevronDown, ChevronUp, Compass, Edit2 } from 'lucide-react';
import { cn } from '@lib/utils';
import type { RoomGameplayRoom } from './RoomGameplayTypes';

interface RoomSceneBannerProps {
  room: RoomGameplayRoom | null;
  sceneDescription?: string;
  canEdit: boolean;
  onEdit?: () => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function RoomSceneBanner({
  room,
  sceneDescription,
  canEdit,
  onEdit,
  isCollapsed = false,
  onToggleCollapsed,
}: RoomSceneBannerProps) {
  const scene = room?.currentScene;
  const title = scene?.title || room?.currentPhase?.title || '水下废墟广场';
  const description = sceneDescription || scene?.description || room?.description || '冰冷的海水在你们周围流动，破碎的石阶通向一座巨大的拱门。远处，沉没的尖塔在浮游粒子的光影中若隐若现。';
  const atmosphere = scene?.atmosphere || room?.atmosphere || '压抑';
  const progress = room?.currentPhase ? '进行中' : '自由探索';

  return (
    <section className={cn('room-scene-banner-v4', isCollapsed && 'room-scene-banner-v4--collapsed')} aria-label="当前场景">
      <div className="room-scene-banner-v4__copy">
        <div className="room-scene-banner-v4__eyebrow">
          <Compass size={16} />
          当前场景
        </div>
        <h2>{title}</h2>
        {!isCollapsed && (
          <>
            <p>{description}</p>
            <div className="room-scene-banner-v4__chips">
              <span>氛围：{atmosphere}</span>
              <span>光线：昏暗</span>
              <span>危险：中等</span>
              <span>探索进度：{progress}</span>
            </div>
          </>
        )}
      </div>

      {!isCollapsed && <div className="room-scene-banner-v4__art" aria-hidden="true" />}

      <div className="room-scene-banner-v4__actions">
        {canEdit && !isCollapsed && (
          <button type="button" className="room-scene-banner-v4__edit" onClick={onEdit}>
            <Edit2 size={14} />
            调整场景
          </button>
        )}
        {onToggleCollapsed && (
          <button
            type="button"
            className="room-scene-banner-v4__toggle"
            onClick={onToggleCollapsed}
            aria-label={isCollapsed ? '展开当前场景' : '收起当前场景'}
          >
            {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        )}
      </div>
    </section>
  );
}
