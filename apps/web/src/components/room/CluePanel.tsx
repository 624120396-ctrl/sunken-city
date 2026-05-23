import { useState, useEffect } from 'react';
import { X, Search, Eye, Sparkles, Lock } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';

interface Clue {
  id: string;
  title: string;
  content?: string;
  imageUrl?: string;
  isHidden: boolean;
  discoverySkill?: string;
  discoveryThreshold?: number;
  autoReveal: boolean;
  discoveredByUserId?: string | null;
  discoveredAt?: string | null;
}

interface CluePanelProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  isKP: boolean;
  onReveal?: (clueId: string) => void;
}

export function CluePanel({ roomId, isOpen, onClose, isKP, onReveal }: CluePanelProps) {
  const [clues, setClues] = useState<Clue[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !roomId) return;
    loadClues();
  }, [isOpen, roomId]);

  async function loadClues() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/rooms/${roomId}/clues`);
      const json = await res.json();
      if (json.success) {
        setClues(json.data.clues || []);
      }
    } catch (err) {
      console.error('加载线索失败:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReveal(clueId: string) {
    try {
      const res = await apiFetch(`/api/rooms/${roomId}/clues/${clueId}/reveal`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setClues(prev =>
          prev.map(c => (c.id === clueId ? { ...c, isHidden: false, discoveredByUserId: 'me' } : c))
        );
        onReveal?.(clueId);
      }
    } catch (err) {
      console.error('揭示线索失败:', err);
    }
  }

  const filtered = clues.filter(
    c =>
      !filter ||
      c.title.toLowerCase().includes(filter.toLowerCase()) ||
      (c.content && c.content.toLowerCase().includes(filter.toLowerCase()))
  );

  const revealed = filtered.filter(c => !c.isHidden);
  const hidden = filtered.filter(c => c.isHidden);

  if (!isOpen) return null;

  return (
    <div className="w-[340px] bg-coc-bg border-l border-coc-border flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-coc-border/30">
        <div className="flex items-center gap-2 text-sm text-coc-parchment">
          <Search size={14} />
          <span className="font-ritual">线索看板</span>
          <span className="text-[10px] text-coc-text-muted">
            {revealed.length}/{clues.length}
          </span>
        </div>
        <button onClick={onClose} className="p-1 text-coc-text-muted hover:text-coc-parchment transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* 搜索 */}
      <div className="px-3 py-2">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="搜索线索..."
          className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-coc-border/30 rounded text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none"
        />
      </div>

      {/* 线索列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {loading && clues.length === 0 && (
          <div className="text-center text-xs text-coc-text-muted py-8">加载中...</div>
        )}
        {!loading && clues.length === 0 && (
          <EmptyState
            icon={EmptyIcons.Investigator}
            title="暂无线索"
            description="KP 尚未添加线索到本房间。"
            size="sm"
            animate={false}
          />
        )}

        {/* 已揭示线索 */}
        {revealed.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-coc-gold/60 uppercase tracking-wider font-medium">已揭示</div>
            {revealed.map(clue => (
              <ClueCard key={clue.id} clue={clue} isKP={isKP} expanded={expandedId === clue.id} onToggle={() => setExpandedId(expandedId === clue.id ? null : clue.id)} />
            ))}
          </div>
        )}

        {/* 未揭示线索（仅KP可见） */}
        {isKP && hidden.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-coc-text-muted uppercase tracking-wider font-medium">未揭示</div>
            {hidden.map(clue => (
              <div
                key={clue.id}
                className="relative p-3 rounded-lg bg-coc-bg-elevated/30 border border-coc-border/20 overflow-hidden group cursor-pointer"
                onClick={() => handleReveal(clue.id)}
              >
                {/* 模糊遮罩 */}
                <div className="absolute inset-0 bg-coc-bg/60 backdrop-blur-sm z-10 flex items-center justify-center gap-1.5">
                  <Lock size={14} className="text-coc-text-muted" />
                  <span className="text-xs text-coc-text-muted">{clue.title}</span>
                  {clue.autoReveal && clue.discoverySkill && (
                    <span className="text-[10px] text-coc-gold/60 ml-1 flex items-center gap-0.5">
                      <Sparkles size={9} />
                      {clue.discoverySkill} ≤ {clue.discoveryThreshold}
                    </span>
                  )}
                </div>
                {/* 底层内容 */}
                <div className="opacity-30">
                  <div className="font-ritual text-sm text-coc-parchment">{clue.title}</div>
                  <p className="text-xs text-coc-text-muted mt-1 line-clamp-2">{clue.content}</p>
                </div>
                {/* 悬停提示 */}
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-coc-gold bg-coc-bg/80 px-2 py-1 rounded">点击揭示</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClueCard({ clue, isKP, expanded, onToggle }: { clue: Clue; isKP: boolean; expanded: boolean; onToggle: () => void }) {
  return (
    <div
      className="p-3 rounded-lg bg-coc-bg-elevated/40 border border-coc-border/20 cursor-pointer hover:border-coc-gold/20 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <Eye size={12} className="text-coc-gold/60 flex-shrink-0" />
        <span className="font-ritual text-sm text-coc-parchment">{clue.title}</span>
        {clue.imageUrl && <span className="text-[10px] text-coc-ether/60">[图]</span>}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 animate-in fade-in duration-200">
          {clue.imageUrl && (
            <img src={clue.imageUrl} alt={clue.title} className="w-full rounded-lg max-h-40 object-cover" />
          )}
          <p className="text-xs text-coc-text leading-relaxed">{clue.content}</p>
          {isKP && clue.discoveredAt && (
            <div className="text-[10px] text-coc-text-muted">
              揭示于 {new Date(clue.discoveredAt).toLocaleString('zh-CN')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
