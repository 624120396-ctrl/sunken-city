import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Sparkles, Crown, Info, Loader2 } from 'lucide-react';
import { ExpBar } from '@components/ui/ExpBar';
import { 
  getRanks, 
  getMyRankTitle, 
  type Rank,
  type UserRankInfo 
} from '@services/rank-title.service';

const EXP_SOURCES = [
  { action: '完成一场跑团', exp: '+20', description: '作为玩家参与完整游戏' },
  { action: '作为KP主持', exp: '+30', description: '成功引导一场游戏' },
  { action: '创建调查员', exp: '+5', description: '每创建一个新角色' },
  { action: '获得印记', exp: '不定', description: '根据印记稀有度' },
  { action: '达成成就', exp: '不定', description: '特殊游戏内成就' },
  { action: '连续登录', exp: '+2/天', description: '每日登录奖励' },
  { action: '邀请好友', exp: '+10', description: '好友完成注册' },
  { action: '社区贡献', exp: '不定', description: '优质内容/反馈' },
  { action: '特殊活动', exp: '不定', description: '节日/限时活动' },
  { action: '管理员奖励', exp: '不定', description: '补偿或表彰' },
];

export function RanksPage() {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [rankInfo, setRankInfo] = useState<UserRankInfo | null>(null);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ranksData, infoData] = await Promise.all([
        getRanks(),
        getMyRankTitle().catch(() => null),
      ]);
      setRanks(ranksData);
      setRankInfo(infoData);
      if (infoData) {
        const current = ranksData.find(r => r.level === infoData.rank.level);
        setSelectedRank(current || ranksData[0]);
      } else {
        setSelectedRank(ranksData[0]);
      }
    } catch (err) {
      setError('加载位阶数据失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentRank = rankInfo?.rank || ranks[0];
  const nextRank = rankInfo?.nextRank;
  const expToNext = rankInfo?.expToNext || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-coc-deep flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-coc-gold animate-spin" />
      </div>
    );
  }

  if (error || ranks.length === 0) {
    return (
      <div className="min-h-screen bg-coc-deep flex items-center justify-center">
        <div className="text-coc-parchment text-center">
          <p className="mb-4">{error || '暂无位阶数据'}</p>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-coc-gold/20 text-coc-gold rounded hover:bg-coc-gold/30"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-coc-bg pb-12"
    >
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 overlay-layer-3 border-b border-coc-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-coc-text-muted hover:text-coc-gold transition-colors"
            >
              <ChevronLeft size={20} />
              <span className="font-rune">返回</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <Crown className="text-coc-gold" size={24} />
              <h1 className="text-xl font-ritual font-bold text-coc-gold">
                位阶体系
              </h1>
            </div>
            
            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* 当前位阶展示 */}
        <div className="card-layer-2 rounded-lg overflow-hidden">
          <div className="bg-coc-bg-elevated p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* 位阶图标 */}
              <div className="relative">
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center text-6xl
                           border-4 animate-pulse"
                  style={{ 
                    borderColor: currentRank?.color || '#c9a227',
                    background: `linear-gradient(135deg, ${currentRank?.color || '#c9a227'}20, ${currentRank?.color || '#c9a227'}05)`,
                    boxShadow: `0 0 30px ${currentRank?.color || '#c9a227'}30`,
                  }}
                >
                  {currentRank?.icon || '👑'}
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full 
                              bg-coc-bg-overlay border-2 border-coc-gold 
                              flex items-center justify-center font-ritual font-bold text-coc-gold">
                  {currentRank?.level || 1}
                </div>
              </div>
              
              {/* 位阶信息 */}
              <div className="flex-1 text-center md:text-left">
                <div className="text-sm text-coc-text-muted font-rune mb-2">
                  当前位阶
                </div>
                <h2 
                  className="text-4xl font-ritual font-bold mb-2"
                  style={{ color: currentRank?.color || '#c9a227' }}
                >
                  {currentRank?.name || '海岸漫步者'}
                </h2>
                <p className="text-coc-text-muted mb-4 max-w-lg">
                  {currentRank?.description || '你站在悬崖边缘，脚下的海水拍打着礁石，远处有什么在呼唤。'}
                </p>
                
                {/* 进度条 */}
                {nextRank ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-coc-text-muted">
                        灵魂碎片: <span className="text-coc-gold">{rankInfo?.exp || 0}</span>
                      </span>
                      <span className="text-coc-text-muted">
                        下一级还需: <span className="text-coc-gold">{expToNext} SP</span>
                      </span>
                    </div>
                    <ExpBar
                      current={rankInfo?.exp || 0}
                      max={(rankInfo?.exp || 0) + (rankInfo?.expToNext || 0)}
                      color={currentRank?.color || '#c9a227'}
                      showPercentage
                    />
                    <div className="flex items-center justify-between text-xs text-coc-text-muted">
                      <span>{currentRank?.name}</span>
                      <span>{nextRank.name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-coc-gold font-ritual">
                    已达到最高位阶
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 位阶天梯 */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Crown size={20} className="text-coc-gold" />
            <h2 className="text-xl font-ritual font-bold text-coc-parchment">
              位阶天梯
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {ranks.map((rank, i) => {
              const isCurrent = rank.level === currentRank?.level;
              const isLocked = rankInfo ? rank.expRequired > rankInfo.exp : rank.level > 1;
              
              return (
                <motion.button
                  key={rank.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  onClick={() => setSelectedRank(rank)}
                  className="text-left"
                >
                  <div className={`card-layer-2 rounded-lg p-4 h-full transition-all ${
                    isCurrent ? 'ring-1 ring-coc-gold/50' : ''
                  } ${isLocked ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{rank.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-rune text-coc-text-muted">
                            Lv.{rank.level}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-coc-gold/20 text-coc-gold text-xs rounded">
                              当前
                            </span>
                          )}
                        </div>
                        
                        <h3 
                          className="font-ritual font-bold truncate"
                          style={{ color: isLocked ? '#6b6558' : rank.color }}
                        >
                          {rank.name}
                        </h3>
                        
                        <p className="text-xs text-coc-text-muted mt-1">
                          {rank.expRequired} 灵魂碎片
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 选中位阶详情 */}
        {selectedRank && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="card-layer-2 rounded-lg overflow-hidden"
          >
            <div className="bg-coc-bg-elevated p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{selectedRank.icon}</span>
                  <div>
                    <h3 
                      className="text-2xl font-ritual font-bold"
                      style={{ color: selectedRank.color }}
                    >
                      {selectedRank.name}
                    </h3>
                    <p className="text-sm text-coc-text-muted">
                      位阶 {selectedRank.level} · {selectedRank.expRequired} 灵魂碎片
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setSelectedRank(null)}
                  className="text-coc-text-muted hover:text-coc-parchment"
                >
                  ✕
                </button>
              </div>

              <p className="text-coc-text-muted mb-6">
                {selectedRank.description}
              </p>

              {selectedRank.privileges && JSON.parse(selectedRank.privileges as unknown as string || '[]').length > 0 && (
                <div>
                  <h4 className="text-sm font-rune text-coc-gold mb-3">
                    位阶特权
                  </h4>
                  <ul className="space-y-2">
                    {(JSON.parse(selectedRank.privileges as unknown as string || '[]') as string[]).map((privilege: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-coc-text-muted">
                        <Sparkles size={14} className="text-coc-gold shrink-0" />
                        {privilege}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 灵魂碎片获取方式 */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Info size={20} className="text-coc-blood" />
            <h2 className="text-xl font-ritual font-bold text-coc-parchment">
              灵魂碎片来源
            </h2>
          </div>

          <div className="card-layer-2 rounded-lg overflow-hidden">
            <div className="bg-coc-bg-elevated p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXP_SOURCES.map((source, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.03 }}
                    className="flex items-center justify-between p-4 bg-coc-bg rounded border border-coc-border"
                  >
                    <div className="flex items-center gap-3">
                      <Info size={16} className="text-coc-text-muted shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-coc-parchment">
                          {source.action}
                        </div>
                        <div className="text-xs text-coc-text-muted">
                          {source.description}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-coc-gold/10 text-coc-gold text-sm rounded font-rune">
                      {source.exp}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
