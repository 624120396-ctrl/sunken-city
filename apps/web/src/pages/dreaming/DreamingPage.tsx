import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Sparkles, BookOpen, History, Coins, Gem } from 'lucide-react';
import { useAuthStore } from '@stores/auth.store';
import { TiltCard } from '@components/ui/TiltCard';
import { Button, PageShell, Surface, Tabs } from '@components/system';

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
  const [error, setError] = useState<string | null>(null);

  // 今日状态
  const [canDraw, setCanDraw] = useState(false);
  const [todayDraw, setTodayDraw] = useState<DreamDraw | null>(null);

  // 抽牌流程
  const [candidates, setCandidates] = useState<DreamCardBrief[] | null>(null);

  // 图鉴和历史
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [history, setHistory] = useState<DreamDraw[]>([]);

  const loadDaily = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch('/dream/daily');
      const data = await handleApiResponse<{ canDraw: boolean; todayDraw: DreamDraw | null }>(res);
      setCanDraw(data.canDraw);
      setTodayDraw(data.todayDraw);
    } catch (e: any) {
      console.error('获取今日占卜失败:', e);
      setError('获取今日占卜失败：' + e.message);
    }
  }, []);

  const loadCollection = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch('/dream/collection');
      const data = await handleApiResponse<CollectionItem[]>(res);
      setCollection(data);
    } catch (e: any) {
      console.error('获取图鉴失败:', e);
      setError('获取图鉴失败：' + e.message);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch('/dream/history?limit=20');
      const data = await handleApiResponse<DreamDraw[]>(res);
      setHistory(data);
    } catch (e: any) {
      console.error('获取历史失败:', e);
      setError('获取历史失败：' + e.message);
    }
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
    <PageShell
      eyebrow="DREAM ORACLE"
      title="溺者之牌"
      description="每晚入睡后，调查员都会坠入共享梦境层。抽一张牌，看看深渊想对你说什么。"
      actions={
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--coc-text-secondary)]">
          <span className="inline-flex items-center gap-1 rounded border border-[var(--coc-border-subtle)] bg-black/25 px-3 py-2">
            <Coins size={14} className="text-[var(--coc-accent-gold)]" />
            {user?.coins ?? 0}
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-[var(--coc-border-subtle)] bg-black/25 px-3 py-2">
            <Gem size={14} className="text-purple-300" />
            {user?.stardust ?? 0}
          </span>
        </div>
      }
    >
      <Surface variant="panel" padding="sm" className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          ariaLabel="溺者之牌视图"
          value={tab}
          onChange={(value) => setTab(value as 'today' | 'collection' | 'history')}
          items={[
            { value: 'today', label: '今日占卜' },
            { value: 'collection', label: '图鉴', count: collection.filter((c) => c.unlocked).length },
            { value: 'history', label: '历史', count: history.length },
          ]}
        />
        <div className="flex items-center gap-2 text-sm text-[var(--coc-text-secondary)]">
          {tab === 'today' && <Sparkles size={16} className="text-[var(--coc-accent-gold)]" />}
          {tab === 'collection' && <BookOpen size={16} className="text-[var(--coc-accent-gold)]" />}
          {tab === 'history' && <History size={16} className="text-[var(--coc-accent-gold)]" />}
          <span>{tab === 'today' ? '梦境通道' : tab === 'collection' ? '牌面索引' : '占卜记录'}</span>
        </div>
      </Surface>

      {error && (
        <Surface variant="danger" tone="blood" padding="sm" className="text-sm">
          {error}
        </Surface>
      )}

      {tab === 'today' && (
        <div className="space-y-6">
          {/* 主交互区 */}
          <Surface variant="elevated" tone="madness" padding="lg" className="relative flex min-h-[22rem] flex-col items-center justify-center overflow-hidden">
            {!todayDraw && canDraw && !candidates && (
              <div className="text-center">
                <p className="mb-6 text-[var(--coc-text-secondary)]">今夜尚未入梦。深渊之牌正在等待你的手指。</p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartDraw}
                  disabled={loading}
                  loading={loading}
                >
                  开始抽牌
                </Button>
              </div>
            )}

            {!todayDraw && canDraw && candidates && (
              <div className="w-full">
                <p className="mb-6 text-center text-[var(--coc-text-secondary)]">三张暗牌悬于雾中。选择一张，决定你今晚的梦境。</p>
                <div className="flex flex-wrap justify-center gap-6">
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
                        className="group relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-[var(--coc-border-subtle)] bg-black/30 shadow-lg shadow-black/40 backdrop-blur-md"
                      >
                        <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-60 transition-opacity">
                          <Sparkles size={36} className="text-[#c9a227]" />
                        </div>
                        <div className="absolute bottom-3 left-0 right-0 text-center text-sm font-medium text-[#d4c5a8] drop-shadow-md">溺者之牌</div>
                        <div className="absolute top-3 left-0 right-0 text-center text-xs text-[#b0a898] drop-shadow-sm">{c.rarity === 'legendary' ? '传说' : c.rarity === 'epic' ? '史诗' : c.rarity === 'rare' ? '稀有' : '普通'}</div>
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
                  <div className="relative h-full w-full overflow-hidden rounded-xl border border-[var(--coc-border-subtle)] bg-black/30 shadow-lg shadow-black/40 backdrop-blur-md">
                    {currentCardMeta?.imageUrl ? (
                      <>
                        <img 
                          src={currentCardMeta.imageUrl} 
                          alt={currentCardMeta.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="absolute inset-0 hidden flex-col items-center justify-center bg-[#1a1a1a]">
                          <Sparkles size={32} className="mb-2 text-[var(--coc-text-muted)]" />
                          <span className="text-sm text-[var(--coc-text-muted)]">图鉴素材暂缺</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <Sparkles size={32} className="mb-2 text-[var(--coc-text-muted)]" />
                        <span className="text-sm text-[var(--coc-text-muted)]">暂无图鉴素材</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                      <div className={`font-ritual text-xl drop-shadow-lg ${rarityColor[currentCardMeta?.rarity || 'common']}`}>{currentCardMeta?.name || '未知'}</div>
                      <div className="text-sm text-[#d4c5a8] mt-1 drop-shadow-sm">{positionLabel(todayDraw.position)}</div>
                    </div>
                  </div>
                </TiltCard>

                {/* 解牌区 */}
                <div className="flex-1 w-full">
                  {!todayDraw.isRevealed && !todayDraw.isDeepRevealed && (
                    <div className="space-y-4">
                      <p className="text-[#d4c5a8] text-lg mb-2 drop-shadow-sm">你抽中了一张牌，但梦境的呓语尚未被解读。</p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="primary"
                          onClick={() => handleReveal(false)}
                          disabled={loading || (user?.coins || 0) < 50}
                          icon={<Coins size={16} />}
                        >
                          普通解牌（50 锈蚀硬币）
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleReveal(true)}
                          disabled={loading || (user?.stardust || 0) < 10}
                          icon={<Gem size={16} />}
                        >
                          深度解牌（10 虚银）
                        </Button>
                      </div>
                      {(user?.coins || 0) < 50 && (
                        <p className="text-xs text-red-400">锈蚀硬币不足</p>
                      )}
                    </div>
                  )}

                  {(todayDraw.isRevealed || todayDraw.isDeepRevealed) && (
                    <div className="space-y-4">
                      <Surface variant="glass" padding="md">
                        <p className="text-sm text-[#b0a898] mb-2 drop-shadow-sm">普通解牌结果</p>
                        <p className="text-[#f0e4cc] text-lg leading-relaxed drop-shadow-md">{todayDraw.revealText}</p>
                      </Surface>

                      {!todayDraw.isDeepRevealed && (
                        <div className="flex gap-3">
                          <Button
                            variant="secondary"
                            onClick={() => handleReveal(true)}
                            disabled={loading || (user?.stardust || 0) < 10}
                            icon={<Gem size={16} />}
                          >
                            深度解牌（10 虚银）
                          </Button>
                        </div>
                      )}

                      {todayDraw.isDeepRevealed && todayDraw.deepRevealText && (
                        <Surface variant="glass" tone="madness" padding="md" className="border-l-4 border-l-purple-500">
                          <p className="text-sm text-purple-300 mb-2 drop-shadow-sm">深度解牌结果</p>
                          <p className="text-[#f0e4cc] text-lg leading-relaxed drop-shadow-md">{todayDraw.deepRevealText}</p>
                        </Surface>
                      )}

                      {todayDraw.isDeepRevealed && todayDraw.buff && (
                        <Surface variant="glass" tone="madness" padding="md" className="border-l-4 border-l-purple-500">
                          <p className="text-sm text-purple-300 mb-2 drop-shadow-sm">深度解牌 · 触须效应</p>
                          <p className="text-[#f0e4cc] text-lg font-medium drop-shadow-md">{todayDraw.buff.name}</p>
                          <p className="text-sm text-[#b0a898] mt-2">{todayDraw.buff.description}</p>
                        </Surface>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Surface>
        </div>
      )}

      {tab === 'collection' && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 [@media(min-width:2200px)]:grid-cols-6">
          {collection.map((c) => (
            <div
              key={c.key}
              className={`relative aspect-[3/4] rounded-lg border ${
                c.unlocked ? rarityBorder[c.rarity] : 'border-[#3a3a3a]/40'
              } overflow-hidden backdrop-blur-md bg-black/30 shadow-md shadow-black/30`}
            >
              {c.unlocked && c.imageUrl ? (
                <>
                  <img 
                    src={c.imageUrl} 
                    alt={c.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="absolute inset-0 hidden flex-col items-center justify-center bg-[#1a1a1a]">
                    <Sparkles size={24} className="text-[#6b6558] mb-2" />
                    <span className="text-xs text-[#6b6558]">素材暂缺</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black/20">
                  <Sparkles size={24} className={c.unlocked ? 'text-coc-accent-gold' : 'text-coc-text-muted/30'} />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                <div className={`text-base font-ritual truncate drop-shadow-md ${c.unlocked ? rarityColor[c.rarity] : 'text-[#9b9080]'}`}>
                  {c.unlocked ? c.name : '???'}
                </div>
                <div className="text-xs text-[#b0a898] mt-1">{c.drawCount > 0 ? `已抽中 ${c.drawCount} 次` : '未解锁'}</div>
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
            <Surface key={h.id} variant="panel" padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-ritual text-lg ${rarityColor[collection.find((c) => c.key === h.cardKey)?.rarity || 'common']}`}>
                    {h.cardName || h.cardKey}
                  </span>
                  <span className="text-sm text-[#8b8375]">{positionLabel(h.position)}</span>
                </div>
                <div className="text-sm text-[#b0a898] mt-1 drop-shadow-sm">{new Date(h.drawnAt).toLocaleString()}</div>
              </div>
              <div className="text-right text-base">
                {h.isDeepRevealed ? (
                  <span className="text-purple-300 drop-shadow-sm">已深度解牌</span>
                ) : h.isRevealed ? (
                  <span className="text-[#b0a898] drop-shadow-sm">已解牌</span>
                ) : (
                  <span className="text-[#9b9080] drop-shadow-sm">未解牌</span>
                )}
              </div>
            </Surface>
          ))}
        </div>
      )}
    </PageShell>
  );
}
