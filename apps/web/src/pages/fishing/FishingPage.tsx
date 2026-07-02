import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { useEffect, useRef, useState } from 'react';
import { Fish } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { WaterSurface } from '@components/fishing/WaterSurface';
import { FishingRod } from '@components/fishing/FishingRod';
import { Bobber } from '@components/fishing/Bobber';
import { FishingLine } from '@components/fishing/FishingLine';
import { CatchReveal } from '@components/fishing/CatchReveal';
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

  const stageRef = useRef<HTMLDivElement>(null);
  const rodTipRef = useRef<SVGCircleElement>(null);
  const bobberRef = useRef<HTMLDivElement>(null);

  const timers = useRef<{ wait?: number; bite?: number }>({});
  const stateRef = useRef<FishingState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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

  const handleReel = async () => {
    if (!castData) return;
    if (timers.current.wait) clearTimeout(timers.current.wait);
    if (timers.current.bite) clearTimeout(timers.current.bite);
    setState('reeling');
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
    }
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
  };

  const remaining =
    typeof status?.dailyLimit === 'number'
      ? Math.max(0, status.dailyLimit - (status.freeUsed || 0))
      : '-';

  const canCast = state === 'idle' && !!status?.canFish;

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
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,25rem)]">
        {/* Main Stage */}
        <div className="space-y-4">
          <Surface variant="elevated" tone="ocean" padding="sm" className="overflow-hidden">
            <div
              ref={stageRef}
              className="fishing-stage relative h-[22rem] w-full overflow-hidden rounded-lg border border-[var(--coc-border-subtle)] md:h-[28rem] 2xl:h-[34rem]"
            >
              <WaterSurface />
              <FishingRod ref={rodTipRef} />
              <Bobber ref={bobberRef} state={state} />
              <FishingLine
                rodTipRef={rodTipRef}
                bobberRef={bobberRef}
                containerRef={stageRef}
                state={state}
              />
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
          </Surface>

          {/* Action Button */}
          <div className="flex justify-center">
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
                onClick={handleReel}
                variant="danger"
                size="lg"
                className="min-w-40 animate-pulse"
              >
                收竿！
              </Button>
            )}
            {(state === 'casting' || state === 'reeling') && (
              <Button disabled variant="secondary" size="lg" className="min-w-40">
                {state === 'casting' ? '抛竿中…' : '收竿中…'}
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Surface variant="panel" tone="gold" padding="md">
            <h3 className="mb-2 font-bold text-[var(--coc-text-primary)]">收集进度</h3>
            <div className="mb-2 h-2 w-full rounded-full bg-[#0a0a0f]">
              <div
                className="h-2 rounded-full bg-[var(--coc-accent-gold)] transition-all"
                style={{ width: `${collectionPct}%` }}
              />
            </div>
            <p className="text-sm text-[var(--coc-text-secondary)]">{collectionPct.toFixed(1)}% 已解锁</p>
          </Surface>

          <Surface variant="panel" padding="md">
            <h3 className="mb-2 font-bold text-[var(--coc-text-primary)]">最近钓获</h3>
            {logs.length === 0 ? (
              <EmptyState
                icon={EmptyIcons.Fishing}
                title="还没有钓获记录"
                description="前往水域，抛下钓线，等待深渊的回应……"
                size="sm"
                animate={false}
              />
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <li key={log.id} className="min-w-0 border-b border-[var(--coc-border-subtle)] pb-2 text-sm last:border-0">
                    <div className="flex items-center justify-between min-w-0 gap-2">
                      <span className="block max-w-[12rem] truncate font-medium text-[var(--coc-text-primary)]">{log.itemName}</span>
                      <span className="text-[#c9a227] text-xs truncate">{log.rarity}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
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
