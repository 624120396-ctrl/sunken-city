import { BarChart3, Clock, Dice5, Target, TrendingUp } from 'lucide-react';

interface RoomStatsData {
  duration: number;        // 游戏时长（分钟）
  totalRolls: number;      // 总掷骰次数
  successRolls: number;    // 成功次数
  failRolls: number;       // 失败次数
  mostUsedSkill: string | null;
}

interface RoomStatsPanelProps {
  stats: RoomStatsData;
  isOpen: boolean;
  onClose: () => void;
}

export function RoomStatsPanel({ stats, isOpen, onClose }: RoomStatsPanelProps) {
  if (!isOpen) return null;

  // 格式化时长
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  // 计算成功率
  const successRate = stats.totalRolls > 0 
    ? Math.round((stats.successRolls / stats.totalRolls) * 100) 
    : 0;

  return (
    <div className="room-stats-modal">
      <div className="room-stats-modal__panel">
        <div className="room-stats-modal__header">
          <div className="room-stats-modal__title">
            <BarChart3 size={20} />
            <span>本次游戏统计</span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="room-stats-modal__close"
            aria-label="关闭统计"
          >
            ✕
          </button>
        </div>

        <div className="room-stats-modal__body">
          <div className="room-stats-modal__duration">
            <div className="room-stats-modal__icon">
              <Clock size={20} />
            </div>
            <div>
              <p>游戏时长</p>
              <strong>{formatDuration(stats.duration)}</strong>
            </div>
          </div>

          <div className="room-stats-modal__grid">
            <div className="room-stats-modal__metric">
              <Dice5 size={20} />
              <strong>{stats.totalRolls}</strong>
              <span>总掷骰</span>
            </div>
            <div className="room-stats-modal__metric" data-tone="success">
              <Target size={20} />
              <strong>{stats.successRolls}</strong>
              <span>成功</span>
            </div>
            <div className="room-stats-modal__metric">
              <TrendingUp size={20} />
              <strong>{successRate}%</strong>
              <span>成功率</span>
            </div>
          </div>

          {stats.mostUsedSkill && (
            <div className="room-stats-modal__skill">
              <span>最常用技能</span>
              <strong>{stats.mostUsedSkill}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
