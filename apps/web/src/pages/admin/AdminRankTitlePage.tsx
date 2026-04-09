import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Award, Users, Sparkles, ChevronLeft, Edit, Trash2, Plus } from 'lucide-react';
import { RuneBorder } from '@components/ui/RuneBorder';
import { RankEditModal } from './components/RankEditModal';
import { TitleEditModal } from './components/TitleEditModal';
import {
  getAdminRanks,
  getAdminTitles,
  updateRank,
  updateTitle,
  type AdminRank,
  type AdminTitle,
  type Rank,
  type Title
} from '@services/rank-title.service';
import { AdminTableSkeleton } from '@components/admin/AdminTableSkeleton';

export function AdminRankTitlePage() {
  const [ranks, setRanks] = useState<AdminRank[]>([]);
  const [titles, setTitles] = useState<AdminTitle[]>([]);
  const [activeTab, setActiveTab] = useState<'ranks' | 'titles'>('ranks');
  const [loading, setLoading] = useState(true);

  // 编辑状态
  const [editingRank, setEditingRank] = useState<Rank | null>(null);
  const [editingTitle, setEditingTitle] = useState<Title | null>(null);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ranksData, titlesData] = await Promise.all([
        getAdminRanks(),
        getAdminTitles(),
      ]);
      setRanks(ranksData);
      setTitles(titlesData.titles);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRank = (rank: AdminRank) => {
    setEditingRank(rank);
    setIsRankModalOpen(true);
  };

  const handleEditTitle = (title: AdminTitle) => {
    setEditingTitle(title);
    setIsTitleModalOpen(true);
  };

  const handleSaveRank = async (data: Partial<Rank>) => {
    if (!editingRank) return;

    try {
      await updateRank(editingRank.id, data);
      await loadData();
      setIsRankModalOpen(false);
      setEditingRank(null);
    } catch (err) {
      console.error('保存位阶失败:', err);
      alert('保存失败: ' + (err as Error).message);
    }
  };

  const handleSaveTitle = async (data: Partial<Title>) => {
    if (!editingTitle) return;

    try {
      await updateTitle(editingTitle.id, data);
      await loadData();
      setIsTitleModalOpen(false);
      setEditingTitle(null);
    } catch (err) {
      console.error('保存印记失败:', err);
      alert('保存失败: ' + (err as Error).message);
    }
  };

  const rarityColors: Record<string, string> = {
    common: '#a69b85',
    rare: '#c9a227',
    epic: '#8b2635',
    legendary: '#6b4c7a',
    mythical: '#e8d4a0',
  };

  const rarityNames: Record<string, string> = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说',
    mythical: '神话',
  };

  const categoryNames: Record<string, string> = {
    exploration: '探索',
    combat: '战斗',
    social: '社交',
    madness: '疯狂',
    special: '特殊',
    hidden: '隐藏',
  };

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="flex items-center gap-2 text-coc-parchment-dim hover:text-coc-gold transition-colors"
          >
            <ChevronLeft size={20} />
            <span>返回</span>
          </Link>
          <h1 className="text-2xl font-ritual font-bold text-coc-parchment">
            位阶与印记管理
          </h1>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <RuneBorder variant="gold" intensity="subtle">
          <div className="coc-bg-parchment p-4 text-center">
            <Crown className="w-8 h-8 text-coc-gold mx-auto mb-2" />
            <p className="text-2xl font-ritual font-bold text-coc-gold">{ranks.length}</p>
            <p className="text-sm text-coc-parchment-dim">位阶数量</p>
          </div>
        </RuneBorder>

        <RuneBorder variant="madness" intensity="subtle">
          <div className="coc-bg-parchment p-4 text-center">
            <Award className="w-8 h-8 text-coc-madness-glow mx-auto mb-2" />
            <p className="text-2xl font-ritual font-bold text-coc-madness-glow">{titles.length}</p>
            <p className="text-sm text-coc-parchment-dim">印记数量</p>
          </div>
        </RuneBorder>

        <RuneBorder variant="blood" intensity="subtle">
          <div className="coc-bg-parchment p-4 text-center">
            <Users className="w-8 h-8 text-coc-blood mx-auto mb-2" />
            <p className="text-2xl font-ritual font-bold text-coc-blood">
              {ranks.reduce((sum, r) => sum + (r.userCount || 0), 0)}
            </p>
            <p className="text-sm text-coc-parchment-dim">总用户数</p>
          </div>
        </RuneBorder>

        <RuneBorder variant="default" intensity="subtle">
          <div className="coc-bg-parchment p-4 text-center">
            <Sparkles className="w-8 h-8 text-coc-parchment mx-auto mb-2" />
            <p className="text-2xl font-ritual font-bold text-coc-parchment">
              {titles.filter(t => (t.unlockedCount || 0) > 0).length}
            </p>
            <p className="text-sm text-coc-parchment-dim">已解锁印记</p>
          </div>
        </RuneBorder>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('ranks')}
          className={`px-6 py-3 rounded font-ritual transition-colors ${
            activeTab === 'ranks'
              ? 'bg-coc-gold text-coc-abyss'
              : 'bg-coc-void text-coc-parchment-dim hover:text-coc-parchment'
          }`}
        >
          <Crown className="inline-block w-4 h-4 mr-2" />
          位阶管理
        </button>
        <button
          onClick={() => setActiveTab('titles')}
          className={`px-6 py-3 rounded font-ritual transition-colors ${
            activeTab === 'titles'
              ? 'bg-coc-madness text-coc-parchment'
              : 'bg-coc-void text-coc-parchment-dim hover:text-coc-parchment'
          }`}
        >
          <Award className="inline-block w-4 h-4 mr-2" />
          印记管理
        </button>
      </div>

      {/* 位阶列表 */}
      {activeTab === 'ranks' && (
        <RuneBorder variant="gold" intensity="subtle">
          <div className="coc-bg-parchment p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-ritual font-bold text-coc-parchment">位阶列表</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-coc-gold text-coc-abyss rounded hover:bg-coc-gold-glow transition-colors">
                <Plus size={16} />
                新增位阶
              </button>
            </div>
            
            {loading ? (
              <AdminTableSkeleton rows={5} cols={6} showSearch={false} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-coc-void">
                      <th className="text-left py-3 px-4 text-coc-parchment-dim font-rune">等级</th>
                      <th className="text-left py-3 px-4 text-coc-parchment-dim font-rune">名称</th>
                      <th className="text-left py-3 px-4 text-coc-parchment-dim font-rune">图标</th>
                      <th className="text-left py-3 px-4 text-coc-parchment-dim font-rune">所需SP</th>
                      <th className="text-left py-3 px-4 text-coc-parchment-dim font-rune">用户数</th>
                      <th className="text-right py-3 px-4 text-coc-parchment-dim font-rune">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranks.map((rank) => (
                      <tr key={rank.id} className="border-b border-coc-void/50 hover:bg-coc-abyss/30">
                        <td className="py-3 px-4">
                          <span className="text-coc-gold font-bold">Lv.{rank.level}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-ritual" style={{ color: rank.color }}>
                            {rank.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xl">{rank.icon}</td>
                        <td className="py-3 px-4 text-coc-parchment-dim">{rank.expRequired}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-coc-gold/20 text-coc-gold rounded text-sm">
                            {rank.userCount || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleEditRank(rank)}
                            className="text-coc-parchment-dim hover:text-coc-gold mr-3"
                          >
                            <Edit size={16} />
                          </button>
                          <button className="text-coc-parchment-dim hover:text-coc-blood">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </RuneBorder>
      )}

      {/* 印记列表 */}
      {activeTab === 'titles' && (
        <RuneBorder variant="madness" intensity="subtle">
          <div className="coc-bg-parchment p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-ritual font-bold text-coc-parchment">印记列表</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-coc-madness text-coc-parchment rounded hover:bg-coc-madness-glow transition-colors">
                <Plus size={16} />
                新增印记
              </button>
            </div>

            {loading ? (
              <AdminTableSkeleton rows={5} cols={6} showSearch={false} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-coc-void">
                      <th className="text-left py-3 px-4 text-coc-parchment-dim font-rune">印记</th>
                      <th className="text-left py-3 px-4 text-coc-parchment-dim font-rune">名称</th>
                      <th className="text-left py-3 px-4 text-coc-parchment-dim font-rune">分类</th>
                      <th className="text-left py-3 px-4 text-coc-parchment-dim font-rune">稀有度</th>
                      <th className="text-left py-3 px-4 text-coc-parchment-dim font-rune">解锁数</th>
                      <th className="text-right py-3 px-4 text-coc-parchment-dim font-rune">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {titles.map((title) => (
                      <tr key={title.id} className="border-b border-coc-void/50 hover:bg-coc-abyss/30">
                        <td className="py-3 px-4 text-xl">{title.icon}</td>
                        <td className="py-3 px-4">
                          <span className="font-ritual" style={{ color: title.color }}>
                            {title.name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-coc-void text-coc-parchment-dim rounded text-sm">
                            {categoryNames[title.category]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-1 rounded text-sm"
                            style={{
                              backgroundColor: `${rarityColors[title.rarity]}20`,
                              color: rarityColors[title.rarity]
                            }}
                          >
                            {rarityNames[title.rarity]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-coc-madness/20 text-coc-madness-glow rounded text-sm">
                            {title.unlockedCount || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleEditTitle(title)}
                            className="text-coc-parchment-dim hover:text-coc-gold mr-3"
                          >
                            <Edit size={16} />
                          </button>
                          <button className="text-coc-parchment-dim hover:text-coc-blood">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </RuneBorder>
      )}

      {/* 编辑模态框 */}
      <RankEditModal
        rank={editingRank}
        isOpen={isRankModalOpen}
        onClose={() => {
          setIsRankModalOpen(false);
          setEditingRank(null);
        }}
        onSave={handleSaveRank}
      />

      <TitleEditModal
        title={editingTitle}
        isOpen={isTitleModalOpen}
        onClose={() => {
          setIsTitleModalOpen(false);
          setEditingTitle(null);
        }}
        onSave={handleSaveTitle}
      />
    </div>
  );
}
