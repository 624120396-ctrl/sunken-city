import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { useEffect, useRef, useState } from 'react';
import { Anchor, Clock3, Fish, PackageOpen, Waves } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { CatchReveal } from '@components/fishing/CatchReveal';
import { FishingCanvas } from '@components/fishing/FishingCanvas';
import { getFishingLedgerMeta } from '@components/fishing/fishingLedgerMeta';
import { createTensionSnapshot, isTensionCatchReady, shouldTensionBreak, type TensionZone } from '@components/fishing/tensionGame';
import { Button, PageShell, Surface } from '@components/system';

type FishingState = 'idle' | 'casting' | 'waiting' | 'biting' | 'reeling' | 'result';

interface FishingStatus {
  dailyLimit: number;
  freeUsed: number;
  extraUsed: number;
  extraCost: number;
  canFish: boolean;
}

interface CastData {
  castId: string;
  waitTimeMs: number;
  biteWindowMs: number;
  biteAtMs: number;
}

interface ReelResult {
  result: 'caught' | 'missed' | 'escaped';
  item?: {
    key: string;
    name: string;
    description?: string;
    rarity: 'JUNK' | 'COMMON' | 'UNCOMMON' | 'RARE' | 'ELDRITCH';
    sellPrice: number;
    sellCurrency: string;
    isCollection?: boolean;
    iconUrl?: string;
  };
  logId?: string;
  userCoins?: number;
  freeUsed?: number;
  remaining?: number;
}

interface FishingLogItem {
  id: string;
  itemName: string;
  rarity: string;
  sellPrice: number;
  sellCurrency: string;
  isSold: boolean;
  caughtAt: string;
}

export function FishingPage() {
  const [state, setState] = useState<FishingState>('idle');
  const [status, setStatus] = useState<FishingStatus | null>(null);
  const [castData, setCastData] = useState<CastData | null>(null);
  const [result, setResult] = useState<ReelResult | null>(null);
  const [logs, setLogs] = useState<FishingLogItem[]>([]);
  const [collectionPct, setCollectionPct] = useState(0);
  const [message, setMessage] = useState('');
  const [tension, setTension] = useState(58);
  const [tensionZone, setTensionZone] = useState<TensionZone>('safe');
  const [tensionSafeMs, setTensionSafeMs] = useState(0);
  const [reelElapsedMs, setReelElapsedMs] = useState(0);
  const [isReelingInput, setIsReelingInput] = useState(false);
  const [isTensionActive, setIsTensionActive] = useState(false);

  const timers = useRef<{ wait?: number; bite?: number }>({});
  const stateRef = useRef<FishingState>(state);
  const tensionRef = useRef(58);
  const tensionSafeMsRef = useRef(0);
  const tensionDangerMsRef = useRef(0);
  const reelStartedAtRef = useRef(0);
  const isReelingInputRef = useRef(false);
  const reelCompletingRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    isReelingInputRef.current = isReelingInput;
  }, [isReelingInput]);

  const fetchStatus = async () => {
    try {
      const res = await apiFetch('/fishing/status');
      const data = await handleApiResponse<FishingStatus>(res);
      setStatus(data);
    } catch (e: any) {
      setMessage(e.message || '获取状态失败');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await apiFetch('/fishing/logs?limit=20');
      const data = await handleApiResponse<{ logs: FishingLogItem[] }>(res);
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    }
  };

  const fetchCollection = async () => {
    try {
      const res = await apiFetch('/fishing/collection');
      const data = await handleApiResponse<{ unlocked: string[]; percentage: number }>(res);
      setCollectionPct(data.percentage || 0);
    } catch {
      setCollectionPct(0);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();
    fetchCollection();
  }, []);

  const handleAutoMiss = () => {
    if (stateRef.current !== 'biting') return;
    setState('reeling');
    setTimeout(() => {
      setResult({ result: 'missed' });
      setState('result');
    }, 800);
  };

  const handleCast = async () => {
    if (!status?.canFish) return;
    setState('casting');
    setMessage('');
    try {
      const res = await apiFetch('/fishing/cast', { method: 'POST' });
      const data = await handleApiResponse<CastData>(res);
      setCastData(data);
      setState('waiting');

      timers.current.wait = window.setTimeout(() => {
        setState('biting');
        timers.current.bite = window.setTimeout(() => {
          handleAutoMiss();
        }, data.biteWindowMs);
      }, data.waitTimeMs);
    } catch (e: any) {
      setMessage(e.message || '抛竿失败');
      setState('idle');
    }
  };

  const completeReel = async () => {
    if (!castData) return;
    if (reelCompletingRef.current) return;
    reelCompletingRef.current = true;
    setIsTensionActive(false);
    if (timers.current.wait) clearTimeout(timers.current.wait);
    if (timers.current.bite) clearTimeout(timers.current.bite);
    setState('reeling');
    setIsReelingInput(false);
    try {
      const res = await apiFetch('/fishing/reel', {
        method: 'POST',
        body: JSON.stringify({ castId: castData.castId, timestamp: Date.now() }),
      });
      const data = await handleApiResponse<ReelResult>(res);
      setResult(data);
      setState('result');
      if (typeof data.freeUsed === 'number' && status) {
        setStatus({ ...status, freeUsed: data.freeUsed });
      }
    } catch (e: any) {
      setMessage(e.message || '收竿失败');
      setState('idle');
    } finally {
      reelCompletingRef.current = false;
    }
  };

  const handleStartReelChallenge = () => {
    if (!castData) return;
    if (timers.current.wait) clearTimeout(timers.current.wait);
    if (timers.current.bite) clearTimeout(timers.current.bite);
    const initialTension = 58;
    tensionRef.current = initialTension;
    tensionSafeMsRef.current = 0;
    tensionDangerMsRef.current = 0;
    reelStartedAtRef.current = performance.now();
    reelCompletingRef.current = false;
    isReelingInputRef.current = false;
    setIsReelingInput(false);
    setIsTensionActive(true);
    setTension(initialTension);
    setTensionZone('safe');
    setTensionSafeMs(0);
    setReelElapsedMs(0);
    setState('reeling');
  };

  const handleSell = async () => {
    if (!result || result.result !== 'caught' || !result.logId) return;
    await handleSellLogId(result.logId);
  };

  const handleSellLogId = async (logId: string) => {
    try {
      await apiFetch('/fishing/sell', {
        method: 'POST',
        body: JSON.stringify({ logId }),
      });
      setMessage('已按港务价目封签出手');
      reset();
      fetchStatus();
      fetchLogs();
    } catch (e: any) {
      setMessage(e.message || '出手失败');
    }
  };

  const handleKeep = () => {
    reset();
    fetchStatus();
    fetchLogs();
  };

  const reset = () => {
    setState('idle');
    setResult(null);
    setCastData(null);
    setMessage('');
    setIsReelingInput(false);
    setIsTensionActive(false);
    setTension(58);
    setTensionZone('safe');
    setTensionSafeMs(0);
    setReelElapsedMs(0);
    tensionRef.current = 58;
    tensionSafeMsRef.current = 0;
    tensionDangerMsRef.current = 0;
    reelCompletingRef.current = false;
  };

  useEffect(() => {
    if (state !== 'reeling' || !castData || !isTensionActive) return;

    let frame = 0;
    let lastFrameAt = performance.now();
    if (reelStartedAtRef.current <= 0) reelStartedAtRef.current = lastFrameAt;

    const tick = (now: number) => {
      const deltaMs = Math.min(80, Math.max(0, now - lastFrameAt));
      lastFrameAt = now;
      const elapsedMs = now - reelStartedAtRef.current;
      const snapshot = createTensionSnapshot({
        previous: tensionRef.current,
        elapsedMs: deltaMs,
        isReeling: isReelingInputRef.current,
        phaseMs: elapsedMs,
      });
      const isSafeBand = snapshot.value >= snapshot.safeStart && snapshot.value <= snapshot.safeEnd;

      tensionRef.current = snapshot.value;
      tensionSafeMsRef.current = isSafeBand ? tensionSafeMsRef.current + deltaMs : Math.max(0, tensionSafeMsRef.current - deltaMs * 0.65);
      tensionDangerMsRef.current = snapshot.zone === 'slack' || snapshot.zone === 'snap' ? tensionDangerMsRef.current + deltaMs : Math.max(0, tensionDangerMsRef.current - deltaMs);

      setTension(snapshot.value);
      setTensionZone(snapshot.zone);
      setTensionSafeMs(tensionSafeMsRef.current);
      setReelElapsedMs(elapsedMs);

      if (shouldTensionBreak({ dangerMs: tensionDangerMsRef.current, elapsedMs }) && !reelCompletingRef.current) {
        setResult({ result: snapshot.zone === 'snap' ? 'escaped' : 'missed' });
        setState('result');
        setIsReelingInput(false);
        setIsTensionActive(false);
        return;
      }

      if (isTensionCatchReady({ safeMs: tensionSafeMsRef.current, elapsedMs }) && !reelCompletingRef.current) {
        completeReel();
        return;
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [castData, isTensionActive, state]);

  const remaining =
    typeof status?.dailyLimit === 'number'
      ? Math.max(0, status.dailyLimit - (status.freeUsed || 0))
      : '-';
  const usedCasts = status ? (status.freeUsed || 0) + (status.extraUsed || 0) : 0;
  const stateLabel: Record<FishingState, string> = {
    idle: '等待抛竿',
    casting: '钓线入水',
    waiting: '监听暗潮',
    biting: '目标咬钩',
    reeling: '回收钓线',
    result: '记录钓获',
  };
  const stateTone: Record<FishingState, string> = {
    idle: 'text-[var(--coc-text-primary)]',
    casting: 'text-cyan-200',
    waiting: 'text-[var(--coc-accent-gold)]',
    biting: 'text-[var(--coc-accent-blood)]',
    reeling: 'text-cyan-100',
    result: 'text-[var(--coc-accent-gold)]',
  };

  const canCast = state === 'idle' && !!status?.canFish;
  const tensionProgress = Math.min(100, Math.round((tensionSafeMs / 1800) * 100));
  const unsoldCount = logs.filter((log) => !log.isSold).length;
  const rareCount = logs.filter((log) => ['RARE', 'ELDRITCH'].includes(String(log.rarity).toUpperCase())).length;
  const tensionLabel: Record<TensionZone, string> = {
    slack: '松线',
    safe: tension >= 38 && tension <= 72 ? '稳定' : '警戒',
    snap: '绷断',
  };
  const harborPhases = [
    {
      label: '潮汐等待',
      value: stateLabel[state],
      detail: '听潮、放线，等雾下的东西先开口。',
      icon: Waves,
      active: ['idle', 'casting', 'waiting'].includes(state),
      tone: stateTone[state],
    },
    {
      label: '咬钩警讯',
      value: state === 'biting' ? '红灯已亮' : '静默监听',
      detail: '只在短暂窗口内收线，血红只留给危险信号。',
      icon: Anchor,
      active: state === 'biting',
      tone: state === 'biting' ? 'text-[var(--coc-accent-blood)]' : 'text-[var(--coc-text-primary)]',
    },
    {
      label: '收竿结算',
      value: state === 'reeling' ? tensionLabel[tensionZone] : state === 'result' ? '等待登记' : '尚未接触',
      detail: '按住收线保持张力，过松或绷断都会让暗影脱逃。',
      icon: Clock3,
      active: state === 'reeling' || state === 'result',
      tone: state === 'reeling' ? 'text-cyan-100' : 'text-[var(--coc-text-primary)]',
    },
    {
      label: '渔获账本',
      value: `${collectionPct.toFixed(1)}%`,
      detail: `未封存 ${unsoldCount} 件，稀有记录 ${rareCount} 件。`,
      icon: PackageOpen,
      active: logs.length > 0,
      tone: 'text-[var(--coc-accent-gold)]',
    },
  ];

  return (
    <PageShell
      className="blackwater-harbor-page"
      eyebrow="BLACKWATER HARBOR"
      title="黑水港作业台"
      description="在冷雾码头记录潮汐、监听咬钩、回收异物，并把每一次渔获封入港口账本。"
      actions={
        <Surface variant="glass" material="archive" padding="sm" className="flex items-center gap-2 text-sm">
          <Fish size={16} className="text-[var(--coc-accent-gold)]" />
          <span className="text-[var(--coc-text-secondary)]">今日剩余</span>
          <span className="font-bold text-[var(--coc-accent-gold)]">{remaining}</span>
          <span className="text-[var(--coc-text-secondary)]">次</span>
        </Surface>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]">
        <div className="space-y-4">
          <div className="coc-section-stack">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {harborPhases.map((phase) => {
                const Icon = phase.icon;
                return (
                  <Surface
                    key={phase.label}
                    variant={phase.active ? 'elevated' : 'panel'}
                    tone={phase.label === '咬钩警讯' && phase.active ? 'blood' : 'gold'}
                    material="archive"
                    padding="md"
                    className="relative min-h-32 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 text-xs text-[var(--coc-text-muted)]">
                      <Icon size={14} className={phase.label === '咬钩警讯' && phase.active ? 'text-[var(--coc-accent-blood)]' : 'text-[var(--coc-accent-gold)]'} />
                      {phase.label}
                    </div>
                    <div className={`mt-2 font-bold ${phase.tone}`}>{phase.value}</div>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--coc-text-secondary)]">{phase.detail}</p>
                  </Surface>
                );
              })}
            </div>
          </div>

          <Surface variant="elevated" tone="ocean" material="archive" padding="sm" className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[var(--coc-border-subtle)] px-3 pb-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--coc-accent-gold-strong)]">
                  <Anchor size={14} />
                  HARBOR OPERATION
                </div>
                <div className="mt-1 text-sm text-[var(--coc-text-secondary)]">观测浮标、等待咬钩窗口，并在血红警讯出现时收竿。</div>
              </div>
              <div className="coc-archive-subcard px-3 py-2 text-sm text-[var(--coc-text-secondary)]">
                今日作业 <span className="font-bold text-[var(--coc-accent-gold)]">{usedCasts}/{status?.dailyLimit ?? '-'}</span>
              </div>
            </div>
            <div
              className="fishing-stage relative h-[24rem] w-full overflow-hidden rounded-lg border border-[var(--coc-border-subtle)] md:h-[31rem] 2xl:h-[38rem]"
            >
              <FishingCanvas state={state} />
              {state === 'biting' && (
                <div className="fishing-bite-alert">
                  <span>咬钩</span>
                </div>
              )}
              {state === 'reeling' && isTensionActive && (
                <div className="fishing-tension-hud">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--coc-accent-gold-strong)]">LINE TENSION</div>
                      <div className="mt-1 text-sm font-bold text-[var(--coc-text-primary)]">控线回收 · {tensionLabel[tensionZone]}</div>
                    </div>
                    <div className="text-right text-xl font-bold text-[var(--coc-accent-gold)]">{Math.round(tension)}</div>
                  </div>
                  <div className="fishing-tension-rail mt-3" data-zone={tensionZone}>
                    <div className="fishing-tension-safe-zone" />
                    <div className="fishing-tension-fill" style={{ width: `${tension}%` }} />
                    <div className="fishing-tension-marker" style={{ left: `${tension}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--coc-text-secondary)]">
                    <span>{isReelingInput ? '正在收线，张力上升' : '松开冷却，张力回落'}</span>
                    <span>{(reelElapsedMs / 1000).toFixed(1)}s · 稳定 {tensionProgress}%</span>
                  </div>
                </div>
              )}
              {state === 'result' && result && (
                <>
                  {result.result === 'caught' && result.item ? (
                    <CatchReveal item={result.item} onSell={handleSell} onKeep={handleKeep} />
                  ) : (
                    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center">
                      <Surface variant="panel" tone="blood" padding="lg" className="w-72 text-center">
                        <p className="text-[var(--coc-text-secondary)]">脱钩了...什么都没有</p>
                        <Button onClick={reset} variant="primary" className="mt-4 w-full">
                          再来一次
                        </Button>
                      </Surface>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-col gap-3 px-3 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[var(--coc-text-secondary)]">
                状态：<span className="font-bold text-[var(--coc-text-primary)]">{stateLabel[state]}</span>
              </div>
              <div className="flex justify-start sm:justify-end">
                {state === 'idle' && (
                  <Button
                    onClick={handleCast}
                    disabled={!canCast}
                    variant="primary"
                    size="lg"
                    className="min-w-40"
                  >
                    抛竿
                  </Button>
                )}
                {state === 'waiting' && (
                  <Button disabled variant="secondary" size="lg" className="min-w-40">
                    等待中…
                  </Button>
                )}
                {state === 'biting' && (
                  <Button
                    onClick={handleStartReelChallenge}
                    variant="danger"
                    size="lg"
                    className="min-w-40 animate-pulse"
                  >
                    控线！
                  </Button>
                )}
                {state === 'reeling' && isTensionActive && (
                  <Button
                    variant="danger"
                    size="lg"
                    className="min-w-44"
                    onPointerDown={() => setIsReelingInput(true)}
                    onPointerUp={() => setIsReelingInput(false)}
                    onPointerLeave={() => setIsReelingInput(false)}
                    onPointerCancel={() => setIsReelingInput(false)}
                    onKeyDown={(event) => {
                      if (event.key === ' ' || event.key === 'Enter') setIsReelingInput(true);
                    }}
                    onKeyUp={() => setIsReelingInput(false)}
                  >
                    {isReelingInput ? '保持张力' : '按住收线'}
                  </Button>
                )}
                {state === 'reeling' && !isTensionActive && (
                  <Button disabled variant="secondary" size="lg" className="min-w-40">
                    收竿中…
                  </Button>
                )}
                {state === 'casting' && (
                  <Button disabled variant="secondary" size="lg" className="min-w-40">
                    抛竿中…
                  </Button>
                )}
              </div>
            </div>
          </Surface>
        </div>

        <div className="fishing-ledger-column space-y-4">
          <Surface variant="panel" tone="gold" material="archive" padding="md" className="fishing-index-panel relative overflow-hidden">
            <div className="fishing-ledger-ornament" />
            <div className="relative z-[1] flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--coc-accent-gold-strong)]">
                  <PackageOpen size={14} />
                  SALVAGE INDEX
                </div>
                <h3 className="mt-1 font-bold text-[var(--coc-text-primary)]">渔获账本</h3>
              </div>
              <div className="fishing-index-panel__rank">{collectionPct.toFixed(0)}%</div>
            </div>
            <div className="fishing-index-panel__rail mb-2 mt-4">
              <div
                className="h-full rounded-full bg-[var(--coc-accent-gold)] transition-all"
                style={{ width: `${collectionPct}%` }}
              />
            </div>
            <div className="fishing-index-panel__stats">
              <span>未售 {unsoldCount}</span>
              <span>稀有 {rareCount}</span>
              <span>记录 {logs.length}</span>
            </div>
            <p className="relative z-[1] mt-3 text-sm text-[var(--coc-text-secondary)]">渔获账本已解锁 {collectionPct.toFixed(1)}%，可疑异物会进入封存序列。</p>
          </Surface>

          <Surface variant="panel" material="archive" padding="md" className="fishing-ledger-panel relative overflow-hidden">
            <div className="fishing-ledger-ornament" />
            <div className="relative z-[1] mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--coc-accent-gold-strong)]">
                  <Fish size={14} />
                  CATCH LEDGER
                </div>
                <h3 className="mt-1 font-bold text-[var(--coc-text-primary)]">可疑渔获</h3>
              </div>
              <span className="fishing-ledger-panel__counter">{logs.length} 条</span>
            </div>
            {logs.length === 0 ? (
              <EmptyState
                icon={EmptyIcons.Fishing}
                title="还没有钓获记录"
                description="前往水域，抛下钓线，等待深渊的回应……"
                size="sm"
                animate={false}
              />
            ) : (
              <ul className="fishing-ledger-list">
                {logs.map((log) => {
                  const ledger = getFishingLedgerMeta({
                    rarity: log.rarity,
                    isSold: log.isSold,
                    sellPrice: log.sellPrice,
                    sellCurrency: log.sellCurrency,
                  });
                  return (
                    <li key={log.id} className="fishing-ledger-entry" data-tone={ledger.tone} data-sold={log.isSold ? 'true' : 'false'}>
                      <div className="fishing-ledger-entry__seal">{ledger.sealLabel}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="fishing-ledger-entry__name">{log.itemName}</span>
                          <span className="fishing-ledger-entry__rarity">{ledger.rarityLabel}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="min-w-0 text-xs">
                            <span className="fishing-ledger-entry__status">{ledger.statusLabel}</span>
                            <span className="mx-2 text-[var(--coc-text-muted)]">/</span>
                            <span className="text-[var(--coc-text-secondary)]">{ledger.priceLabel}</span>
                          </div>
                          {!log.isSold && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleSellLogId(log.id)}
                              className="h-9 px-3 text-xs"
                            >
                              封存
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Surface>
        </div>
      </div>

      {message && (
        <Surface variant="danger" tone="blood" padding="sm" className="break-words px-2 text-center text-sm">
          {message}
        </Surface>
      )}
    </PageShell>
  );
}
