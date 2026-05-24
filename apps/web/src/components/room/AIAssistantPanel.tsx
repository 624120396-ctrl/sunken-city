import { useState } from 'react';
import { X, Sparkles, MessageSquare, Swords, BookOpen, Search, Wand2, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface AIAssistantPanelProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

type AITool = 'scene' | 'npc' | 'combat' | 'log' | 'clue' | 'report';

interface ToolConfig {
  id: AITool;
  label: string;
  icon: typeof Sparkles;
  model: string;
  description: string;
}

const TOOLS: ToolConfig[] = [
  { id: 'scene', label: '场景生成', icon: Sparkles, model: 'Seed-Char', description: '输入关键词生成克苏鲁风格场景描述' },
  { id: 'npc', label: 'NPC 对话', icon: MessageSquare, model: 'Seed-Char', description: '让 AI 扮演 NPC 回复玩家提问' },
  { id: 'combat', label: '战斗结算', icon: Swords, model: 'Kimi-K2.6', description: '输入行动和状态，AI 按规则计算结果' },
  { id: 'log', label: 'Log 润色', icon: BookOpen, model: 'Kimi-K2.6', description: '为跑团 Log 填补叙事空白' },
  { id: 'clue', label: '线索分析', icon: Search, model: 'Kimi-K2.6', description: '分析已揭示线索的关联性' },
  { id: 'report', label: '战后报告', icon: Wand2, model: 'Kimi-K2.6', description: '基于战斗记录生成结构化战报' },
];

export function AIAssistantPanel({ roomId, isOpen, onClose }: AIAssistantPanelProps) {
  const [activeTool, setActiveTool] = useState<AITool>('scene');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // 场景生成表单
  const [sceneKeywords, setSceneKeywords] = useState('');
  const [sceneAtmosphere, setSceneAtmosphere] = useState('normal');

  // NPC 对话表单
  const [npcName, setNpcName] = useState('');
  const [npcDesc, setNpcDesc] = useState('');
  const [npcQuestion, setNpcQuestion] = useState('');

  // 战斗结算表单
  const [combatAction, setCombatAction] = useState('');
  const [combatActor, setCombatActor] = useState('');
  const [combatTarget, setCombatTarget] = useState('');

  async function callAI(tool: AITool) {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      let endpoint = '';
      let body: any = {};

      switch (tool) {
        case 'scene':
          endpoint = `/api/rooms/${roomId}/ai/scene-desc`;
          body = {
            keywords: sceneKeywords.split(/[,，]/).map(s => s.trim()).filter(Boolean),
            atmosphere: sceneAtmosphere,
          };
          break;
        case 'npc':
          endpoint = `/api/rooms/${roomId}/ai/npc-dialogue`;
          body = {
            npcName,
            npcDescription: npcDesc,
            playerQuestion: npcQuestion,
          };
          break;
        case 'combat':
          endpoint = `/api/rooms/${roomId}/ai/combat-resolve`;
          body = {
            action: { type: 'attack', skillName: '格斗', skillValue: 50, weaponDamage: '1D6' },
            actorState: { name: combatActor || '行动者', hp: 10, maxHp: 10, dex: 50 },
            targetState: { name: combatTarget || '目标', hp: 10, maxHp: 10, dex: 50, armor: '0' },
          };
          break;
        case 'log':
          endpoint = `/api/rooms/${roomId}/ai/log-polish`;
          body = { style: 'suspense' };
          break;
        case 'clue':
          endpoint = `/api/rooms/${roomId}/ai/clue-analysis`;
          body = {};
          break;
        case 'report':
          endpoint = `/api/rooms/${roomId}/ai/combat-report`;
          body = {};
          break;
      }

      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
      } else {
        setError(json.error?.message || '请求失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const activeConfig = TOOLS.find(t => t.id === activeTool)!;

  return (
    <div className="w-[380px] backdrop-blur-md bg-black/40 border-l border-[#3a3a3a]/40 flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#3a3a3a]/30">
        <div className="flex items-center gap-2 text-sm text-[#e8d4a0]">
          <Sparkles size={14} className="text-coc-gold" />
          <span className="font-ritual">AI 助手</span>
        </div>
        <button onClick={onClose} className="p-1 text-[#6b6558] hover:text-[#e8d4a0] transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* 工具选择 */}
      <div className="flex border-b border-[#3a3a3a]/20 overflow-x-auto">
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => { setActiveTool(tool.id); setResult(null); setError(''); }}
            className={`flex-shrink-0 px-3 py-2 text-[10px] text-center transition-colors whitespace-nowrap ${
              activeTool === tool.id
                ? 'text-[#c9a227] border-b border-coc-gold'
                : 'text-[#6b6558] hover:text-[#e8d4a0]'
            }`}
          >
            <tool.icon size={10} className="inline mr-1" />
            {tool.label}
            <span className={`ml-1 text-[8px] px-1 py-0.5 rounded ${
              tool.model === 'Seed-Char' ? 'bg-purple-500/20 text-purple-300' : 'bg-cyan-500/20 text-cyan-300'
            }`}>
              {tool.model}
            </span>
          </button>
        ))}
      </div>

      {/* 工具描述 */}
      <div className="px-3 py-1.5 text-[10px] text-[#6b6558] border-b border-[#3a3a3a]/10">
        {activeConfig.description}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0 space-y-3">
        {/* 场景生成 */}
        {activeTool === 'scene' && (
          <div className="space-y-2">
            <input
              value={sceneKeywords}
              onChange={e => setSceneKeywords(e.target.value)}
              placeholder="关键词，如：地下墓穴、潮湿、腐臭..."
              className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-xs text-[#e8d4a0] placeholder:text-[#6b6558] focus:border-coc-gold focus:outline-none"
            />
            <select
              value={sceneAtmosphere}
              onChange={e => setSceneAtmosphere(e.target.value)}
              className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-xs text-[#e8d4a0]"
            >
              <option value="normal">正常</option>
              <option value="dark">黑暗</option>
              <option value="horror">恐怖</option>
              <option value="mystery">神秘</option>
            </select>
            <button
              onClick={() => callAI('scene')}
              disabled={loading || !sceneKeywords.trim()}
              className="w-full py-1.5 text-xs bg-coc-gold/10 text-[#c9a227] border border-coc-gold/20 rounded hover:bg-coc-gold/20 disabled:opacity-30 transition-colors flex items-center justify-center gap-1"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              生成场景描述
            </button>
          </div>
        )}

        {/* NPC 对话 */}
        {activeTool === 'npc' && (
          <div className="space-y-2">
            <input
              value={npcName}
              onChange={e => setNpcName(e.target.value)}
              placeholder="NPC 名称"
              className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-xs text-[#e8d4a0] placeholder:text-[#6b6558] focus:border-coc-gold focus:outline-none"
            />
            <input
              value={npcDesc}
              onChange={e => setNpcDesc(e.target.value)}
              placeholder="NPC 描述（如：一位神秘的图书管理员）"
              className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-xs text-[#e8d4a0] placeholder:text-[#6b6558] focus:border-coc-gold focus:outline-none"
            />
            <input
              value={npcQuestion}
              onChange={e => setNpcQuestion(e.target.value)}
              placeholder="玩家提问"
              className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-xs text-[#e8d4a0] placeholder:text-[#6b6558] focus:border-coc-gold focus:outline-none"
            />
            <button
              onClick={() => callAI('npc')}
              disabled={loading || !npcName.trim() || !npcQuestion.trim()}
              className="w-full py-1.5 text-xs bg-coc-gold/10 text-[#c9a227] border border-coc-gold/20 rounded hover:bg-coc-gold/20 disabled:opacity-30 transition-colors flex items-center justify-center gap-1"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
              生成 NPC 回复
            </button>
          </div>
        )}

        {/* 战斗结算 */}
        {activeTool === 'combat' && (
          <div className="space-y-2">
            <input
              value={combatActor}
              onChange={e => setCombatActor(e.target.value)}
              placeholder="行动者名称"
              className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-xs text-[#e8d4a0] placeholder:text-[#6b6558] focus:border-coc-gold focus:outline-none"
            />
            <input
              value={combatTarget}
              onChange={e => setCombatTarget(e.target.value)}
              placeholder="目标名称"
              className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-xs text-[#e8d4a0] placeholder:text-[#6b6558] focus:border-coc-gold focus:outline-none"
            />
            <input
              value={combatAction}
              onChange={e => setCombatAction(e.target.value)}
              placeholder="行动描述（如：用棒球棍攻击深潜者）"
              className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-[#3a3a3a]/30 rounded text-xs text-[#e8d4a0] placeholder:text-[#6b6558] focus:border-coc-gold focus:outline-none"
            />
            <button
              onClick={() => callAI('combat')}
              disabled={loading}
              className="w-full py-1.5 text-xs bg-coc-blood/10 text-[#a63848] border border-coc-blood/20 rounded hover:bg-coc-blood/20 disabled:opacity-30 transition-colors flex items-center justify-center gap-1"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Swords size={12} />}
              AI 战斗结算
            </button>
          </div>
        )}

        {/* Log 润色 / 线索分析 / 战后报告（直接调用） */}
        {(activeTool === 'log' || activeTool === 'clue' || activeTool === 'report') && (
          <div className="space-y-2">
            <div className="text-[10px] text-[#6b6558]">
              {activeTool === 'log' && '基于当前房间 Log 记录，AI 自动填补叙事空白'}
              {activeTool === 'clue' && '基于已揭示线索和玩家行动，AI 分析关联性'}
              {activeTool === 'report' && '基于最近一次战斗记录，AI 生成结构化战报'}
            </div>
            <button
              onClick={() => callAI(activeTool)}
              disabled={loading}
              className="w-full py-1.5 text-xs bg-coc-gold/10 text-[#c9a227] border border-coc-gold/20 rounded hover:bg-coc-gold/20 disabled:opacity-30 transition-colors flex items-center justify-center gap-1"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              {activeTool === 'log' && '开始润色'}
              {activeTool === 'clue' && '开始分析'}
              {activeTool === 'report' && '生成战报'}
            </button>
          </div>
        )}

        {/* 错误 */}
        {error && (
          <div className="p-2 rounded bg-coc-blood/5 border border-coc-blood/10 text-[11px] text-coc-blood">
            {error}
          </div>
        )}

        {/* 结果 */}
        {result && (
          <div className="space-y-2">
            <div className="text-[10px] text-coc-gold/60 uppercase tracking-wider">AI 输出</div>
            <div className="p-2.5 rounded bg-coc-bg-elevated/20 border border-[#3a3a3a]/20 text-xs text-coc-text leading-relaxed whitespace-pre-wrap">
              {result.description || result.dialogue || JSON.stringify(result.result || result.report || result.analysis || result.narrations, null, 2)}
            </div>
            {(result.description || result.dialogue) && (
              <button
                onClick={() => {
                  const text = result.description || result.dialogue || '';
                  navigator.clipboard?.writeText(text);
                }}
                className="w-full py-1 text-[10px] text-[#6b6558] hover:text-[#e8d4a0] transition-colors"
              >
                复制到剪贴板
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
