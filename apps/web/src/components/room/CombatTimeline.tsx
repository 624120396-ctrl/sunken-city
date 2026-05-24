import { useState, useEffect } from 'react';
import { X, Swords, ChevronRight, Clock, Shield, Zap, Target } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';

interface Combatant {
  actorId: string;
  actorType: string;
  actorName: string;
  dex: number;
  hp: number;
  maxHp: number;
  userId?: string;
}

interface CombatAction {
  id: string;
  actorId: string;
  actorType: string;
  actionType: string;
  targetId?: string;
  description?: string;
  result: string;
  createdAt: string;
}

interface CombatRound {
  id: string;
  roundNum: number;
  actions: CombatAction[];
}

interface CombatData {
  id: string;
  status: string;
  roundCount: number;
  initiative: Combatant[];
  currentRound?: CombatRound;
  currentRoundNum?: number;
}

interface CombatTimelineProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  isKP: boolean;
  userId?: string;
}

const ACTION_ICONS: Record<string, typeof Swords> = {
  attack: Swords,
  dodge: Shield,
  spell: Zap,
  item: Target,
  move: ChevronRight,
  end: Clock,
};

const ACTION_COLORS: Record<string, string> = {
  attack: 'text-coc-blood',
  dodge: 'text-coc-ether',
  spell: 'text-purple-300',
  item: 'text-coc-gold',
  move: 'text-coc-text-muted',
  end: 'text-coc-text-muted',
};

export function CombatTimeline({ roomId, isOpen, onClose, isKP, userId }: CombatTimelineProps) {
  const [combat, setCombat] = useState<CombatData | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!isOpen || !roomId) return;
    loadCombat();
    const interval = setInterval(loadCombat, 3000);
    return () => clearInterval(interval);
  }, [isOpen, roomId]);

  async function loadCombat() {
    try {
      const res = await apiFetch(`/api/rooms/${roomId}/combat/current`);
      const json = await res.json();
      if (json.success) {
        setCombat(json.data.combat);
      }
    } catch (err) {
      console.error('加载战斗失败:', err);
    }
  }

  async function handleAction(actionType: string, data?: any) {
    if (!combat) return;
    setActionError('');
    try {
      const res = await apiFetch(`/api/rooms/${roomId}/combat/${combat.id}/action`, {
        method: 'POST',
        body: JSON.stringify({ actionType, ...data }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message || '行动失败');
      }
      await loadCombat();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '行动失败');
    }
  }

  async function handleNextTurn() {
    if (!combat) return;
    try {
      await apiFetch(`/api/rooms/${roomId}/combat/${combat.id}/next-turn`, { method: 'POST' });
      await loadCombat();
    } catch (err) {
      console.error('推进回合失败:', err);
    }
  }

  async function handleEndCombat() {
    if (!combat || !isKP) return;
    if (!confirm('确定要结束战斗吗？')) return;
    try {
      await apiFetch(`/api/rooms/${roomId}/combat/${combat.id}/end`, { method: 'POST' });
      setCombat(null);
    } catch (err) {
      console.error('结束战斗失败:', err);
    }
  }

  if (!isOpen) return null;

  const hasCombat = combat && combat.status === 'active';

  return (
    <div className="w-full bg-coc-bg-elevated border-t border-[#3a3a3a]/40 flex flex-col max-h-[40vh]"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#3a3a3a]/30"
      >
        <div className="flex items-center gap-2 text-sm text-[#e8d4a0]"
        >
          <Swords size={14} className={hasCombat ? 'text-coc-blood' : 'text-coc-text-muted'} />
          <span className="font-ritual"
          >
            {hasCombat ? `战斗 · 回合 ${combat.currentRoundNum || combat.roundCount}` : '战斗面板'}
          </span
          >
        </div
        >
        <div className="flex items-center gap-2"
        >
          {hasCombat && isKP && (
            <button
              onClick={handleEndCombat}
              className="text-[11px] text-[#a63848] hover:text-coc-blood/80 transition-colors"
            >
              结束战斗
            </button
            >
          )}
          <button onClick={onClose} className="p-1 text-[#6b6558] hover:text-[#e8d4a0] transition-colors"
          >
            <X size={16} />
          </button
          >
        </div
        >
      </div
      >

      {!hasCombat ? (
        <div className="flex-1 flex items-center justify-center py-8"
        >
          <EmptyState
            icon={EmptyIcons.Investigator}
            title="暂无战斗"
            description={isKP ? 'KP 可以发起战斗' : '等待 KP 发起战斗'}
            size="sm"
            animate={false}
          />
        </div
        >
      ) : (
        <div className="flex flex-1 min-h-0"
        >
          {/* 行动顺序 */}
          <div className="w-[160px] border-r border-[#3a3a3a]/20 overflow-y-auto p-3 space-y-2"
          >
            <div className="text-[10px] text-[#6b6558] uppercase tracking-wider mb-2"
            >行动顺序 (DEX)
            </div
            >
            {combat.initiative.map((c, i) => {
              const isCurrent = i === (combat.currentRound?.actions.length || 0) % combat.initiative.length;
              return (
                <div
                  key={c.actorId}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                    isCurrent
                      ? 'bg-coc-gold/10 border border-coc-gold/20 text-coc-gold'
                      : 'text-coc-text-muted'
                  } ${c.hp <= 0 ? 'opacity-40 line-through' : ''}`}
                >
                  <span className="text-[10px] w-4 text-center"
                  >{i + 1}
                  </span
                  >
                  <span className="truncate flex-1"
                  >{c.actorName}
                  </span
                  >
                  <span className="text-[10px]"
                  >{c.hp}/{c.maxHp}
                  </span
                  >
                </div
                >
              );
            })}
          </div
          >

          {/* 行动记录 + 操作 */}
          <div className="flex-1 flex flex-col min-h-0"
          >
            {/* 当前行动者 */}
            <div className="px-4 py-2 border-b border-[#3a3a3a]/20 flex items-center gap-3"
            >
              {(() => {
                const idx = (combat.currentRound?.actions.length || 0) % combat.initiative.length;
                const actor = combat.initiative[idx];
                if (!actor) return null;
                const isMyTurn = actor.userId === userId;
                return (
                  <>
                    <span className="text-xs text-[#6b6558]"
                    >当前行动者:
                    </span
                    >
                    <span className={`text-sm font-ritual ${isMyTurn ? 'text-coc-gold' : 'text-coc-parchment'}`}
                    >
                      {actor.actorName} {isMyTurn && '(你)'}
                    </span
                    >
                    {isMyTurn && (
                      <div className="ml-auto flex items-center gap-1"
                      >
                        <button
                          onClick={() => handleAction('end')}
                          className="px-2 py-0.5 text-[10px] border border-[#3a3a3a]/30 rounded hover:border-coc-gold/30 transition-colors"
                        >
                          跳过
                        </button
                        >
                        <button
                          onClick={() => handleAction('attack', { targetId: '' })}
                          className="px-2 py-0.5 text-[10px] bg-coc-blood/20 text-[#a63848] rounded hover:bg-coc-blood/30 transition-colors"
                        >
                          攻击
                        </button
                        >
                        <button
                          onClick={handleNextTurn}
                          className="px-2 py-0.5 text-[10px] bg-coc-gold/20 text-[#c9a227] rounded hover:bg-coc-gold/30 transition-colors"
                        >
                          结束回合
                        </button
                        >
                      </div
                      >
                    )}
                    {!isMyTurn && isKP && (
                      <button
                        onClick={handleNextTurn}
                        className="ml-auto px-2 py-0.5 text-[10px] border border-coc-gold/20 text-[#c9a227] rounded hover:bg-coc-gold/5 transition-colors"
                      >
                        KP推进
                      </button
                      >
                    )}
                  </>
                );
              })()}
            </div
            >

            {actionError && (
              <div className="px-4 py-1 text-[11px] text-[#a63848] bg-coc-blood/5"
              >{actionError}
              </div
              >
            )}

            {/* 行动记录 */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 min-h-0"
            >
              {combat.currentRound?.actions.length === 0 && (
                <div className="text-center text-xs text-[#6b6558] py-4 italic"
                >回合刚开始，尚无行动记录
                </div
                >
              )}
              {combat.currentRound?.actions.map((action) => {
                const Icon = ACTION_ICONS[action.actionType] || ChevronRight;
                const color = ACTION_COLORS[action.actionType] || 'text-coc-text-muted';
                const actor = combat.initiative.find(c => c.actorId === action.actorId);
                const result = (() => {
                  try { return JSON.parse(action.result); } catch { return {}; }
                })();

                return (
                  <div
                    key={action.id}
                    className="flex items-start gap-2 px-2 py-1.5 rounded bg-coc-bg/40 text-[11px]"
                  >
                    <Icon size={12} className={`mt-0.5 flex-shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0"
                    >
                      <span className="text-[#e8d4a0]"
                      >{actor?.actorName || '?'}
                      </span
                      >
                      <span className="text-[#6b6558]"
                      > {action.description || action.actionType}
                      </span
                      >
                      {result.hitSuccess !== undefined && (
                        <span className={result.hitSuccess ? 'text-green-400' : 'text-coc-blood'}
                        >
                          {' '}命中: {result.hitLevel}
                        </span
                        >
                      )}
                      {result.finalDamage !== undefined && result.finalDamage > 0 && (
                        <span className="text-coc-blood"
                        >{' '}-{result.finalDamage}HP
                        </span
                        >
                      )}
                      {result.skipped && (
                        <span className="text-[#6b6558]"
                        > 跳过回合
                        </span
                        >
                      )}
                    </div
                    >
                  </div
                  >
                );
              })}
            </div
            >
          </div
          >
        </div
        >
      )}
    </div
    >
  );
}
