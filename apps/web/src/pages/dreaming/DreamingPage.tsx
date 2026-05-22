import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Sparkles, BookOpen, History, Loader2, Coins, Gem } from 'lucide-react';
import { useAuthStore } from '@stores/auth.store';
import { TiltCard } from '@components/ui/TiltCard';

interface DreamCardBrief {
  key: string;
  name: string;
  rarity: string;
  imageUrl?: string | null;
}

interface DreamDraw {
  id: string;
  cardKey: string;
  position: 'upright' | 'reversed';
  drawnAt: string;
  isRevealed: boolean;
  revealText?: string | null;
  isDeepRevealed: boolean;
  deepRevealText?: string | null;
  tentacleBuff?: string | null;
  cardName?: string;
  buff?: { key: string; name: string; description: string } | null;
}

interface CollectionItem extends DreamCardBrief {
  unlocked: boolean;
  drawCount: number;
}

export function DreamingPage() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'today' | 'collection' | 'history'>('today');

  // 今日状态
  const [canDraw, setCanDraw] = useState(false);
  const [todayDraw, setTodayDraw] = useState<DreamDraw | null>(null);

  // 抽牌流程
  const [candidates, setCandidates] = useState<DreamCardBrief[] | null>(null);

  // 图鉴和历史
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [history, setHistory] = useState<DreamDraw[]>([]);

  const loadDaily = useCallback(async () => {
    const res = await apiFetch('/dream/daily');
    const data = await handleApiResponse<{ canDraw: boolean; todayDraw: DreamDraw | null }>(res);
    setCanDraw(data.canDraw);
    setTodayDraw(data.todayDraw);
  }, []);

  const loadCollection = useCallback(async () => {
    const res = await apiFetch('/dream/collection');
    const data = await handleApiResponse<CollectionItem[]>(res);
    setCollection(data);
  }, []);

  const loadHistory = useCallback(async () => {
    const res = await apiFetch('/dream/history?limit=20');
    const data = await handleApiResponse<DreamDraw[]>(res);
    setHistory(data);
  }, []);

  useEffect(() => {
    loadDaily();
    loadCollection();
    loadHistory();
  }, [loadDaily, loadCollection, loadHistory]);

  const handleStartDraw = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiFetch('/dream/draw', { method: 'POST' });
      const data = await handleApiResponse<{ candidates: DreamCardBrief[] }>(res);
      setCandidates(data.candidates);
    } catch (e: any) {
      alert(e.message || '抽牌失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (key: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiFetch('/dream/select', {
        method: 'POST',
        body: JSON.stringify({ cardKey: key }),
      });
      const data = await handleApiResponse<{ draw: DreamDraw; card: DreamCardBrief }>(res);
      setCanDraw(false);
      setTodayDraw(data.draw);
      // 刷新图鉴和历史
      loadCollection();
      loadHistory();
    } catch (e: any) {
      alert(e.message || '选择失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async (deep = false) => {
    if (!todayDraw || loading) return;
    setLoading(true);
    try {
      const endpoint = deep ? '/dream/deep-reveal' : '/dream/reveal';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ drawId: todayDraw.id }),
      });
      const data = await handleApiResponse<{ draw: DreamDraw; buff?: { key: string; name: string; description: string } }>(res);
      setTodayDraw({ ...data.draw, buff: data.buff || data.draw.buff || null });
      if (user) {
        updateUser({
          ...user,
          coins: deep ? user.coins : user.coins - 50,
          stardust: deep ? user.stardust - 10 : user.stardust,
        });
      }
    } catch (e: any) {
      alert(e.message || '解牌失败');
    } finally {
      setLoading(false);
    }
  };

  const rarityColor: Record<string, string> = {
    common: 'text-coc-text-secondary',
    rare: 'text-blue-400',
    epic: 'text-purple-400',
    legendary: 'text-amber-400',
  };

  const rarityBorder: Record<string, string> = {
    common: 'border-coc-text-secondary/30',
    rare: 'border-blue-400/40',
    epic: 'border-purple-400/40',
    legendary: 'border-amber-400/50',
  };

  const positionLabel = (p?: string) => (p === 'upright' ? '正位' : p === 'reversed' ? '逆位' : '');

  const currentCardMeta = collection.find((c) => c.key === todayDraw?.cardKey) ||
    candidates?.find((c) => c.key === todayDraw?.cardKey);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-ritual text-coc-accent-gold mb-2">溺者之牌</h1>
        <p className="text-coc-text-muted text-sm">每晚入睡后，调查员都会坠入一个共享的梦境层。抽一张牌，看看深渊想对你说什么。</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-coc-border pb-2">
        {[
          { key: 'today', label: '今日占卜', icon: Sparkles },
          { key: 'collection', label: '图鉴', icon: BookOpen },
          { key: 'history', label: '历史', icon: History },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors ${
                tab === t.key ? 'bg-coc-accent-red/20 text-coc-accent-red' : 'text-coc-text-secondary hover:text-coc-text-primary'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'today' && (
        <div className="space-y-6">
          {/* 主交互区 */}
          <div className="relative min-h-[16rem] bg-coc-bg-secondary/50 border border-coc-border rounded-xl p-8 flex flex-col items-center justify-center">
            {!todayDraw && canDraw && !candidates && (
              <div className="text-center">
                <p className="text-coc-text-secondary mb-6">今夜尚未入梦。深渊之牌正在等待你的手指。</p>
                <button
                  onClick={handleStartDraw}
                  disabled={loading}
                  className="coc-btn-primary px-8 py-3 text-lg disabled:opacity-50"
                >
                  {loading ? <Loader2 className="inline animate-spin mr-2" size={18} /> : null}
                  开始抽牌
                </button>
              </div>
            )}

            {!todayDraw && canDraw && candidates && (
              <div className="w-full">
                <p className="text-center text-coc-text-muted mb-6">三张暗牌悬于雾中。选择一张，决定你今晚的梦境。</p>
                <div className="flex justify-center gap-6">
                  {candidates.map((c) => (
                    <TiltCard
                      key={c.key}
                      width="160px"
                      height="224px"
                      rarity={c.rarity as any}
                      tiltIntensity={20}
                    >
                      <button
                        onClick={() => handleSelect(c.key)}
                        disabled={loading}
                        className="w-full h-full bg-gradient-to-br from-coc-bg-tertiary to-coc-bg-secondary rounded-lg flex flex-col items-center justify-center relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity">
                          <Sparkles size={32} className="text-coc-accent-gold" />
                        </div>
                        <div className="absolute bottom-3 left-0 right-0 text-center text-xs text-coc-text-muted">溺者之牌</div>
                        <div className="absolute top-3 left-0 right-0 text-center text-[10px] text-coc-text-muted opacity-60">{c.rarity === 'legendary' ? '传说' : c.rarity === 'epic' ? '史诗' : c.rarity === 'rare' ? '稀有' : '普通'}</div>
                      </button>
                    </TiltCard>
                  ))}
                </div>
              </div>
            )}

            {todayDraw && (
              <div className="w-full flex flex-col md:flex-row gap-8 items-center md:items-start">
                {/* 牌面展示 */}
                <TiltCard
                  width="208px"
                  height="288px"
                  rarity={(currentCardMeta?.rarity || 'common') as any}
                  tiltIntensity={12}
                  className="shrink-0"
                >
                  <div className={`w-full h-full rounded-xl overflow-hidden bg-coc-bg-tertiary relative`}>
                    {currentCardMeta?.imageUrl ? (
                      <img src={currentCardMeta.imageUrl} alt={currentCardMeta.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-coc-text-muted">
                        <span className="text-sm">暂无图鉴素材</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <div className={`font-ritual text-lg ${rarityColor[currentCardMeta?.rarity || 'common']}`}>{currentCardMeta?.name || '未知'}</div>
                      <div className="text-xs text-coc-text-muted">{positionLabel(todayDraw.position)}</div>
                    </div>
                  </div>
                </TiltCard>

                {/* 解牌区 */}
                <div className="flex-1 w-full">
                  {!todayDraw.isRevealed && !todayDraw.isDeepRevealed && (
                    <div className="space-y-4">
                      <p className="text-coc-text-secondary">你抽中了一张牌，但梦境的呓语尚未被解读。</p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleReveal(false)}
                          disabled={loading || (user?.coins || 0) < 50}
                          className="coc-btn-primary flex items-center gap-2 disabled:opacity-50"
                        >
                          <Coins size={16} />
                          普通解牌（50 锈蚀硬币）
                        </button>
                        <button
                          onClick={() => handleReveal(true)}
                          disabled={loading || (user?.stardust || 0) < 10}
                          className="coc-btn-secondary flex items-center gap-2 disabled:opacity-50"
                        >
                          <Gem size={16} />
                          深度解牌（10 虚银）
                        </button>
                      </div>
                      {(user?.coins || 0) < 50 && (
                        <p className="text-xs text-red-400">锈蚀硬币不足</p>
                      )}
                    </div>
                  )}

                  {(todayDraw.isRevealed || todayDraw.isDeepRevealed) && (
                    <div className="space-y-4">
                      <div className="bg-coc-bg-secondary border border-coc-border rounded-lg p-4">
                        <p className="text-sm text-coc-text-muted mb-1">普通解牌结果</p>
                        <p className="text-coc-parchment leading-relaxed">{todayDraw.revealText}</p>
                      </div>

                      {!todayDraw.isDeepRevealed && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReveal(true)}
                            disabled={loading || (user?.stardust || 0) < 10}
                            className="coc-btn-secondary flex items-center gap-2 disabled:opacity-50"
                          >
                            <Gem size={16} />
                            深度解牌（10 虚银）
                          </button>
                        </div>
                      )}

                      {todayDraw.isDeepRevealed && todayDraw.deepRevealText && (
                        <div className="bg-coc-bg-secondary border-l-4 border-purple-500 rounded-lg p-4">
                          <p className="text-sm text-purple-400 mb-1">深度解牌结果</p>
                          <p className="text-coc-parchment leading-relaxed">{todayDraw.deepRevealText}</p>
                        </div>
                      )}

                      {todayDraw.isDeepRevealed && todayDraw.buff && (
                        <div className="bg-coc-bg-secondary border-l-4 border-purple-500 rounded-lg p-4">
                          <p className="text-sm text-purple-400 mb-1">深度解牌 · 触须效应</p>
                          <p className="text-coc-parchment font-medium">{todayDraw.buff.name}</p>
                          <p className="text-xs text-coc-text-muted mt-1">{todayDraw.buff.description}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'collection' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {collection.map((c) => (
            <div
              key={c.key}
              className={`relative aspect-[3/4] rounded-lg border ${
                c.unlocked ? rarityBorder[c.rarity] : 'border-coc-border/40'
              } overflow-hidden bg-coc-bg-secondary`}
            >
              {c.unlocked && c.imageUrl ? (
                <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-coc-bg-tertiary">
                  <Sparkles size={24} className={c.unlocked ? 'text-coc-accent-gold' : 'text-coc-text-muted/30'} />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <div className={`text-sm font-ritual truncate ${c.unlocked ? rarityColor[c.rarity] : 'text-coc-text-muted'}`}>
                  {c.unlocked ? c.name : '???'}
                </div>
                <div className="text-[10px] text-coc-text-muted">{c.drawCount > 0 ? `已抽中 ${c.drawCount} 次` : '未解锁'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.Dreams}
              title="还没有任何梦境记录"
              description="梦境是通往深层真理的门户。当你完成调查后，潜意识将在此显现……"
              size="sm"
              animate={false}
            />
          ) : null}
          {history.map((h) => (
            <div key={h.id} className="bg-coc-bg-secondary border border-coc-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-ritual ${rarityColor[collection.find((c) => c.key === h.cardKey)?.rarity || 'common']}`}>
                    {h.cardName || h.cardKey}
                  </span>
                  <span className="text-xs text-coc-text-muted">{positionLabel(h.position)}</span>
                </div>
                <div className="text-xs text-coc-text-muted mt-1">{new Date(h.drawnAt).toLocaleString()}</div>
              </div>
              <div className="text-right text-sm">
                {h.isDeepRevealed ? (
                  <span className="text-purple-400">已深度解牌</span>
                ) : h.isRevealed ? (
                  <span className="text-coc-text-secondary">已解牌</span>
                ) : (
                  <span className="text-coc-text-muted">未解牌</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
