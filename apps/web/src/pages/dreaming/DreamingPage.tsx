import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import type { CSSProperties } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Sparkles, BookOpen, History, Coins, Gem, Eye, Moon, ScrollText, Wand2, Waves } from 'lucide-react';
import { useAuthStore } from '@stores/auth.store';
import { TiltCard } from '@components/ui/TiltCard';
import { Button, PageShell, Surface, Tabs } from '@components/system';
import { getDreamingOraclePhase, getOracleCandidateSlots, getOracleRarityMeta } from '@components/dreaming/dreamingOracleMeta';
import { getDreamArchiveCardMeta, getDreamArchiveSummary, getDreamHistoryMeta } from '@components/dreaming/dreamingArchiveMeta';

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
  const [selectingKey, setSelectingKey] = useState<string | null>(null);

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
      setSelectingKey(key);
      await new Promise((resolve) => window.setTimeout(resolve, 260));
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
      setSelectingKey(null);
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

  const positionLabel = (p?: string) => (p === 'upright' ? '正位' : p === 'reversed' ? '逆位' : '');

  const currentCardMeta = collection.find((c) => c.key === todayDraw?.cardKey) ||
    candidates?.find((c) => c.key === todayDraw?.cardKey);
  const unlockedCount = collection.filter((c) => c.unlocked).length;
  const archiveSummary = getDreamArchiveSummary(collection);
  const oraclePhase = getDreamingOraclePhase({
    canDraw,
    hasTodayDraw: Boolean(todayDraw),
    candidateCount: candidates?.length ?? 0,
    isRevealed: Boolean(todayDraw?.isRevealed),
    isDeepRevealed: Boolean(todayDraw?.isDeepRevealed),
  });
  const candidateSlots = candidates ? getOracleCandidateSlots(candidates, selectingKey) : [];
  const currentRarityMeta = getOracleRarityMeta(currentCardMeta?.rarity || 'common');

  return (
    <PageShell
      className="dreaming-page-shell"
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
      <div className="coc-section-stack">
        <Surface variant="panel" padding="md" className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-purple-300/45 to-transparent" />
          <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-center">
            <Tabs
              ariaLabel="溺者之牌视图"
              value={tab}
              onChange={(value) => setTab(value as 'today' | 'collection' | 'history')}
              items={[
                { value: 'today', label: '今日占卜' },
                { value: 'collection', label: '图鉴', count: unlockedCount },
                { value: 'history', label: '历史', count: history.length },
              ]}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded border border-[var(--coc-border-subtle)] bg-black/25 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-[var(--coc-text-muted)]">
                  <Moon size={14} className="text-purple-300" />
                  梦境状态
                </div>
                <div className="mt-1 font-bold text-[var(--coc-text-primary)]">{oraclePhase.title}</div>
              </div>
              <div className="rounded border border-[var(--coc-border-subtle)] bg-black/25 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-[var(--coc-text-muted)]">
                  <BookOpen size={14} className="text-[var(--coc-accent-gold)]" />
                  图鉴
                </div>
                <div className="mt-1 font-bold text-[var(--coc-text-primary)]">{unlockedCount}/{collection.length || '-'}</div>
              </div>
              <div className="rounded border border-[var(--coc-border-subtle)] bg-black/25 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-[var(--coc-text-muted)]">
                  <History size={14} className="text-[var(--coc-accent-gold)]" />
                  记录
                </div>
                <div className="mt-1 font-bold text-[var(--coc-text-primary)]">{history.length} 次占卜</div>
              </div>
            </div>
          </div>
        </Surface>

        {error && (
          <Surface variant="danger" tone="blood" padding="sm" className="text-sm">
            {error}
          </Surface>
        )}

        {tab === 'today' && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]">
            <Surface variant="elevated" tone="madness" padding="lg" className="relative overflow-hidden">
              <div className={`oracle-stage oracle-stage--${oraclePhase.key} flex flex-col items-center justify-center`}>
                <div className="oracle-card-ring" />
                <div className="oracle-card-ring oracle-card-ring--inner" />
                <div className="pointer-events-none absolute inset-x-8 top-10 h-px bg-gradient-to-r from-transparent via-purple-200/40 to-transparent" />
                <div className="pointer-events-none absolute inset-x-8 bottom-10 h-px bg-gradient-to-r from-transparent via-[var(--coc-accent-gold)]/35 to-transparent" />
                <div className="oracle-ritual-hud">
                  <div className="oracle-phase-chip">
                    <Moon size={14} />
                    <span>{oraclePhase.title}</span>
                  </div>
                  <div className="oracle-phase-copy">{oraclePhase.prompt}</div>
                </div>
                <div className="relative z-10 w-full">
            {!todayDraw && canDraw && !candidates && (
              <div className="oracle-ready mx-auto max-w-xl text-center">
                <div className="oracle-seal-row" aria-hidden="true">
                  <span className="oracle-seal">I</span>
                  <span className="oracle-seal oracle-seal--active">II</span>
                  <span className="oracle-seal">III</span>
                </div>
                <div className="oracle-ready-icon mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-purple-300/30 bg-purple-950/30 text-purple-200 shadow-[0_0_32px_rgba(168,85,247,0.18)]">
                  <Wand2 size={28} />
                </div>
                <p className="mb-6 text-lg leading-relaxed text-[var(--coc-text-secondary)]">{oraclePhase.prompt}</p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartDraw}
                  disabled={loading}
                  loading={loading}
                >
                  {oraclePhase.actionLabel}
                </Button>
              </div>
            )}

            {!todayDraw && canDraw && candidates && (
              <div className="w-full">
                <p className="oracle-selection-prompt mb-6 text-center text-lg text-[var(--coc-text-secondary)]">{oraclePhase.prompt}</p>
                <div className="oracle-card-spread grid grid-cols-1 justify-items-center gap-5 sm:grid-cols-3 lg:gap-8">
                  {candidateSlots.map((c) => {
                    const slotRarityMeta = getOracleRarityMeta(c.rarity);
                    return (
                    <TiltCard
                      key={c.key}
                      width="172px"
                      height="240px"
                      rarity={c.rarity as any}
                      tiltIntensity={20}
                    >
                      <button
                        onClick={() => handleSelect(c.key)}
                        disabled={loading}
                        data-selecting={c.selected}
                        data-oracle-rarity={slotRarityMeta.tone}
                        style={{
                          '--oracle-card-y': `${c.translateY}px`,
                          '--oracle-card-rotate': `${c.rotate}deg`,
                        } as CSSProperties}
                        className="oracle-card-choice group relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-purple-200/20 bg-[#080b13]/80 shadow-lg shadow-black/40 backdrop-blur-md"
                      >
                        <div className="oracle-card-choice__frame absolute inset-3 rounded-lg border border-[var(--coc-accent-gold)]/20" />
                        <div className="oracle-card-choice__label">{c.label}</div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-40 transition-opacity group-hover:opacity-70">
                          <Sparkles size={36} className="text-[#c9a227]" />
                        </div>
                        <div className="oracle-card-choice__seal">{slotRarityMeta.seal}</div>
                        <div className="absolute bottom-3 left-0 right-0 text-center text-sm font-medium text-[#d4c5a8] drop-shadow-md">溺者之牌</div>
                        <div className="absolute top-3 left-0 right-0 text-center text-xs text-[#b0a898] drop-shadow-sm">{slotRarityMeta.label} · {slotRarityMeta.accent}</div>
                      </button>
                    </TiltCard>
                    );
                  })}
                </div>
              </div>
            )}

            {todayDraw && (
              <div className="flex w-full flex-col items-center gap-8 md:flex-row md:items-start">
                {/* 牌面展示 */}
                <TiltCard
                  width="208px"
                  height="288px"
                  rarity={(currentCardMeta?.rarity || 'common') as any}
                  tiltIntensity={12}
                  className="shrink-0"
                >
                  <div className="oracle-current-card relative h-full w-full overflow-hidden rounded-xl border border-purple-200/25 bg-[#080b13]/80 shadow-lg shadow-black/40 backdrop-blur-md" data-oracle-rarity={currentRarityMeta.tone}>
                    <div className="oracle-current-card__seal">{currentRarityMeta.seal}</div>
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
                      <div className="mt-1 flex items-center gap-2 text-sm text-[#d4c5a8] drop-shadow-sm">
                        <span>{positionLabel(todayDraw.position)}</span>
                        <span className="text-[#8b8375]">·</span>
                        <span>{currentRarityMeta.accent}</span>
                      </div>
                    </div>
                  </div>
                </TiltCard>

                {/* 解牌区 */}
                <div className="w-full flex-1">
                  {!todayDraw.isRevealed && !todayDraw.isDeepRevealed && (
                    <div className="space-y-4">
                      <div className="oracle-reading-heading">
                        <Waves size={18} />
                        <span>{oraclePhase.prompt}</span>
                      </div>
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
                      <Surface variant="glass" padding="md" className="oracle-reveal-panel">
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
                        <Surface variant="glass" tone="madness" padding="md" className="oracle-reveal-panel border-l-4 border-l-purple-500">
                          <p className="text-sm text-purple-300 mb-2 drop-shadow-sm">深度解牌结果</p>
                          <p className="text-[#f0e4cc] text-lg leading-relaxed drop-shadow-md">{todayDraw.deepRevealText}</p>
                        </Surface>
                      )}

                      {todayDraw.isDeepRevealed && todayDraw.buff && (
                        <Surface variant="glass" tone="madness" padding="md" className="oracle-reveal-panel border-l-4 border-l-purple-500">
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
                </div>
              </div>
            </Surface>

            <div className="space-y-4">
            <Surface variant="panel" padding="md" className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-y-4 left-0 w-px bg-purple-300/35" />
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-purple-200">
                <Eye size={14} />
                ORACLE BRIEF
              </div>
              <div className="mt-4 space-y-3 text-sm text-[var(--coc-text-secondary)]">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[var(--coc-accent-gold)]" />
                  <span>普通解牌提供今日行动暗示，深度解牌会追加触须效应。</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-purple-300" />
                  <span>牌面图鉴和历史记录会在完成占卜后同步刷新。</span>
                </div>
              </div>
            </Surface>

            <Surface variant="panel" padding="md" className="grid gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--coc-accent-gold-strong)]">
                <Coins size={14} />
                COST LEDGER
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border border-[var(--coc-border-subtle)] bg-black/25 p-3">
                  <div className="text-xs text-[var(--coc-text-muted)]">普通解牌</div>
                  <div className="mt-1 font-bold text-[var(--coc-text-primary)]">50 硬币</div>
                </div>
                <div className="rounded border border-[var(--coc-border-subtle)] bg-black/25 p-3">
                  <div className="text-xs text-[var(--coc-text-muted)]">深度解牌</div>
                  <div className="mt-1 font-bold text-[var(--coc-text-primary)]">10 虚银</div>
                </div>
              </div>
            </Surface>
            </div>
          </div>
        )}

        {tab === 'collection' && (
          <div className="dream-archive space-y-4">
            <Surface variant="panel" padding="md" className="dream-archive-toolbar">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--coc-accent-gold-strong)]">
                  <BookOpen size={14} />
                  CARD ARCHIVE
                </div>
                <p className="mt-1 text-sm text-[var(--coc-text-secondary)]">牌库以封印层级归档，未解锁牌面保持盐雾遮蔽。</p>
              </div>
              <div className="dream-archive-stats">
                <span><strong>{archiveSummary.unlocked}</strong> 已归档</span>
                <span><strong>{archiveSummary.sealed}</strong> 封存</span>
                <span>{archiveSummary.progressLabel}</span>
              </div>
            </Surface>

            <div className="dream-archive-grid">
              {collection.map((c) => {
                const meta = getDreamArchiveCardMeta(c);
                return (
                  <div
                    key={c.key}
                    className="dream-archive-card group"
                    data-dream-tone={meta.tone}
                    data-unlocked={c.unlocked}
                  >
                    <div className="dream-archive-card__ribbon">
                      <span>{meta.lockLabel}</span>
                      <span>{meta.rarityLabel}</span>
                    </div>
                    <div className="dream-archive-card__seal">{meta.seal}</div>
                    <div className="dream-archive-card__frame" />
                    {c.unlocked && c.imageUrl ? (
                      <>
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="absolute inset-0 hidden flex-col items-center justify-center bg-[#1a1a1a]">
                          <Sparkles size={24} className="mb-2 text-[#6b6558]" />
                          <span className="text-xs text-[#6b6558]">素材暂缺</span>
                        </div>
                      </>
                    ) : (
                      <div className="dream-archive-card__sealed">
                        <Sparkles size={26} />
                        <span>{c.unlocked ? '素材暂缺' : 'SEALED'}</span>
                      </div>
                    )}
                    <div className="dream-archive-card__footer">
                      <div className={`truncate font-ritual text-base drop-shadow-md ${c.unlocked ? rarityColor[c.rarity] : 'text-[#9b9080]'}`}>
                        {meta.title}
                      </div>
                      <div className="mt-1 text-xs text-[#b0a898]">{meta.subtitle}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="dream-history space-y-3">
          {history.length > 0 && (
            <Surface variant="panel" padding="md" className="dream-history-toolbar">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--coc-accent-gold-strong)]">
                  <ScrollText size={14} />
                  DREAM LOG
                </div>
                <p className="mt-1 text-sm text-[var(--coc-text-secondary)]">按最近占卜顺序记录牌面、方向和解读深度。</p>
              </div>
              <div className="hidden rounded border border-[var(--coc-border-subtle)] bg-black/25 px-3 py-2 text-sm text-[var(--coc-text-secondary)] sm:block">
                {history.length} 条
              </div>
            </Surface>
          )}
          {history.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.Dreams}
              title="还没有任何梦境记录"
              description="梦境是通往深层真理的门户。当你完成调查后，潜意识将在此显现……"
              size="sm"
              animate={false}
            />
          ) : null}
          {history.map((h) => {
            const meta = getDreamHistoryMeta(h);
            const cardRarity = collection.find((c) => c.key === h.cardKey)?.rarity || 'common';
            return (
              <Surface key={h.id} variant="panel" padding="md" className="dream-history-entry" data-history-status={meta.statusTone}>
                <div className="dream-history-entry__seal">{meta.seal}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`truncate font-ritual text-lg ${rarityColor[cardRarity]}`}>
                      {h.cardName || h.cardKey}
                    </span>
                    <span className="dream-history-entry__position">{meta.positionLabel}</span>
                  </div>
                  <div className="mt-1 text-sm text-[#b0a898] drop-shadow-sm">{new Date(h.drawnAt).toLocaleString()}</div>
                </div>
                <div className="dream-history-entry__status">{meta.statusLabel}</div>
              </Surface>
            );
          })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
