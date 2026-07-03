import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { useEffect, useRef, useState } from 'react';
import { Anchor, Clock3, Fish, PackageOpen, Waves } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { CatchReveal } from '@components/fishing/CatchReveal';
import { FishingCanvas } from '@components/fishing/FishingCanvas';
import { createTensionSnapshot, isTensionCatchReady, type TensionZone } from '@components/fishing/tensionGame';
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
  const [tension, setTension] = useState(42);
  const [tensionZone, setTensionZone] = useState<TensionZone>('safe');
  const [tensionSafeMs, setTensionSafeMs] = useState(0);
  const [reelElapsedMs, setReelElapsedMs] = useState(0);
  const [isReelingInput, setIsReelingInput] = useState(false);

  const timers = useRef<{ wait?: number; bite?: number }>({});
  const stateRef = useRef<FishingState>(state);
  const tensionRef = useRef(42);
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
    const initialTension = 42;
    tensionRef.current = initialTension;
    tensionSafeMsRef.current = 0;
    tensionDangerMsRef.current = 0;
    reelStartedAtRef.current = performance.now();
    reelCompletingRef.current = false;
    isReelingInputRef.current = false;
    setIsReelingInput(false);
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
      setMessage('出售成功');
      reset();
      fetchStatus();
      fetchLogs();
    } catch (e: any) {
      setMessage(e.message || '出售失败');
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
    setTension(42);
    setTensionZone('safe');
    setTensionSafeMs(0);
    setReelElapsedMs(0);
    tensionRef.current = 42;
    tensionSafeMsRef.current = 0;
    tensionDangerMsRef.current = 0;
    reelCompletingRef.current = false;
  };

  useEffect(() => {
    if (state !== 'reeling' || !castData) return;

    let frame = 0;
    let lastFrameAt = performance.now();

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

      if (tensionDangerMsRef.current > 1450 && !reelCompletingRef.current) {
        setResult({ result: snapshot.zone === 'snap' ? 'escaped' : 'missed' });
        setState('result');
        setIsReelingInput(false);
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
  }, [castData, state]);

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
  const tensionLabel: Record<TensionZone, string> = {
    slack: '松线',
    safe: tension >= 38 && tension <= 72 ? '稳定' : '警戒',
    snap: '绷断',
  };

  return (
    <PageShell
      eyebrow="BLACKWATER HARBOR"
      title="黑水港 · 深渊垂钓"
      description="在港口暗潮中抛下钓线，收集异物、出售钓获并记录今日次数。"
      actions={
        <Surface variant="glass" padding="sm" className="flex items-center gap-2 text-sm">
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
              <Surface variant="panel" padding="md" className="relative overflow-hidden">
                <div className="flex items-center gap-2 text-xs text-[var(--coc-text-muted)]">
                  <Waves size={14} className="text-cyan-200" />
                  当前水况
                </div>
                <div className={`mt-2 font-bold ${stateTone[state]}`}>{stateLabel[state]}</div>
              </Surface>
              <Surface variant="panel" padding="md" className="relative overflow-hidden">
                <div className="flex items-center gap-2 text-xs text-[var(--coc-text-muted)]">
                  <Clock3 size={14} className="text-[var(--coc-accent-gold)]" />
                  今日作业
                </div>
                <div className="mt-2 font-bold text-[var(--coc-text-primary)]">{usedCasts}/{status?.dailyLimit ?? '-'}</div>
              </Surface>
              <Surface variant="panel" padding="md" className="relative overflow-hidden">
                <div className="flex items-center gap-2 text-xs text-[var(--coc-text-muted)]">
                  <PackageOpen size={14} className="text-[var(--coc-accent-gold)]" />
                  收集
                </div>
                <div className="mt-2 font-bold text-[var(--coc-text-primary)]">{collectionPct.toFixed(1)}%</div>
              </Surface>
              <Surface variant={status?.canFish ? 'panel' : 'danger'} padding="md" className="relative overflow-hidden">
                <div className="flex items-center gap-2 text-xs text-[var(--coc-text-muted)]">
                  <Anchor size={14} className="text-[var(--coc-accent-gold)]" />
                  船坞许可
                </div>
                <div className="mt-2 font-bold text-[var(--coc-text-primary)]">{status?.canFish ? '可作业' : '已封港'}</div>
              </Surface>
            </div>
          </div>

          <Surface variant="elevated" tone="ocean" padding="sm" className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[var(--coc-border-subtle)] px-3 pb-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--coc-accent-gold-strong)]">
                  <Anchor size={14} />
                  HARBOR OPERATION
                </div>
                <div className="mt-1 text-sm text-[var(--coc-text-secondary)]">观测浮标、等待咬钩窗口，并在红色警示时收竿。</div>
              </div>
              <div className="rounded border border-[var(--coc-border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--coc-text-secondary)]">
                剩余 <span className="font-bold text-[var(--coc-accent-gold)]">{remaining}</span> 次
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
              {state === 'reeling' && (
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
                {state === 'reeling' && (
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
                {state === 'casting' && (
                  <Button disabled variant="secondary" size="lg" className="min-w-40">
                    抛竿中…
                  </Button>
                )}
              </div>
            </div>
          </Surface>
        </div>

        <div className="space-y-4">
          <Surface variant="panel" tone="gold" padding="md" className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[var(--coc-accent-gold)]/45 to-transparent" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--coc-accent-gold-strong)]">
                  <PackageOpen size={14} />
                  SALVAGE INDEX
                </div>
                <h3 className="mt-1 font-bold text-[var(--coc-text-primary)]">收集进度</h3>
              </div>
              <div className="text-right text-2xl font-bold text-[var(--coc-accent-gold)]">{collectionPct.toFixed(0)}%</div>
            </div>
            <div className="mb-2 mt-4 h-2 w-full rounded-full bg-[#0a0a0f]">
              <div
                className="h-2 rounded-full bg-[var(--coc-accent-gold)] transition-all"
                style={{ width: `${collectionPct}%` }}
              />
            </div>
            <p className="text-sm text-[var(--coc-text-secondary)]">港口账本已解锁 {collectionPct.toFixed(1)}%。</p>
          </Surface>

          <Surface variant="panel" padding="md" className="relative overflow-hidden">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--coc-accent-gold-strong)]">
                  <Fish size={14} />
                  CATCH LEDGER
                </div>
                <h3 className="mt-1 font-bold text-[var(--coc-text-primary)]">最近钓获</h3>
              </div>
              <span className="rounded border border-[var(--coc-border-subtle)] bg-black/25 px-2 py-1 text-xs text-[var(--coc-text-secondary)]">{logs.length} 条</span>
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
              <ul className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <li key={log.id} className="min-w-0 rounded border border-[var(--coc-border-subtle)] bg-black/20 p-3 text-sm">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="block max-w-[12rem] truncate font-medium text-[var(--coc-text-primary)]">{log.itemName}</span>
                      <span className="truncate rounded bg-[var(--coc-accent-gold)]/10 px-2 py-1 text-xs text-[#c9a227]">{log.rarity}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="text-xs text-[var(--coc-text-secondary)]">
                        {log.isSold ? (
                          <span className="text-[#8b8375]">已售 {log.sellPrice} {log.sellCurrency === 'coin' ? '锈蚀硬币' : '虚银'}</span>
                        ) : (
                          <span>可售 {log.sellPrice} {log.sellCurrency === 'coin' ? '锈蚀硬币' : '虚银'}</span>
                        )}
                      </div>
                      {!log.isSold && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSellLogId(log.id)}
                          className="h-9 px-3 text-xs"
                        >
                          出售
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
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
