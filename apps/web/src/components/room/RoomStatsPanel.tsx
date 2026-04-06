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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-coc-bg-secondary border border-coc-border rounded-lg shadow-xl max-w-md w-full">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-coc-border">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-coc-accent-gold" />
            <span className="font-bold text-lg">本次游戏统计</span>
          </div>
          <button 
            onClick={onClose}
            className="text-coc-text-muted hover:text-coc-text-primary"
          >
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-4">
          {/* 游戏时长 */}
          <div className="flex items-center gap-3 p-3 bg-coc-bg-tertiary rounded">
            <div className="w-10 h-10 rounded-full bg-coc-accent-gold/20 flex items-center justify-center">
              <Clock size={20} className="text-coc-accent-gold" />
            </div>
            <div>
              <p className="text-sm text-coc-text-secondary">游戏时长</p>
              <p className="text-xl font-bold">{formatDuration(stats.duration)}</p>
            </div>
          </div>

          {/* 掷骰统计 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-coc-bg-tertiary rounded">
              <Dice5 size={20} className="mx-auto mb-1 text-coc-accent-gold" />
              <p className="text-2xl font-bold">{stats.totalRolls}</p>
              <p className="text-xs text-coc-text-secondary">总掷骰</p>
            </div>
            <div className="text-center p-3 bg-coc-bg-tertiary rounded">
              <Target size={20} className="mx-auto mb-1 text-green-400" />
              <p className="text-2xl font-bold text-green-400">{stats.successRolls}</p>
              <p className="text-xs text-coc-text-secondary">成功</p>
            </div>
            <div className="text-center p-3 bg-coc-bg-tertiary rounded">
              <TrendingUp size={20} className="mx-auto mb-1 text-coc-accent-gold" />
              <p className="text-2xl font-bold">{successRate}%</p>
              <p className="text-xs text-coc-text-secondary">成功率</p>
            </div>
          </div>

          {/* 最常用技能 */}
          {stats.mostUsedSkill && (
            <div className="p-3 bg-coc-bg-tertiary rounded">
              <p className="text-sm text-coc-text-secondary mb-1">最常用技能</p>
              <p className="text-lg font-medium text-coc-accent-gold">{stats.mostUsedSkill}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
