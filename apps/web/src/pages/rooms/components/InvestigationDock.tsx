import { useState } from 'react';
import { Archive, CalendarCheck, MapPin, ScrollText, Search, StickyNote, Target, UserRound, X } from 'lucide-react';
import { cn } from '@lib/utils';
import type { RoomCapabilities } from '@/types/room-contract';
import { ClueBoardPanel } from './ClueBoardPanel';
import { CurrentFocusPanel } from './CurrentFocusPanel';
import { InvestigationTimelinePanel } from './InvestigationTimelinePanel';
import { KpPrivateNotesPanel } from './KpPrivateNotesPanel';
import { NpcArchivePanel } from './NpcArchivePanel';
import { ScenePanel } from './ScenePanel';
import { SessionPrepPanel } from './SessionPrepPanel';

type InvestigationTab = 'focus' | 'prep' | 'clues' | 'npcs' | 'scenes' | 'timeline' | 'kpNotes';

interface InvestigationDockProps {
  roomId: string;
  capabilities: RoomCapabilities;
  isOpen: boolean;
  onClose: () => void;
}

const baseTabs: Array<{ id: InvestigationTab; label: string; icon: typeof Search; kpOnly?: boolean }> = [
  { id: 'focus', label: '焦点', icon: Target },
  { id: 'prep', label: '准备', icon: CalendarCheck },
  { id: 'clues', label: '线索', icon: Search },
  { id: 'npcs', label: 'NPC', icon: UserRound },
  { id: 'scenes', label: '场景', icon: MapPin },
  { id: 'timeline', label: '日志', icon: ScrollText },
  { id: 'kpNotes', label: 'KP 便签', icon: StickyNote, kpOnly: true },
];

export function InvestigationDock({ roomId, capabilities, isOpen, onClose }: InvestigationDockProps) {
  const [activeTab, setActiveTab] = useState<InvestigationTab>('focus');

  if (!isOpen || !capabilities.canViewPublicContent) return null;

  const tabs = baseTabs.filter(tab => !tab.kpOnly || capabilities.canUseKPTools);
  const resolvedTab = tabs.some(tab => tab.id === activeTab) ? activeTab : 'focus';

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/45 backdrop-blur-sm">
      <section className="flex h-full w-full max-w-5xl flex-col border-l border-[#3a3a3a]/60 bg-[#0b0c12]/95 shadow-2xl shadow-black/40">
        <header className="flex shrink-0 items-center justify-between border-b border-[#3a3a3a]/60 p-3">
          <div className="flex items-center gap-2">
            <Archive size={18} className="text-[#f4d778]" />
            <div>
              <h2 className="text-sm font-bold text-[#f4ead1]">调查档案</h2>
              <p className="text-xs text-[#8f8778]">线索、NPC、场景、日志与 KP 便签</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-v2 flex h-9 w-9 items-center justify-center rounded border border-[#3a3a3a]/70 bg-[#15151d] text-[#b0a898]"
            aria-label="关闭调查档案"
          >
            <X size={16} />
          </button>
        </header>

        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#3a3a3a]/45 p-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'btn-v2 inline-flex min-h-10 items-center gap-1.5 rounded px-3 text-sm transition-colors',
                resolvedTab === tab.id
                  ? 'border border-[#c9a227]/60 bg-[#c9a227]/15 text-[#f4d778]'
                  : 'border border-transparent text-[#b0a898] hover:border-[#3a3a3a]/70 hover:text-[#e8d4a0]'
              )}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-hidden p-3">
          {resolvedTab === 'focus' && <CurrentFocusPanel roomId={roomId} canManage={capabilities.canUseKPTools} />}
          {resolvedTab === 'prep' && <SessionPrepPanel roomId={roomId} canManage={capabilities.canUseKPTools} />}
          {resolvedTab === 'clues' && <ClueBoardPanel roomId={roomId} canManage={capabilities.canManageClues} />}
          {resolvedTab === 'npcs' && <NpcArchivePanel roomId={roomId} canManage={capabilities.canManageNpcs} />}
          {resolvedTab === 'scenes' && <ScenePanel roomId={roomId} canManage={capabilities.canManageScene} />}
          {resolvedTab === 'timeline' && <InvestigationTimelinePanel roomId={roomId} canManage={capabilities.canUseKPTools} />}
          {resolvedTab === 'kpNotes' && capabilities.canUseKPTools && <KpPrivateNotesPanel roomId={roomId} />}
        </div>
      </section>
    </div>
  );
}
