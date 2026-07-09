import { useEffect, useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Crown, Info, Loader2 } from 'lucide-react';
import { ExpBar } from '@components/ui/ExpBar';
import { PageShell, Surface } from '@components/system';
import { getRankLadderItems, getRankProgressSummary } from '@components/rank-title/rankTitleMeta';
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
  const rankProgressSummary = getRankProgressSummary({
    currentRank,
    nextRank,
    exp: rankInfo?.exp || 0,
    expToNext,
  });
  const ladderItems = getRankLadderItems({
    ranks,
    currentLevel: currentRank?.level,
    exp: rankInfo?.exp || 0,
    selectedLevel: selectedRank?.level,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-coc-deep flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#c9a227] animate-spin" />
      </div>
    );
  }

  if (error || ranks.length === 0) {
    return (
      <div className="min-h-screen bg-coc-deep flex items-center justify-center">
        <div className="text-[#e8d4a0] text-center">
          <p className="mb-4">{error || '暂无位阶数据'}</p>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-coc-gold/20 text-[#c9a227] rounded hover:bg-coc-gold/30"
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
      className="pb-12"
    >
      <PageShell
        className="rank-title-page rank-page"
        eyebrow="RANK LADDER"
        title={
          <span className="flex items-center gap-3">
            <Crown className="text-[var(--coc-accent-gold)]" size={26} />
            位阶
          </span>
        }
        description="阶梯向上，也向海底延伸；越接近光，回声越像呼唤。"
      >
        <Surface variant="solid" tone="gold" material="archive" padding="lg" className="rank-altar-card">
          <div className="rank-altar-card__seal" style={{ '--rank-color': currentRank?.color || '#c9a227' } as CSSProperties}>
            <span>{currentRank?.icon || '👑'}</span>
            <strong>{currentRank?.level || 1}</strong>
          </div>

          <div className="rank-altar-card__body">
            <div className="rank-altar-card__eyebrow">CURRENT RANK</div>
            <h2 style={{ color: currentRank?.color || '#c9a227' }}>{currentRank?.name || '海岸漫步者'}</h2>
            <p>{currentRank?.description || '你站在悬崖边缘，脚下的海水拍打着礁石，远处有什么在呼唤。'}</p>

            <div className="rank-progress-strip">
              {rankProgressSummary.map((item) => (
                <div key={item.key} className="rank-progress-strip__item" data-tone={item.tone}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {nextRank ? (
              <div className="rank-exp-track">
                <div className="rank-exp-track__labels">
                  <span>灵魂碎片 {rankInfo?.exp || 0}</span>
                  <span>还需 {expToNext} SP</span>
                </div>
                <ExpBar
                  current={rankInfo?.exp || 0}
                  max={(rankInfo?.exp || 0) + (rankInfo?.expToNext || 0)}
                  color={currentRank?.color || '#c9a227'}
                  showPercentage
                />
                <div className="rank-exp-track__labels">
                  <span>{currentRank?.name}</span>
                  <span>{nextRank.name}</span>
                </div>
              </div>
            ) : (
              <div className="rank-max-note">已达到最高位阶</div>
            )}
          </div>
        </Surface>

        {/* 位阶天梯 */}
        <section className="rank-section">
          <div className="rank-section__heading">
            <Crown size={20} className="text-[#c9a227]" />
            <h2>位阶天梯</h2>
          </div>
          
          <div className="rank-ladder-grid [@media(min-width:2200px)]:grid-cols-8">
            {ladderItems.map((rank, i) => (
              <motion.button
                key={rank.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                onClick={() => setSelectedRank(ranks.find((item) => item.id === rank.id) || null)}
                className="rank-ladder-card"
                data-current={rank.current ? 'true' : 'false'}
                data-locked={rank.locked ? 'true' : 'false'}
                data-selected={rank.selected ? 'true' : 'false'}
                style={{ '--rank-color': rank.color || '#c9a227' } as CSSProperties}
              >
                <span className="rank-ladder-card__icon">{rank.icon}</span>
                <span className="rank-ladder-card__level">Lv.{rank.level}</span>
                <strong>{rank.name}</strong>
                <small>{rank.expRequired} 灵魂碎片</small>
                {rank.current && <em>当前</em>}
              </motion.button>
            ))}
          </div>
        </section>

        {/* 选中位阶详情 */}
        {selectedRank && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Surface variant="solid" tone="gold" material="archive" padding="lg" className="rank-detail-card">
              <div className="rank-detail-card__header">
                <div className="rank-detail-card__title">
                  <span>{selectedRank.icon}</span>
                  <div>
                    <h3 
                      style={{ color: selectedRank.color }}
                    >
                      {selectedRank.name}
                    </h3>
                    <p className="text-sm text-[#6b6558]">
                      位阶 {selectedRank.level} · {selectedRank.expRequired} 灵魂碎片
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setSelectedRank(null)}
                  className="rank-detail-card__close"
                >
                  ✕
                </button>
              </div>

              <p className="rank-detail-card__description">
                {selectedRank.description}
              </p>

              {selectedRank.privileges && JSON.parse(selectedRank.privileges as unknown as string || '[]').length > 0 && (
                <div>
                  <h4>位阶特权</h4>
                  <ul>
                    {(JSON.parse(selectedRank.privileges as unknown as string || '[]') as string[]).map((privilege: string, i: number) => (
                      <li key={i}>
                        <Sparkles size={14} className="text-[#c9a227] shrink-0" />
                        {privilege}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Surface>
          </motion.div>
        )}

        {/* 灵魂碎片获取方式 */}
        <section className="rank-section">
          <div className="rank-section__heading">
            <Info size={20} className="text-coc-blood" />
            <h2>灵魂碎片来源</h2>
          </div>

          <Surface variant="solid" material="archive" padding="lg" className="rank-source-panel">
              <div className="rank-source-grid">
                {EXP_SOURCES.map((source, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.03 }}
                    className="rank-source-card"
                  >
                    <div className="flex items-center gap-3">
                      <Info size={16} className="text-[#6b6558] shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-[#e8d4a0]">
                          {source.action}
                        </div>
                        <div className="text-xs text-[#6b6558]">
                          {source.description}
                        </div>
                      </div>
                    </div>
                    <span>
                      {source.exp}
                    </span>
                  </motion.div>
                ))}
              </div>
          </Surface>
        </section>
      </PageShell>
    </motion.div>
  );
}
