import { useState, useEffect } from 'react';
import { X, FileText, BookOpen, Download, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';

interface LogEvent {
  id: string;
  eventType: string;
  payload: string;
  characterId?: string | null;
  characterName?: string | null;
  userId: string;
  userNickname: string;
  sortOrder: number;
  timestamp: string;
}

interface LogAnnotation {
  id: string;
  fromEventId: string;
  toEventId?: string | null;
  type: string;
  content: string;
  authorId: string;
}

interface RoomLogPanelProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  isKP: boolean;
}

type Tab = 'realtime' | 'edit' | 'export';

const EVENT_TYPE_COLORS: Record<string, string> = {
  CHAT_TEXT: 'text-coc-parchment',
  DICE_ROLL: 'text-coc-gold',
  SCENE_CHANGE: 'text-coc-ether',
  COMBAT_ACTION: 'text-coc-blood',
  CLUE_REVEAL: 'text-coc-ether',
  NPC_DIALOGUE: 'text-purple-300',
  PHASE_CHANGE: 'text-coc-gold',
  SYSTEM_EVENT: 'text-coc-text-muted',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  CHAT_TEXT: '对话',
  DICE_ROLL: '骰子',
  SCENE_CHANGE: '场景',
  COMBAT_ACTION: '战斗',
  CLUE_REVEAL: '线索',
  NPC_DIALOGUE: 'NPC',
  PHASE_CHANGE: '阶段',
  SYSTEM_EVENT: '系统',
};

function parsePayload(payload: string): any {
  try { return JSON.parse(payload); } catch { return { raw: payload }; }
}

export function RoomLogPanel({ roomId, isOpen, onClose, isKP }: RoomLogPanelProps) {
  const [tab, setTab] = useState<Tab>('realtime');
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [annotations, setAnnotations] = useState<LogAnnotation[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [narrationText, setNarrationText] = useState('');
  const [exportFormat, setExportFormat] = useState<'markdown' | 'html' | 'json'>('markdown');
  const [exportResult, setExportResult] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !roomId) return;
    loadLog();
    const interval = setInterval(loadLog, 10000);
    return () => clearInterval(interval);
  }, [isOpen, roomId]);

  async function loadLog() {
    try {
      const [eventsRes, annsRes] = await Promise.all([
        apiFetch(`/api/rooms/${roomId}/log/events`),
        isKP ? apiFetch(`/api/rooms/${roomId}/log/annotations`) : Promise.resolve(null),
      ]);
      const eventsJson = await eventsRes.json();
      if (eventsJson.success) setEvents(eventsJson.data.events || []);
      if (annsRes) {
        const annsJson = await annsRes.json();
        if (annsJson.success) setAnnotations(annsJson.data.annotations || []);
      }
    } catch (err) {
      console.error('加载 Log 失败:', err);
    }
  }

  async function addNarration() {
    if (!narrationText.trim() || selectedEventIds.length === 0) return;
    try {
      await apiFetch(`/api/rooms/${roomId}/log/annotations`, {
        method: 'POST',
        body: JSON.stringify({
          fromEventId: selectedEventIds[0],
          toEventId: selectedEventIds[selectedEventIds.length - 1] || null,
          type: 'NARRATION',
          content: narrationText.trim(),
        }),
      });
      setNarrationText('');
      setSelectedEventIds([]);
      loadLog();
    } catch (err) {
      console.error('添加旁白失败:', err);
    }
  }

  async function handleExport() {
    try {
      const res = await apiFetch(`/api/rooms/${roomId}/log/export`, {
        method: 'POST',
        body: JSON.stringify({ format: exportFormat }),
      });
      const json = await res.json();
      if (json.success) {
        setExportResult(json.data);
        // 触发下载
        const blob = new Blob(
          [json.data.content || ''],
          { type: exportFormat === 'html' ? 'text/html' : exportFormat === 'json' ? 'application/json' : 'text/markdown' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `跑团记录_${roomId}_${new Date().toISOString().slice(0, 10)}.${
          exportFormat === 'html' ? 'html' : exportFormat === 'json' ? 'json' : 'md'
        }`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('导出失败:', err);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="w-[380px] bg-coc-bg border-l border-coc-border flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-coc-border/30">
        <div className="flex items-center gap-2 text-sm text-coc-parchment">
          <BookOpen size={14} />
          <span className="font-ritual">跑团 Log</span>
        </div>
        <button onClick={onClose} className="p-1 text-coc-text-muted hover:text-coc-parchment transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Tab */}
      <div className="flex border-b border-coc-border/20">
        {(['realtime', 'edit', 'export'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs text-center transition-colors ${
              tab === t ? 'text-coc-gold border-b border-coc-gold' : 'text-coc-text-muted hover:text-coc-parchment'
            } ${t === 'edit' && !isKP ? 'hidden' : ''}`}
          >
            {t === 'realtime' && <>实时</>}
            {t === 'edit' && <>整理</>}
            {t === 'export' && <><Download size={10} className="inline mr-1" />导出</>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {tab === 'realtime' && (
          <LogRealtimeView events={events} annotations={annotations} />
        )}
        {tab === 'edit' && isKP && (
          <LogEditView
            events={events}
            selectedEventIds={selectedEventIds}
            setSelectedEventIds={setSelectedEventIds}
            narrationText={narrationText}
            setNarrationText={setNarrationText}
            onAddNarration={addNarration}
          />
        )}
        {tab === 'export' && (
          <LogExportView
            format={exportFormat}
            setFormat={setExportFormat}
            eventCount={events.length}
            onExport={handleExport}
            exportResult={exportResult}
          />
        )}
      </div>
    </div>
  );
}

function LogRealtimeView({ events, annotations }: { events: LogEvent[]; annotations: LogAnnotation[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={EmptyIcons.Investigator}
        title="暂无记录"
        description="房间进行中会自动记录事件"
        size="sm"
        animate={false}
      />
    );
  }

  return (
    <div className="space-y-1">
      {events.map(event => {
        const payload = parsePayload(event.payload);
        const anns = annotations.filter(a => a.fromEventId === event.id);
        const color = EVENT_TYPE_COLORS[event.eventType] || 'text-coc-text';
        const label = EVENT_TYPE_LABELS[event.eventType] || event.eventType;

        return (
          <div key={event.id} className="group">
            {/* Annotation 前置 */}
            {anns.filter(a => !a.toEventId).map(ann => (
              <div key={ann.id} className="px-2 py-1 my-1 rounded bg-coc-gold/5 border-l-2 border-coc-gold text-[11px] text-coc-gold/80 italic">
                [KP 旁白] {ann.content}
              </div>
            ))}

            {/* 事件主体 */}
            <div className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-coc-bg-elevated/20 transition-colors text-[11px]">
              <span className={`text-[10px] font-medium flex-shrink-0 mt-0.5 ${color}`}>{label}</span>
              <div className="flex-1 min-w-0">
                {event.eventType === 'CHAT_TEXT' && (
                  <span>
                    <span className="text-coc-parchment">{event.characterName || event.userNickname}</span>
                    <span className="text-coc-text-muted">：{payload.message || payload.content || event.payload}</span>
                  </span>
                )}
                {event.eventType === 'DICE_ROLL' && (
                  <span>
                    🎲 <span className="text-coc-parchment">{payload.skill || payload.targetName || '检定'}</span>
                    <span className="text-coc-text-muted"> {payload.rollResult || payload.result}/{payload.targetValue || '?'} </span>
                    <span className={payload.successLevel?.includes('成功') ? 'text-green-400' : 'text-coc-blood'}>{payload.successLevel || payload.result}</span>
                  </span>
                )}
                {event.eventType === 'SCENE_CHANGE' && (
                  <span className="text-coc-ether">
                    --- 场景切换：{payload.sceneTitle || payload.presetName || '新场景'} ---
                  </span>
                )}
                {event.eventType === 'COMBAT_ACTION' && (
                  <span>
                    ⚔️ <span className="text-coc-parchment">{payload.actor || '?'}</span>
                    <span className="text-coc-text-muted"> {payload.action || '行动'}</span>
                    {payload.target && <span className="text-coc-text-muted"> → {payload.target}</span>}
                  </span>
                )}
                {event.eventType === 'CLUE_REVEAL' && (
                  <span>
                    💡 <span className="text-coc-ether">线索揭示：{payload.clueTitle || '未知线索'}</span>
                    <span className="text-coc-text-muted">（{payload.discoveredBy || event.userNickname}）</span>
                  </span>
                )}
                {event.eventType === 'SYSTEM_EVENT' && (
                  <span className="text-coc-text-muted">{payload.message || payload.action || event.payload}</span>
                )}
                {![
                  'CHAT_TEXT', 'DICE_ROLL', 'SCENE_CHANGE', 'COMBAT_ACTION', 'CLUE_REVEAL', 'SYSTEM_EVENT',
                ].includes(event.eventType) && (
                  <span className="text-coc-text-muted">{JSON.stringify(payload).slice(0, 120)}</span>
                )}
              </div>
              <span className="text-[9px] text-coc-text-muted flex-shrink-0">
                {new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Annotation 后置 */}
            {anns.filter(a => a.toEventId).map(ann => (
              <div key={ann.id} className="px-2 py-0.5 text-[10px] text-coc-text-muted italic">
                {ann.type === 'REDACT' ? '█ 内容已脱敏 █' : `[${ann.type}] ${ann.content}`}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function LogEditView({
  events,
  selectedEventIds,
  setSelectedEventIds,
  narrationText,
  setNarrationText,
  onAddNarration,
}: {
  events: LogEvent[];
  selectedEventIds: string[];
  setSelectedEventIds: (ids: string[]) => void;
  narrationText: string;
  setNarrationText: (s: string) => void;
  onAddNarration: () => void;
}) {
  const toggleSelect = (id: string) => {
    if (selectedEventIds.includes(id)) {
      setSelectedEventIds(selectedEventIds.filter(i => i !== id));
    } else {
      setSelectedEventIds([...selectedEventIds, id]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-coc-text-muted">
        选择事件范围，然后添加旁白或合并标记
      </div>
      <div className="space-y-1 max-h-[40vh] overflow-y-auto">
        {events.map(event => {
          const isSelected = selectedEventIds.includes(event.id);
          const payload = parsePayload(event.payload);
          return (
            <div
              key={event.id}
              onClick={() => toggleSelect(event.id)}
              className={`flex items-start gap-2 px-2 py-1 rounded cursor-pointer text-[11px] transition-colors ${
                isSelected ? 'bg-coc-gold/10 border border-coc-gold/20' : 'hover:bg-coc-bg-elevated/20'
              }`}
            >
              <div className={`w-3 h-3 rounded border flex-shrink-0 mt-0.5 ${isSelected ? 'bg-coc-gold border-coc-gold' : 'border-coc-border'}`} />
              <div className="flex-1 min-w-0">
                <span className="text-coc-text-muted">{EVENT_TYPE_LABELS[event.eventType] || event.eventType}</span>
                <span className="text-coc-parchment ml-1">
                  {event.characterName || event.userNickname}
                </span>
                <span className="text-coc-text-muted ml-1 truncate">
                  {payload.message || payload.action || JSON.stringify(payload).slice(0, 60)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {selectedEventIds.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-coc-text-muted">
            已选择 {selectedEventIds.length} 个事件
          </div>
          <textarea
            value={narrationText}
            onChange={e => setNarrationText(e.target.value)}
            placeholder="输入旁白内容..."
            rows={3}
            className="w-full px-2 py-1.5 bg-coc-bg-elevated border border-coc-border/30 rounded text-xs text-coc-parchment placeholder:text-coc-text-muted focus:border-coc-gold focus:outline-none resize-none"
          />
          <button
            onClick={onAddNarration}
            disabled={!narrationText.trim()}
            className="w-full py-1.5 text-xs bg-coc-gold/10 text-coc-gold border border-coc-gold/20 rounded hover:bg-coc-gold/20 disabled:opacity-30 transition-colors"
          >
            添加旁白
          </button>
        </div>
      )}
    </div>
  );
}

function LogExportView({
  format,
  setFormat,
  eventCount,
  onExport,
  exportResult,
}: {
  format: 'markdown' | 'html' | 'json';
  setFormat: (f: 'markdown' | 'html' | 'json') => void;
  eventCount: number;
  onExport: () => void;
  exportResult: any;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs text-coc-text-muted">
        选择导出格式，系统将生成文件并自动下载
      </div>
      <div className="space-y-1.5">
        {(['markdown', 'html', 'json'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors ${
              format === f
                ? 'bg-coc-gold/10 border border-coc-gold/20 text-coc-gold'
                : 'bg-coc-bg-elevated/20 border border-coc-border/20 text-coc-text-muted hover:text-coc-parchment'
            }`}
          >
            <FileText size={14} />
            <span className="flex-1 text-left">
              {f === 'markdown' ? 'Markdown（默认，适合发布）' : f === 'html' ? 'HTML（精美排版）' : 'JSON（数据归档）'}
            </span>
            {format === f && <ChevronRight size={14} />}
          </button>
        ))}
      </div>
      <div className="text-[10px] text-coc-text-muted">
        当前记录包含 {eventCount} 个事件
      </div>
      <button
        onClick={onExport}
        className="w-full py-2 text-xs bg-coc-gold text-coc-abyss rounded font-medium hover:bg-coc-gold/80 transition-colors flex items-center justify-center gap-1"
      >
        <Download size={12} />
        导出并下载
      </button>
      {exportResult && (
        <div className="text-[10px] text-green-400/80">
          ✅ 已导出：{exportResult.eventCount} 个事件，{exportResult.annotationCount} 条注释
        </div>
      )}
    </div>
  );
}
