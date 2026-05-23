import { useState, useEffect } from 'react';
import { X, User, MessageCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';

interface Npc {
  id: string;
  name: string;
  avatarUrl?: string;
  description?: string;
  isActive: boolean;
  isActiveInScene: boolean;
  sceneId?: string | null;
  dynamicStats?: string;
}

interface NpcFocusPanelProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  currentSceneId?: string | null;
  isKP: boolean;
}

export function NpcFocusPanel({ roomId, isOpen, onClose, currentSceneId }: NpcFocusPanelProps) {
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [selectedNpc, setSelectedNpc] = useState<Npc | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !roomId) return;
    loadNpcs();
  }, [isOpen, roomId, currentSceneId]);

  async function loadNpcs() {
    setLoading(true);
    try {
      const query = currentSceneId ? `?sceneId=${currentSceneId}` : '';
      const res = await apiFetch(`/api/rooms/${roomId}/npcs${query}`);
      const json = await res.json();
      if (json.success) {
        const list = (json.data.npcs || []) as Npc[];
        // 优先显示当前场景活跃的NPC
        const sorted = list.sort((a, b) => {
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return 0;
        });
        setNpcs(sorted);
        if (sorted.length > 0 && !selectedNpc) {
          setSelectedNpc(sorted[0]);
        }
      }
    } catch (err) {
      console.error('加载NPC失败:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="w-[320px] bg-coc-bg border-l border-coc-border flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-coc-border/30">
        <div className="flex items-center gap-2 text-sm text-coc-parchment">
          <User size={14} />
          <span className="font-ritual">焦点 NPC</span>
        </div>
        <button onClick={onClose} className="p-1 text-coc-text-muted hover:text-coc-parchment transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* NPC 列表 */}
        <div className="w-[110px] border-r border-coc-border/20 overflow-y-auto">
          {npcs.length === 0 && !loading && (
            <div className="p-3">
              <EmptyState icon={EmptyIcons.Investigator} title="暂无NPC" size="sm" animate={false} />
            </div>
          )}
          {npcs.map(npc => (
            <button
              key={npc.id}
              onClick={() => setSelectedNpc(npc)}
              className={`w-full px-2 py-2 text-left text-xs transition-colors border-b border-coc-border/10 ${
                selectedNpc?.id === npc.id
                  ? 'bg-coc-gold/10 text-coc-gold'
                  : 'text-coc-text-muted hover:text-coc-parchment hover:bg-coc-bg-elevated/30'
              } ${!npc.isActive ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                {npc.avatarUrl ? (
                  <img src={npc.avatarUrl} alt={npc.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-coc-bg-elevated flex items-center justify-center flex-shrink-0">
                    <User size={10} className="text-coc-text-muted" />
                  </div>
                )}
                <span className="truncate">{npc.name}</span>
              </div>
              {npc.sceneId && currentSceneId && npc.sceneId === currentSceneId && (
                <span className="text-[9px] text-coc-gold/50">当前场景</span>
              )}
            </button>
          ))}
        </div>

        {/* NPC 详情 */}
        <div className="flex-1 overflow-y-auto p-3">
          {selectedNpc ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {selectedNpc.avatarUrl ? (
                  <img src={selectedNpc.avatarUrl} alt={selectedNpc.name} className="w-12 h-12 rounded-full object-cover border border-coc-gold/20" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-coc-bg-elevated border border-coc-border/30 flex items-center justify-center">
                    <User size={20} className="text-coc-text-muted" />
                  </div>
                )}
                <div>
                  <div className="font-ritual text-sm text-coc-parchment">{selectedNpc.name}</div>
                  <div className="text-[10px] text-coc-text-muted">
                    {selectedNpc.isActive ? (
                      <span className="text-green-400/60">● 在场</span>
                    ) : (
                      <span className="text-coc-text-muted">○ 离场</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedNpc.description && (
                <div className="text-xs text-coc-text leading-relaxed bg-coc-bg-elevated/20 p-2 rounded">
                  {selectedNpc.description}
                </div>
              )}

              {selectedNpc.dynamicStats && selectedNpc.dynamicStats !== '{}' && (
                <div className="space-y-1">
                  <div className="text-[10px] text-coc-text-muted uppercase tracking-wider">状态</div>
                  <div className="text-xs text-coc-text">
                    {(() => {
                      try {
                        const stats = JSON.parse(selectedNpc.dynamicStats);
                        return Object.entries(stats).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="text-coc-text-muted">{k}</span>
                            <span className="text-coc-parchment">{String(v)}</span>
                          </div>
                        ));
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* PL 向 NPC 提问按钮 */}
              <button className="w-full py-1.5 text-xs text-coc-gold border border-coc-gold/20 rounded hover:bg-coc-gold/5 transition-colors flex items-center justify-center gap-1">
                <MessageCircle size={12} />
                向 {selectedNpc.name} 提问
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs text-coc-text-muted">选择一位 NPC</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
