import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Heart,
  Brain,
  Sparkles,
  Activity,
  Ghost,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Loader2,
  MessageCircle,
  Dices,
  Package,
} from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { useSoloStore, SoloSessionData, SoloEdge } from '@stores/solo.store';
import { AiSceneImage } from '@components/solo/AiSceneImage';
import { StoryDialogBox } from '@components/solo/StoryDialogBox';
import { InventoryPanel } from '@components/solo/InventoryPanel';
import { CorruptionOverlay } from '@components/solo/CorruptionOverlay';

// 世界切换过渡特效层
function WorldTransitionOverlay({ show, world, onDone }: { show: boolean; world: string; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        onDone();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [show, onDone]);

  if (!visible && !show) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${world === 'corrupted' ? 'bg-violet-900/90' : 'bg-slate-900/90'}`}
    >
      <div className="text-center space-y-4">
        <Ghost className={`w-12 h-12 mx-auto animate-pulse ${world === 'corrupted' ? 'text-violet-300' : 'text-slate-300'}`} />
        <p className="text-lg font-medium tracking-widest">
          {world === 'corrupted' ? '认知正在溶解...' : '现实重新锚定...'}
        </p>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function SoloPlayerPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    session,
    setSession,
    isLoading,
    setLoading,
    setError,
    worldTransitioning,
    setWorldTransitioning,
  } = useSoloStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [unlockingClue, setUnlockingClue] = useState<string | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [npcTalking, setNpcTalking] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const prevWorldRef = useRef<string | null>(null);

  // 加载或刷新当前节点
  const fetchSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    setAiText(null);
    setAiLoading(true);
    try {
      const res = await apiFetch(`/scenarios/solo/session/${sessionId}`);
      const data = await handleApiResponse<SoloSessionData>(res);
      if (prevWorldRef.current && prevWorldRef.current !== data.globalState.currentWorld) {
        setWorldTransitioning(true);
      }
      prevWorldRef.current = data.globalState.currentWorld;
      setSession(data);
      if (data.aiText) {
        setAiText(data.aiText);
        setAiLoading(false);
      }
    } catch (e: any) {
      setError(e.message || '加载失败');
      setAiLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // 获取 AI 旁白（缓存未命中时触发生成）
  const fetchAiNarration = async () => {
    if (!sessionId) return;
    setAiLoading(true);
    try {
      const res = await apiFetch(`/scenarios/solo/session/${sessionId}/ai-narration`);
      const data = await handleApiResponse<{ aiText: string; fromCache: boolean }>(res);
      setAiText(data.aiText);
    } catch (e: any) {
      console.error('AI narration failed:', e);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // 缓存未命中时，会话加载完成后自动请求 AI 旁白
  useEffect(() => {
    if (session && !session.aiText && !aiLoading) {
      fetchAiNarration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.node.id, session?.node.worldState]);

  const bgClass =
    session?.globalState.currentWorld === 'corrupted'
      ? 'bg-gradient-to-b from-violet-950 to-slate-900'
      : 'bg-gradient-to-b from-slate-900 to-slate-950';

  const handleAdvance = async (edge: SoloEdge) => {
    if (!sessionId || advancing) return;
    setAdvancing(true);
    try {
      const res = await apiFetch(`/scenarios/solo/session/${sessionId}/advance`, {
        method: 'POST',
        body: JSON.stringify({ edgeId: edge.id }),
      });
      await handleApiResponse<{ newNodeId: string; newWorldState: string; isFirstVisit: boolean }>(res);
      await fetchSession();
    } catch (e: any) {
      alert(e.message || '推进失败');
    } finally {
      setAdvancing(false);
    }
  };

  const handleBacktrack = async (nodeId: string, worldState: string) => {
    if (!sessionId) return;
    try {
      await apiFetch(`/scenarios/solo/session/${sessionId}/backtrack`, {
        method: 'POST',
        body: JSON.stringify({ targetNodeId: nodeId, targetWorldState: worldState }),
      }).then(handleApiResponse);
      await fetchSession();
      setDrawerOpen(false);
    } catch (e: any) {
      alert(e.message || '回溯失败');
    }
  };

  const handleUnlockClue = async (clue: string) => {
    if (!sessionId || unlockingClue) return;
    setUnlockingClue(clue);
    try {
      await apiFetch(`/scenarios/solo/session/${sessionId}/unlock-clue`, {
        method: 'POST',
        body: JSON.stringify({ clue }),
      }).then(handleApiResponse);
      await fetchSession();
    } catch (e: any) {
      alert(e.message || '记录线索失败');
    } finally {
      setUnlockingClue(null);
    }
  };

  const handleNpcTalk = async (npcIndex: number, playerChoice: string) => {
    if (!sessionId || npcTalking) return;
    setNpcTalking(true);
    try {
      const res = await apiFetch(`/scenarios/solo/session/${sessionId}/npc-talk`, {
        method: 'POST',
        body: JSON.stringify({ npcIndex, playerChoice }),
      });
      await handleApiResponse<any>(res);
      await fetchSession();
    } catch (e: any) {
      alert(e.message || '对话失败');
    } finally {
      setNpcTalking(false);
    }
  };

  const handleUseItem = async (itemKey: string) => {
    if (!sessionId) return;
    try {
      const res = await apiFetch(`/scenarios/solo/session/${sessionId}/use-item`, {
        method: 'POST',
        body: JSON.stringify({ itemKey }),
      });
      await handleApiResponse(res);
      await fetchSession();
    } catch (e: any) {
      alert(e.message || '使用失败');
    }
  };

  const runtime = session?.characterRuntime || {};
  const hp = runtime.hp ?? '?';
  const maxHp = runtime.maxHp ?? '?';
  const san = runtime.san ?? '?';
  const maxSan = runtime.maxSan ?? '?';
  const mp = runtime.mp ?? '?';
  const maxMp = runtime.maxMp ?? '?';
  const corruption = session?.globalState.corruption ?? 0;
  const currentWorld = session?.globalState.currentWorld ?? 'normal';

  const npcs = session?.node.metadata?.npcs || [];
  const npcHistory = session?.globalState.npcTalkHistory || [];

  const inventoryItems = session?.inventory.map((key) => {
    if (key === 'sedative') return { key, name: '镇定剂', type: 'consumable' as const, description: '注射后短暂恢复理智，降低侵蚀值。' };
    if (key === 'broken_pocket_watch') return { key, name: '破损的怀表', type: 'key_item' as const, description: '指针停滞的旧怀表，蕴含微弱的意志豁免力量。' };
    return { key, name: key, type: 'key_item' as const, description: '' };
  }) || [];

  return (
    <div className={`min-h-screen text-slate-100 transition-colors duration-700 ${bgClass} relative overflow-x-hidden`}>
      <CorruptionOverlay corruption={corruption} />
      <WorldTransitionOverlay
        show={worldTransitioning}
        world={currentWorld}
        onDone={() => setWorldTransitioning(false)}
      />

      {/* 顶部状态条 */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/solo')}
              className="p-2 rounded-lg hover:bg-white/10"
              title="返回"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-sm font-semibold">{session?.scenario.title || '...'}</div>
              <div className="text-xs text-slate-400">{session?.node.title}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/15 text-red-300">
              <Heart className="w-3.5 h-3.5" /> {hp}/{maxHp}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/15 text-blue-300">
              <Brain className="w-3.5 h-3.5" /> {san}/{maxSan}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/15 text-purple-300">
              <Sparkles className="w-3.5 h-3.5" /> {mp}/{maxMp}
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded ${
                corruption >= 50 ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-500/15 text-slate-300'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> 侵蚀 {corruption}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 — 视觉小说风格 */}
      <main className="max-w-3xl mx-auto px-4 pb-28 space-y-4">
        {isLoading && !session && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}

        {session && (
          <>
            {/* 场景氛围图 */}
            <div className="pt-4">
              <AiSceneImage
                src={session.sceneImageUrl}
                fallbackPrompt={session.node.metadata?.stageDirection || '场景氛围渲染中...'}
              />
            </div>

            {/* 世界观标签 */}
            <div className="text-xs uppercase tracking-wider text-slate-500 px-1">
              {session.node.type === 'ENDING'
                ? '结局'
                : currentWorld === 'corrupted'
                ? '侵蚀视界'
                : '现实'}
            </div>

            {/* CHECK 节点检定结果（紧凑卡片） */}
            {session.globalState.lastCheckResult && (
              <div
                className={`rounded-lg border p-3 ${
                  session.globalState.lastCheckResult.isSuccess
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-rose-500/30 bg-rose-500/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Dices className="w-4 h-4 text-slate-300" />
                  <span className="text-sm font-medium text-slate-200">
                    {session.globalState.lastCheckResult.skill} · {session.globalState.lastCheckResult.successLevel}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  出目 {session.globalState.lastCheckResult.rolledValue} /
                  {session.globalState.lastCheckResult.isSuccess ? ' 成功' : ' 失败'}
                </div>
              </div>
            )}

            {/* NPC 对话面板（紧凑模式） */}
            {npcs.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
                  <MessageCircle className="w-3.5 h-3.5" />
                  对话
                </div>
                {npcs.map((npc, npcIndex) => {
                  const historyForNpc = npcHistory.filter((h) => h.npcName === npc.name);
                  const dialogueRounds = npc.dialogueRounds || [];
                  const currentRoundIndex = historyForNpc.length;
                  const isDone = currentRoundIndex >= dialogueRounds.length;

                  return (
                    <div key={npcIndex} className="space-y-2">
                      <div className="font-medium text-slate-200">{npc.name}</div>
                      {npc.mood && <div className="text-xs text-slate-500">状态：{npc.mood}</div>}

                      {historyForNpc.length > 0 && (
                        <div className="space-y-2 my-2">
                          {historyForNpc.map((h, idx) => (
                            <div key={idx} className="text-sm space-y-1">
                              <div className="text-amber-300/90">你：{h.playerChoice}</div>
                              <div className="text-slate-300 pl-3 border-l-2 border-slate-600">
                                {npc.name}：{h.npcReply}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!isDone ? (
                        <div className="grid gap-2 pt-1">
                          {dialogueRounds[currentRoundIndex].playerOptions.map((opt, optIdx) => (
                            <button
                              key={optIdx}
                              disabled={npcTalking}
                              onClick={() => handleNpcTalk(npcIndex, opt)}
                              className="text-left px-3 py-2 rounded-md text-sm bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-50"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 pt-1">
                          {historyForNpc.length > 0 ? '对话结束。' : npc.profile || npc.dialogueHint || '无言以对。'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 叙事对话框 */}
            <StoryDialogBox
              text={aiText || session.node.content}
              speaker={
                session.node.type === 'ENDING'
                  ? '— 剧终 —'
                  : undefined
              }
              subText={
                session.node.type === 'ENDING'
                  ? '画框之内，故事已至终章。'
                  : session.globalState.lastCheckResult
                  ? (session.globalState.lastCheckResult.isSuccess
                      ? '检定成功，某种真相被揭开。'
                      : '检定失败，认知的裂隙加深。')
                  : undefined
              }
            />

            {/* 线索解锁 */}
            {session.node.metadata?.clues && session.node.metadata.clues.length > 0 && (
              <div className="space-y-2">
                {session.node.metadata.clues.map((c, i) => {
                  const unlocked = session.globalState.unlockedClues.includes(c);
                  return (
                    <button
                      key={i}
                      disabled={unlockingClue === c || unlocked}
                      onClick={() => handleUnlockClue(c)}
                      className={`w-full text-left flex items-start gap-2 text-sm rounded-lg px-3 py-2 transition border ${
                        unlocked
                          ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                          : 'text-amber-300 bg-white/5 border-white/10 hover:bg-white/10'
                      } disabled:cursor-default`}
                    >
                      <span>{unlocked ? '✓' : '🔍'}</span>
                      <span className={unlocked ? 'line-through opacity-80' : ''}>{c}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 操作按钮区 */}
            <div className="space-y-2 pt-2">
              {session.node.type !== 'ENDING' && session.edges.length === 0 && session.node.type !== 'CHECK' && (
                <div className="text-center text-sm text-slate-500 py-4">
                  当前没有可用的行动选项。
                </div>
              )}

              {session.node.type !== 'ENDING' && session.edges.map((edge) => (
                <button
                  key={edge.id}
                  disabled={advancing}
                  onClick={() => handleAdvance(edge)}
                  className="w-full text-left px-5 py-3.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-500/40 transition disabled:opacity-50"
                >
                  <div className="font-medium">{edge.label}</div>
                  {edge.type === 'CONDITIONAL' && edge.conditions?.expression && (
                    <div className="text-xs text-slate-500 mt-1">条件：{edge.conditions.expression}</div>
                  )}
                </button>
              ))}

              {session.node.type === 'ENDING' && (
                <div className="text-center py-4">
                  <div className="text-2xl font-bold text-amber-500 mb-4">剧终</div>
                  <button
                    onClick={() => navigate('/solo')}
                    className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                  >
                    返回首页
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* 物品栏悬浮按钮 */}
      <button
        onClick={() => setInventoryOpen(true)}
        className="fixed right-4 top-20 z-30 p-2.5 rounded-full bg-black/40 border border-white/10 hover:bg-white/10 backdrop-blur transition"
        title="物品栏"
      >
        <Package className="w-5 h-5 text-slate-200" />
        {inventoryItems.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-amber-500 text-[10px] font-bold text-black flex items-center justify-center">
            {inventoryItems.length}
          </span>
        )}
      </button>

      <InventoryPanel
        open={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        items={inventoryItems}
        onUse={handleUseItem}
      />

      {/* 底部地点抽屉开关 */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <button
          onClick={() => setDrawerOpen((v) => !v)}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs bg-black/40 hover:bg-black/50 border-t border-white/10 backdrop-blur"
        >
          {drawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          已访问地点
        </button>

        {drawerOpen && (
          <div className="max-h-56 overflow-auto bg-black/70 backdrop-blur border-t border-white/10 px-4 py-3">
            <div className="max-w-3xl mx-auto space-y-2">
              {session?.visitedNodes.length === 0 && (
                <div className="text-sm text-slate-500">尚无访问记录</div>
              )}
              {session?.visitedNodes.map((v, idx) => {
                const isCurrent =
                  v.nodeId === session.node.id && v.worldState === session.node.worldState;
                return (
                  <button
                    key={`${v.nodeId}-${v.worldState}-${idx}`}
                    onClick={() => handleBacktrack(v.nodeId, v.worldState)}
                    disabled={isCurrent}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm border transition ${
                      isCurrent
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      {v.nodeId}
                      <span className="text-xs text-slate-500">({v.worldState})</span>
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(v.visitedAt)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
