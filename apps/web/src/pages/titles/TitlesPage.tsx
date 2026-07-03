import { useEffect, useState, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Award, Lock, Sparkles, Filter, Check, Loader2,
  Layers, Compass, Sword, Users, Waves, Star, HelpCircle, X
} from 'lucide-react';
import { useAuthStore } from '@stores/auth.store';
import { PageShell, Surface } from '@components/system';
import { 
  getTitles, 
  getMyTitles, 
  getMyRankTitle,
  setDisplayedTitle,
  type Title,
  type UserTitleWithConfig,
  type UserRankInfo
} from '@services/rank-title.service';
import { getTitleCollectionSummary } from '@components/rank-title/rankTitleMeta';

type TitleCategory = 'exploration' | 'combat' | 'social' | 'madness' | 'special' | 'hidden' | 'all';
type TitleRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'all';

const RARITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  common: { label: '普通', color: '#a69b85', bgColor: '#a69b8520' },
  rare: { label: '稀有', color: '#c9a227', bgColor: '#c9a22720' },
  epic: { label: '史诗', color: '#8b2635', bgColor: '#8b263520' },
  legendary: { label: '传说', color: '#6b4c7a', bgColor: '#6b4c7a20' },
  mythical: { label: '神话', color: '#e8d4a0', bgColor: '#e8d4a020' },
};

const CATEGORY_CONFIG: Record<string, { label: string }> = {
  exploration: { label: '探索' },
  combat: { label: '战斗' },
  social: { label: '社交' },
  madness: { label: '疯狂' },
  special: { label: '特殊' },
  hidden: { label: '隐藏' },
};

export function TitlesPage() {
  const { updateUser } = useAuthStore();
  const [titles, setTitles] = useState<Title[]>([]);
  const [userTitles, setUserTitles] = useState<UserTitleWithConfig[]>([]);
  const [rankInfo, setRankInfo] = useState<UserRankInfo | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TitleCategory>('all');
  const [selectedRarity, setSelectedRarity] = useState<TitleRarity>('all');
  const [selectedTitle, setSelectedTitle] = useState<Title | null>(null);
  const [showLocked, setShowLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingDisplay, setSettingDisplay] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [titlesData, myTitlesData, rankData] = await Promise.all([
        getTitles(),
        getMyTitles().catch(() => []),
        getMyRankTitle().catch(() => null),
      ]);
      setTitles(titlesData);
      setUserTitles(myTitlesData);
      setRankInfo(rankData);
      // 同步到全局 auth store
      if (rankData) {
        updateUser({
          rankName: rankData.rank?.name,
          displayedTitleName: rankData.displayBadge?.name,
        });
      }
    } catch (err) {
      setError('加载印记数据失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDisplayed = async (titleKey: string | null) => {
    try {
      setSettingDisplay(titleKey || 'none');
      await setDisplayedTitle(titleKey);
      // 刷新数据
      const newRankInfo = await getMyRankTitle();
      setRankInfo(newRankInfo);
      // 同步更新全局 auth store
      updateUser({
        displayedTitleKey: titleKey,
        displayedTitleName: newRankInfo.displayBadge?.name,
        rankName: newRankInfo.rank?.name,
      });
    } catch (err) {
      console.error('设置展示印记失败:', err);
      alert('设置失败：' + (err as Error).message);
    } finally {
      setSettingDisplay(null);
    }
  };

  // 获取已解锁的印记key列表
  const unlockedKeys = userTitles.map(ut => ut.titleKey);
  
  // 过滤印记
  const filteredTitles = titles.filter((title: Title) => {
    if (selectedCategory !== 'all' && title.category !== selectedCategory) return false;
    if (selectedRarity !== 'all' && title.rarity !== selectedRarity) return false;
    if (!showLocked && !unlockedKeys.includes(title.key)) return false;
    return true;
  });

  // 统计
  const totalTitles = titles.length;
  const unlockedCount = unlockedKeys.length;
  const progress = totalTitles > 0 ? Math.round((unlockedCount / totalTitles) * 100) : 0;
  
  // 当前展示的印记
  const displayedTitleKey = rankInfo?.titleStats?.displayedTitleKey;
  const hiddenCount = titles.filter((title) => title.isHidden).length;
  const titleSummary = getTitleCollectionSummary({
    total: totalTitles,
    unlocked: unlockedCount,
    displayed: Boolean(displayedTitleKey),
    hidden: hiddenCount,
  });

  const categories: Array<{ id: TitleCategory; name: string; icon: React.ElementType }> = [
    { id: 'all', name: '全部', icon: Layers },
    { id: 'exploration', name: '探索', icon: Compass },
    { id: 'combat', name: '战斗', icon: Sword },
    { id: 'social', name: '社交', icon: Users },
    { id: 'madness', name: '疯狂', icon: Waves },
    { id: 'special', name: '特殊', icon: Star },
    { id: 'hidden', name: '隐藏', icon: HelpCircle },
  ];

  const rarities: Array<{ id: TitleRarity; name: string; color: string }> = [
    { id: 'all', name: '全部', color: '#d4c5a8' },
    { id: 'common', name: '普通', color: '#a69b85' },
    { id: 'rare', name: '稀有', color: '#c9a227' },
    { id: 'epic', name: '史诗', color: '#8b2635' },
    { id: 'legendary', name: '传说', color: '#6b4c7a' },
    { id: 'mythical', name: '神话', color: '#e8d4a0' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-coc-deep flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#c9a227] animate-spin" />
      </div>
    );
  }

  if (error || titles.length === 0) {
    return (
      <div className="min-h-screen bg-coc-deep flex items-center justify-center">
        <div className="text-[#e8d4a0] text-center">
          <p className="mb-4">{error || '暂无印记数据'}</p>
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
        className="rank-title-page title-archive-page"
        eyebrow="title archive"
        title={
          <span className="flex items-center gap-3">
            <Award className="text-[var(--coc-accent-gold)]" size={26} />
            印记图鉴
          </span>
        }
        description="查看已解锁印记、展示状态和筛选条件。"
        actions={
          <Link 
            to="/" 
            className="flex items-center gap-2 text-[#6b6558] hover:text-[#c9a227] transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-rune">返回</span>
          </Link>
        }
      >
        {/* 收集进度 */}
        <Surface variant="solid" tone="gold" padding="lg" className="title-archive-hero">
            <div className="title-archive-hero__layout">
              <div className="title-archive-hero__seal">
                <svg className="-rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#2a2a35"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#c9a227"
                    strokeWidth="8"
                    strokeDasharray={`${progress * 2.83} 283`}
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 283" }}
                    animate={{ strokeDasharray: `${progress * 2.83} 283` }}
                    transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                  />
                </svg>
                <div className="title-archive-hero__seal-value">
                  <span>
                    {progress}%
                  </span>
                </div>
              </div>
              
              <div className="title-archive-hero__body">
                <span className="rank-altar-card__eyebrow">drowned seal archive</span>
                <h2>印记收集进度</h2>
                <p>
                  已收集 <span className="text-[#c9a227] font-bold">{unlockedCount}</span> / {totalTitles} 个印记
                </p>
                {displayedTitleKey && (
                  <p className="title-archive-hero__current">
                    当前展示: <span className="font-medium">
                      {titles.find(t => t.key === displayedTitleKey)?.name || '位阶名称'}
                    </span>
                  </p>
                )}
                <div className="rank-progress-strip title-summary-strip">
                  {titleSummary.map((item) => (
                    <div key={item.key} className="rank-progress-strip__item" data-tone={item.tone}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 显示/隐藏未解锁 */}
              <button
                onClick={() => setShowLocked(!showLocked)}
                className="title-toggle-button"
                data-active={showLocked ? 'true' : 'false'}
              >
                {showLocked ? '显示全部' : '仅显示已解锁'}
              </button>
            </div>
        </Surface>

        {/* 筛选器 */}
        <Surface variant="panel" padding="md" className="title-filter-panel">
          {/* 分类筛选 */}
          <div className="title-filter-row">
            <Filter size={16} className="text-[#6b6558] mr-2" />
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="title-filter-chip"
                data-active={selectedCategory === cat.id ? 'true' : 'false'}
              >
                <cat.icon size={14} className="inline mr-1" />
                {cat.name}
              </button>
            ))}
          </div>
          
          {/* 稀有度筛选 */}
          <div className="title-filter-row">
            <Sparkles size={16} className="text-[#6b6558] mr-2" />
            {rarities.map((rarity) => (
              <button
                key={rarity.id}
                onClick={() => setSelectedRarity(rarity.id)}
                className="title-filter-chip"
                data-active={selectedRarity === rarity.id ? 'true' : 'false'}
                style={{ '--chip-color': rarity.color } as CSSProperties}
              >
                {rarity.name}
              </button>
            ))}
          </div>
        </Surface>

        {/* 印记网格 */}
        <div className="title-grid">
          {filteredTitles.map((title, i) => {
            const isUnlocked = unlockedKeys.includes(title.key);
            const isDisplayed = displayedTitleKey === title.key;
            const rarityConfig = RARITY_CONFIG[title.rarity];
            
            return (
              <motion.button
                key={title.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.02 }}
                onClick={() => setSelectedTitle(title)}
                className="title-card"
                data-unlocked={isUnlocked ? 'true' : 'false'}
                data-displayed={isDisplayed ? 'true' : 'false'}
                data-rarity={title.rarity}
                style={{ '--title-color': isUnlocked ? title.color : '#a69b85' } as CSSProperties}
              >
                <div className="title-card__orb">
                  {isUnlocked ? (
                    <span>{title.icon}</span>
                  ) : title.isHidden ? (
                    <HelpCircle size={34} />
                  ) : (
                    <span>{title.icon}</span>
                  )}
                </div>

                <span
                  className="title-card__rarity"
                  style={{ 
                    backgroundColor: rarityConfig.bgColor,
                    color: rarityConfig.color,
                  }}
                >
                  {rarityConfig.label}
                </span>

                <strong className="title-card__name">
                  {isUnlocked ? title.name : title.isHidden ? '???' : title.name}
                </strong>

                <span className="title-card__state">
                  {!isUnlocked && (
                    <>
                      <Lock size={12} />
                      未解锁
                    </>
                  )}
                  {isDisplayed && (
                    <>
                      <Check size={12} />
                      展示中
                    </>
                  )}
                  {isUnlocked && !isDisplayed && '已收录'}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* 选中印记详情 */}
        <AnimatePresence>
          {selectedTitle && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <Surface variant="solid" tone="gold" padding="lg" className="title-detail-card">
                <div className="title-detail-card__header">
                  <div className="title-detail-card__title">
                    <span>{selectedTitle.icon}</span>
                    <div>
                      <div className="title-detail-card__meta">
                        <span 
                          className="title-card__rarity"
                          style={{ 
                            backgroundColor: RARITY_CONFIG[selectedTitle.rarity]?.bgColor,
                            color: RARITY_CONFIG[selectedTitle.rarity]?.color,
                          }}
                        >
                          {RARITY_CONFIG[selectedTitle.rarity]?.label}
                        </span>
                        <span className="text-xs text-[#6b6558]">
                          {CATEGORY_CONFIG[selectedTitle.category]?.label}
                        </span>
                      </div>
                      <h3 
                        style={{ color: selectedTitle.color }}
                      >
                        {selectedTitle.name}
                      </h3>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedTitle(null)}
                    className="rank-detail-card__close"
                  >
                    <X size={20} />
                  </button>
                </div>

                <p className="title-detail-card__description">
                  {selectedTitle.description}
                </p>

                <div className="title-detail-card__facts">
                  <div>
                    <span className="text-sm text-[#6b6558]">获取条件</span>
                    <span className="text-sm text-[#e8d4a0] font-rune">
                      {selectedTitle.isHidden && !unlockedKeys.includes(selectedTitle.key)
                        ? selectedTitle.hint || '???'
                        : selectedTitle.condition}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-sm text-[#6b6558]">奖励灵魂碎片</span>
                    <span className="text-sm text-[#c9a227] font-rune">
                      +{selectedTitle.expReward} SP
                    </span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="title-detail-card__actions">
                  {unlockedKeys.includes(selectedTitle.key) ? (
                    <>
                      {displayedTitleKey === selectedTitle.key ? (
                        <button
                          onClick={() => handleSetDisplayed(null)}
                          disabled={settingDisplay === 'none'}
                          className="title-action-button title-action-button--secondary"
                        >
                          {settingDisplay === 'none' ? '设置中...' : '取消展示'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetDisplayed(selectedTitle.key)}
                          disabled={settingDisplay === selectedTitle.key}
                          className="title-action-button title-action-button--primary"
                        >
                          {settingDisplay === selectedTitle.key ? '设置中...' : '设为展示'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="title-action-button title-action-button--locked">
                      尚未解锁
                    </div>
                  )}
                </div>
              </Surface>
            </motion.div>
          )}
        </AnimatePresence>
      </PageShell>
    </motion.div>
  );
}
