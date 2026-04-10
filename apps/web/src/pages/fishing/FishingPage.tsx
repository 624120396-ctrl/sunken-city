import { useEffect, useRef, useState } from 'react';
import { Fish } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { WaterSurface } from '@components/fishing/WaterSurface';
import { FishingRod } from '@components/fishing/FishingRod';
import { Bobber } from '@components/fishing/Bobber';
import { FishingLine } from '@components/fishing/FishingLine';
import { CatchReveal } from '@components/fishing/CatchReveal';

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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Fish className="text-coc-accent-red" size={28} />
          <h1 className="text-2xl font-serif font-bold">黑水港 · 深渊垂钓</h1>
        </div>
        <div className="px-3 py-1 rounded-full bg-coc-bg-tertiary text-sm border border-coc-void">
          今日剩余 <span className="text-coc-accent-gold font-bold">{remaining}</span> 次
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stage */}
        <div className="lg:col-span-2 space-y-4">
          <div
            ref={stageRef}
            className="relative w-full h-80 rounded-lg border border-coc-void overflow-hidden fishing-stage"
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
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-auto">
                    <div className="catch-reveal-card">
                      <div className="reveal-inner">
                        <p className="text-coc-text-muted">脱钩了…什么都没有</p>
                        <button onClick={reset} className="coc-btn-primary w-full mt-4">
                          再来一次
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            {state === 'idle' && (
              <button
                onClick={handleCast}
                disabled={!canCast}
                className="coc-btn-primary text-lg px-10 py-4"
              >
                抛竿
              </button>
            )}
            {state === 'waiting' && (
              <button disabled className="coc-btn-secondary text-lg px-10 py-4">
                等待中…
              </button>
            )}
            {state === 'biting' && (
              <button
                onClick={handleReel}
                className="coc-btn-blood text-lg px-10 py-4 animate-pulse"
              >
                收竿！
              </button>
            )}
            {(state === 'casting' || state === 'reeling') && (
              <button disabled className="coc-btn-secondary text-lg px-10 py-4">
                {state === 'casting' ? '抛竿中…' : '收竿中…'}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="coc-card">
            <h3 className="font-bold mb-2">收集进度</h3>
            <div className="w-full bg-coc-abyss rounded-full h-2 mb-2">
              <div
                className="bg-coc-gold h-2 rounded-full transition-all"
                style={{ width: `${collectionPct}%` }}
              />
            </div>
            <p className="text-sm text-coc-text-secondary">{collectionPct.toFixed(1)}% 已解锁</p>
          </div>

          <div className="coc-card">
            <h3 className="font-bold mb-2">最近钓获</h3>
            {logs.length === 0 ? (
              <p className="text-sm text-coc-text-muted">还没有钓获记录</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <li key={log.id} className="text-sm border-b border-coc-void pb-2 last:border-0 min-w-0">
                    <div className="flex items-center justify-between min-w-0 gap-2">
                      <span className="font-medium truncate max-w-[8rem] block">{log.itemName}</span>
                      <span className="text-coc-gold text-xs truncate">{log.rarity}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs text-coc-text-muted">
                        {log.isSold ? (
                          <span className="text-coc-text-secondary">已售 {log.sellPrice} {log.sellCurrency === 'coin' ? '锈蚀硬币' : '虚银'}</span>
                        ) : (
                          <span>可售 {log.sellPrice} {log.sellCurrency === 'coin' ? '锈蚀硬币' : '虚银'}</span>
                        )}
                      </div>
                      {!log.isSold && (
                        <button
                          onClick={() => handleSellLogId(log.id)}
                          className="text-[10px] px-2 py-0.5 rounded bg-coc-gold text-coc-abyss font-medium hover:bg-coc-gold-glow transition-colors"
                        >
                          出售
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className="text-center text-coc-accent-red text-sm break-words px-2">{message}</div>
      )}
    </div>
  );
}
