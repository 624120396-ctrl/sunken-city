import { useState, useEffect } from 'react';
import { X, ScrollText, Filter, Clock } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface RoomEvent {
  id: string;
  eventType: string;
  payload: string;
  isSecret: boolean;
  createdAt: string;
  userId?: string;
}

interface RoomEventLogPanelProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  isKP: boolean;
}

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  DICE_ROLL: { label: '骰子', color: 'text-coc-gold' },
  CLUE_DISCOVERED: { label: '线索', color: 'text-coc-ether' },
  PHASE_CHANGE: { label: '阶段', color: 'text-coc-blood' },
  SCENE_CHANGE: { label: '场景', color: 'text-coc-parchment' },
  COMBAT_ACTION: { label: '战斗', color: 'text-red-400' },
  NPC_STATE_CHANGE: { label: 'NPC', color: 'text-purple-300' },
  MEMBER_JOIN: { label: '加入', color: 'text-green-400' },
  MEMBER_LEAVE: { label: '离开', color: 'text-gray-400' },
  STATUS_CHANGE: { label: '状态', color: 'text-orange-300' },
  SYSTEM_EVENT: { label: '系统', color: 'text-coc-text-muted' },
};

function formatEventPayload(event: RoomEvent): string {
  try {
    const data = JSON.parse(event.payload);
    switch (event.eventType) {
      case 'DICE_ROLL':
        return `${data.skill || '检定'}: ${data.result || event.payload}`;
      case 'CLUE_DISCOVERED':
        return `发现线索: ${data.clueTitle || '未知线索'}`;
      case 'PHASE_CHANGE':
        return `进入: ${data.phaseTitle || '新阶段'}`;
      case 'SCENE_CHANGE':
        return `切换至: ${data.sceneTitle || '新场景'}`;
      case 'COMBAT_ACTION':
        return `${data.actor || '?'} → ${data.action || '行动'}`;
      case 'MEMBER_JOIN':
        return `${data.nickname || '玩家'} 加入房间`;
      case 'MEMBER_LEAVE':
        return `${data.nickname || '玩家'} 离开房间`;
      default:
        return data.message || JSON.stringify(data).slice(0, 80);
    }
  } catch {
    return event.payload.slice(0, 100);
  }
}

export function RoomEventLogPanel({ roomId, isOpen, onClose, isKP }: RoomEventLogPanelProps) {
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !roomId) return;

    async function loadEvents() {
      setLoading(true);
      try {
        const query = filter ? `?eventType=${filter}` : '';
        const res = await apiFetch(`/api/rooms/${roomId}/events${query}`);
        const json = await res.json();
        if (json.success) {
          setEvents(json.data.events || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
    // 每 10 秒刷新
    const interval = setInterval(loadEvents, 10000);
    return () => clearInterval(interval);
  }, [isOpen, roomId, filter]);

  const eventTypes = Object.keys(EVENT_TYPE_LABELS);

  if (!isOpen) return null;

  return (
    <div className="w-[320px] bg-coc-bg border-l border-coc-border flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-coc-border/30">
        <div className="flex items-center gap-2 text-sm text-coc-parchment">
          <ScrollText size={14} />
          <span className="font-ritual">事件日志</span>
        </div>
        <button onClick={onClose} className="p-1 text-coc-text-muted hover:text-coc-parchment transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* 过滤 */}
      <div className="px-3 py-2 border-b border-coc-border/20 flex items-center gap-2 flex-wrap">
        <Filter size={12} className="text-coc-text-muted flex-shrink-0" />
        <button
          onClick={() => setFilter('')}
          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
            filter === '' ? 'bg-coc-gold/20 text-coc-gold' : 'text-coc-text-muted hover:text-coc-parchment'
          }`}
        >
          全部
        </button>
        {eventTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(filter === type ? '' : type)}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              filter === type
                ? 'bg-coc-gold/20 text-coc-gold'
                : 'text-coc-text-muted hover:text-coc-parchment'
            }`}
          >
            {EVENT_TYPE_LABELS[type]?.label || type}
          </button>
        ))}
      </div>

      {/* 事件列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-0">
        {loading && events.length === 0 && (
          <div className="text-center text-xs text-coc-text-muted py-8">加载中...</div>
        )}
        {error && (
          <div className="text-center text-xs text-coc-blood py-4">{error}</div>
        )}
        {!loading && events.length === 0 && (
          <div className="text-center text-xs text-coc-text-muted py-8 italic">
            暂无事件记录
          </div>
        )}
        {events.map((event) => {
          const meta = EVENT_TYPE_LABELS[event.eventType] || { label: event.eventType, color: 'text-coc-text-muted' };
          return (
            <div
              key={event.id}
              className={`px-2 py-1.5 rounded text-[11px] leading-relaxed ${
                event.isSecret ? 'bg-coc-blood/5 border border-coc-blood/10' : 'bg-coc-bg-elevated/40'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-[10px] font-medium ${meta.color}`}>{meta.label}</span>
                {event.isSecret && isKP && (
                  <span className="text-[9px] text-coc-blood/60">(密)</span>
                )}
                <span className="ml-auto text-[9px] text-coc-text-muted flex items-center gap-0.5">
                  <Clock size={8} />
                  {new Date(event.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-coc-text/80">{formatEventPayload(event)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
