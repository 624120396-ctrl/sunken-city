import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Award, Lock, Sparkles, Filter, Check, Loader2,
  Layers, Compass, Sword, Users, Waves, Star, HelpCircle, X
} from 'lucide-react';
import { useAuthStore } from '@stores/auth.store';
import { 
  getTitles, 
  getMyTitles, 
  getMyRankTitle,
  setDisplayedTitle,
  type Title,
  type UserTitleWithConfig,
  type UserRankInfo
} from '@services/rank-title.service';

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
      className="min-h-screen backdrop-blur-md bg-black/40 pb-12"
    >
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 overlay-layer-3 border-b border-[#3a3a3a]/40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-[#6b6558] hover:text-[#c9a227] transition-colors"
            >
              <ChevronLeft size={20} />
              <span className="font-rune">返回</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <Award className="text-[#c9a227]" size={24} />
              <h1 className="text-xl font-ritual font-bold text-[#c9a227]">
                印记图鉴
              </h1>
            </div>
            
            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* 收集进度 */}
        <div className="card-layer-2 rounded-lg overflow-hidden">
          <div className="bg-[#1a1a1a] p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-ritual font-bold text-[#c9a227]">
                    {progress}%
                  </span>
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-ritual font-bold text-[#e8d4a0] mb-2">
                  收集进度
                </h2>
                <p className="text-[#6b6558]">
                  已收集 <span className="text-[#c9a227] font-bold">{unlockedCount}</span> / {totalTitles} 个印记
                </p>
                {displayedTitleKey && (
                  <p className="text-sm text-[#c9a227] mt-2">
                    当前展示: <span className="font-medium">
                      {titles.find(t => t.key === displayedTitleKey)?.name || '位阶名称'}
                    </span>
                  </p>
                )}
              </div>
              
              {/* 显示/隐藏未解锁 */}
              <button
                onClick={() => setShowLocked(!showLocked)}
                className={`px-4 py-2 rounded font-rune text-sm transition-colors
                  ${showLocked 
                    ? 'bg-coc-gold/20 text-[#c9a227] border border-coc-gold/40' 
                    : 'backdrop-blur-md bg-black/40 text-[#6b6558] border border-[#3a3a3a]/40 hover:border-coc-gold/50'}`}
              >
                {showLocked ? '显示全部' : '仅显示已解锁'}
              </button>
            </div>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="space-y-4">
          {/* 分类筛选 */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-[#6b6558] mr-2" />
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded text-sm font-rune transition-colors border
                  ${selectedCategory === cat.id
                    ? 'bg-coc-gold text-coc-abyss border-coc-gold'
                    : 'bg-[#1a1a1a] text-[#6b6558] border-[#3a3a3a]/40 hover:border-coc-gold/50 hover:text-[#e8d4a0]'}`}
              >
                <cat.icon size={14} className="inline mr-1" />
                {cat.name}
              </button>
            ))}
          </div>
          
          {/* 稀有度筛选 */}
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles size={16} className="text-[#6b6558] mr-2" />
            {rarities.map((rarity) => (
              <button
                key={rarity.id}
                onClick={() => setSelectedRarity(rarity.id)}
                className={`px-3 py-1.5 rounded text-sm font-rune transition-colors border
                  ${selectedRarity === rarity.id
                    ? 'bg-coc-gold text-coc-abyss border-coc-gold'
                    : 'bg-[#1a1a1a] text-[#6b6558] border-[#3a3a3a]/40 hover:border-coc-gold/50'}`}
                style={selectedRarity === rarity.id ? {} : { color: rarity.color }}
              >
                {rarity.name}
              </button>
            ))}
          </div>
        </div>

        {/* 印记网格 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                className="text-left group"
              >
                <div className={`card-layer-2 rounded-lg p-4 h-full transition-all ${
                  isDisplayed ? 'ring-1 ring-coc-gold/50' : ''
                } ${!isUnlocked ? 'opacity-60' : ''}`}
                >
                  {/* 印记图标 */}
                  <div className="text-center mb-3">
                    {isUnlocked ? (
                      <span className="text-4xl">{title.icon}</span>
                    ) : title.isHidden ? (
                      <HelpCircle size={36} className="mx-auto text-[#6b6558]" />
                    ) : (
                      <span className="text-4xl grayscale opacity-40">{title.icon}</span>
                    )}
                  </div>
                  
                  {/* 稀有度标签 */}
                  <div 
                    className="text-xs font-rune px-2 py-0.5 rounded text-center mb-2"
                    style={{ 
                      backgroundColor: rarityConfig.bgColor,
                      color: rarityConfig.color,
                    }}
                  >
                    {rarityConfig.label}
                  </div>
                  
                  {/* 名称 */}
                  <h3 
                    className="font-ritual font-bold text-sm text-center truncate"
                    style={{ color: isUnlocked ? title.color : '#6b6558' }}
                  >
                    {isUnlocked ? title.name : title.isHidden ? '???' : title.name}
                  </h3>
                  
                  {/* 锁定状态 */}
                  {!isUnlocked && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-[#6b6558]">
                      <Lock size={12} />
                      <span className="text-xs font-rune">未解锁</span>
                    </div>
                  )}
                  
                  {/* 展示中标记 */}
                  {isDisplayed && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-[#c9a227]">
                      <Check size={12} />
                      <span className="text-xs font-rune">展示中</span>
                    </div>
                  )}
                </div>
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
              className="card-layer-2 rounded-lg overflow-hidden"
            >
              <div className="bg-[#1a1a1a] p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">{selectedTitle.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="text-xs font-rune px-2 py-0.5 rounded"
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
                        className="text-2xl font-ritual font-bold"
                        style={{ color: selectedTitle.color }}
                      >
                        {selectedTitle.name}
                      </h3>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedTitle(null)}
                    className="text-[#6b6558] hover:text-[#e8d4a0]"
                  >
                    <X size={20} />
                  </button>
                </div>

                <p className="text-[#6b6558] mb-4">
                  {selectedTitle.description}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 backdrop-blur-md bg-black/40 rounded border border-[#3a3a3a]/40">
                    <span className="text-sm text-[#6b6558]">获取条件</span>
                    <span className="text-sm text-[#e8d4a0] font-rune">
                      {selectedTitle.isHidden && !unlockedKeys.includes(selectedTitle.key)
                        ? selectedTitle.hint || '???'
                        : selectedTitle.condition}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 backdrop-blur-md bg-black/40 rounded border border-[#3a3a3a]/40">
                    <span className="text-sm text-[#6b6558]">奖励灵魂碎片</span>
                    <span className="text-sm text-[#c9a227] font-rune">
                      +{selectedTitle.expReward} SP
                    </span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="mt-6 flex gap-3">
                  {unlockedKeys.includes(selectedTitle.key) ? (
                    <>
                      {displayedTitleKey === selectedTitle.key ? (
                        <button
                          onClick={() => handleSetDisplayed(null)}
                          disabled={settingDisplay === 'none'}
                          className="flex-1 py-2 backdrop-blur-md bg-black/40 text-[#6b6558] rounded font-rune
                                   hover:bg-[#1a1a1a] transition-colors border border-[#3a3a3a]/40 disabled:opacity-50"
                        >
                          {settingDisplay === 'none' ? '设置中...' : '取消展示'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetDisplayed(selectedTitle.key)}
                          disabled={settingDisplay === selectedTitle.key}
                          className="flex-1 py-2 bg-coc-gold text-coc-abyss rounded font-rune
                                   hover:bg-coc-gold-glow transition-colors disabled:opacity-50"
                        >
                          {settingDisplay === selectedTitle.key ? '设置中...' : '设为展示'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 py-2 bg-coc-bg/50 text-[#6b6558] rounded font-rune text-center border border-[#3a3a3a]/40">
                      尚未解锁
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
