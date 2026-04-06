import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Dice5, Filter, Clock } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';

interface DiceRoll {
  id: string;
  rollType: string;
  targetName?: string;
  targetValue?: number;
  rollResult: number;
  rolls: string;
  successLevel: string;
  createdAt: string;
  user: {
    nickname: string;
  };
}

export function DiceHistoryPage() {
  const { roomId } = useParams();
  const [rolls, setRolls] = useState<DiceRoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchRolls();
  }, [roomId]);

  const fetchRolls = async () => {
    try {
      // 使用现有的骰子路由获取历史记录
      const response = await apiFetch(`/dice/history?roomId=${roomId}`);
      const data = await handleApiResponse<{ rolls: DiceRoll[] }>(response);
      setRolls(data.rolls);
    } catch (error) {
      console.error('获取投骰历史失败:', error);
      // 如果没有专门的API，这里可以先用空数组
      setRolls([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRolls = filter === 'all' 
    ? rolls 
    : rolls.filter(r => r.rollType === filter);

  const rollTypes = ['all', ...Array.from(new Set(rolls.map(r => r.rollType)))];

  const getSuccessColor = (level: string) => {
    if (level?.includes('大成功')) return 'text-yellow-400';
    if (level?.includes('极难')) return 'text-green-400';
    if (level?.includes('困难')) return 'text-coc-accent-cyan';
    if (level?.includes('成功')) return 'text-green-400';
    if (level?.includes('大失败')) return 'text-red-500';
    if (level?.includes('失败')) return 'text-red-400';
    return 'text-coc-text-secondary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-coc-accent-red border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to={`/rooms/${roomId}`} className="coc-btn-secondary p-2">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold">投骰历史</h1>
            <p className="text-coc-text-secondary">房间 #{roomId}</p>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-coc-text-secondary" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="coc-input py-1"
          >
            <option value="all">全部类型</option>
            {rollTypes.filter(t => t !== 'all').map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="coc-card text-center">
          <div className="text-2xl font-bold">{rolls.length}</div>
          <div className="text-xs text-coc-text-muted">总次数</div>
        </div>
        <div className="coc-card text-center">
          <div className="text-2xl font-bold text-green-400">
            {rolls.filter(r => r.successLevel?.includes('成功') && !r.successLevel?.includes('失败')).length}
          </div>
          <div className="text-xs text-coc-text-muted">成功</div>
        </div>
        <div className="coc-card text-center">
          <div className="text-2xl font-bold text-red-400">
            {rolls.filter(r => r.successLevel?.includes('失败')).length}
          </div>
          <div className="text-xs text-coc-text-muted">失败</div>
        </div>
        <div className="coc-card text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {rolls.filter(r => r.successLevel?.includes('大成功')).length}
          </div>
          <div className="text-xs text-coc-text-muted">大成功</div>
        </div>
      </div>

      {/* 投骰列表 */}
      <div className="coc-card">
        {filteredRolls.length === 0 ? (
          <div className="text-center py-12">
            <Dice5 size={48} className="mx-auto text-coc-text-muted mb-4" />
            <p className="text-coc-text-secondary">暂无投骰记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRolls.map((roll) => (
              <div key={roll.id} className="p-4 bg-coc-bg-tertiary rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{roll.user?.nickname || '未知'}</span>
                    <span className="text-coc-text-secondary">{roll.rollType}</span>
                    {roll.targetName && (
                      <span className="text-sm text-coc-accent-gold">
                        {roll.targetName} ({roll.targetValue}%)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-coc-text-muted">
                    <Clock size={14} />
                    {new Date(roll.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold">
                    {roll.rollResult}
                  </div>
                  <div className="text-sm text-coc-text-secondary">
                    [{roll.rolls}]
                  </div>
                  {roll.successLevel && (
                    <div className={`text-sm font-medium ${getSuccessColor(roll.successLevel)}`}>
                      {roll.successLevel}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
