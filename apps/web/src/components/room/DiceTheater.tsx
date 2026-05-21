import { useMemo } from 'react';
import { Dices, Swords, Trophy, Skull } from 'lucide-react';

export interface DiceRollItem {
  id: string;
  userId?: string;
  nickname: string;
  rollType: string;
  targetName?: string;
  targetValue?: number;
  rollResult: number;
  successLevel: string;
  timestamp: string;
}

interface DiceTheaterProps {
  rolls: DiceRollItem[];
  onContrast?: (roll: DiceRollItem) => void;
  maxItems?: number;
  className?: string;
}

const LEVEL_STYLES: Record<string, { text: string; border: string; icon?: any }> = {
  CRITICAL_SUCCESS: { text: 'text-amber-300', border: 'border-amber-300/50', icon: Trophy },
  HARD_SUCCESS: { text: 'text-emerald-400', border: 'border-emerald-400/40' },
  SUCCESS: { text: 'text-green-400', border: 'border-green-400/30' },
  FAILURE: { text: 'text-slate-400', border: 'border-slate-500/30' },
  FUMBLE: { text: 'text-red-500', border: 'border-red-500/50', icon: Skull },
};

function formatTime(ts: string) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function DiceTheater({ rolls, onContrast, maxItems = 20, className = '' }: DiceTheaterProps) {
  const recent = useMemo(() => rolls.slice(-maxItems).reverse(), [rolls, maxItems]);

  return (
    <div className={`coc-card flex flex-col max-h-[50vh] ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Dices size={16} className="text-coc-accent-gold" />
        <div className="font-bold text-sm">骰子剧场</div>
        <div className="ml-auto text-xs text-coc-text-muted">最近 {recent.length}</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {recent.length === 0 ? (
          <div className="text-xs text-coc-text-muted text-center py-4">暂无检定记录</div>
        ) : (
          recent.map((r) => {
            const style = LEVEL_STYLES[r.successLevel] || LEVEL_STYLES.FAILURE;
            const Icon = style.icon || null;
            return (
              <div
                key={r.id}
                className={`relative p-2 rounded border ${style.border} bg-coc-bg-tertiary/40 hover:bg-coc-bg-tertiary transition-colors`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-coc-text-secondary truncate">{r.nickname}</div>
                  <div className="text-[10px] text-coc-text-muted">{formatTime(r.timestamp)}</div>
                </div>
                <div className="flex items-end justify-between gap-2 mt-1">
                  <div className="min-w-0">
                    <div className="text-xs text-coc-parchment truncate">{r.targetName || r.rollType}</div>
                    {r.targetValue != null && (
                      <div className="text-[10px] text-coc-text-muted">目标 {r.targetValue}%</div>
                    )}
                  </div>
                  <div className={`text-lg font-ritual font-bold ${style.text} flex items-center gap-1`}>
                    {Icon && <Icon size={14} />}
                    {r.rollResult}
                  </div>
                </div>
                {onContrast && (
                  <button
                    onClick={() => onContrast(r)}
                    className="absolute top-1.5 right-1.5 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 transition-opacity"
                    title="快速对抗"
                  >
                    <div className="p-1 rounded bg-coc-bg-secondary border border-coc-border text-coc-text-muted hover:text-coc-parchment">
                      <Swords size={10} />
                    </div>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
