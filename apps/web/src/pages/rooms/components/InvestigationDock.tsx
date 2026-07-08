import { useEffect, useState } from 'react';
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

export type InvestigationTab = 'focus' | 'prep' | 'clues' | 'npcs' | 'scenes' | 'timeline' | 'kpNotes';

interface InvestigationDockProps {
  roomId: string;
  capabilities: RoomCapabilities;
  isOpen: boolean;
  onClose: () => void;
  activeTab?: InvestigationTab;
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

export function InvestigationDock({ roomId, capabilities, isOpen, onClose, activeTab: requestedTab }: InvestigationDockProps) {
  const [activeTab, setActiveTab] = useState<InvestigationTab>(requestedTab ?? 'scenes');

  useEffect(() => {
    if (isOpen && requestedTab) {
      setActiveTab(requestedTab);
    }
  }, [isOpen, requestedTab]);

  if (!isOpen || !capabilities.canViewPublicContent) return null;

  const tabs = baseTabs.filter(tab => !tab.kpOnly || capabilities.canUseKPTools);
  const resolvedTab = tabs.some(tab => tab.id === activeTab) ? activeTab : 'focus';

  return (
    <div className="investigation-dock-backdrop">
      <section className="investigation-dock-panel">
        <header className="investigation-dock-header">
          <div className="flex items-center gap-2">
            <Archive size={18} className="investigation-dock-header__icon" />
            <div>
              <h2>调查档案</h2>
              <p>线索、NPC、场景、日志与 KP 便签</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="investigation-dock-close"
            aria-label="关闭调查档案"
          >
            <X size={16} />
          </button>
        </header>

        <nav className="investigation-dock-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'investigation-dock-tab',
                resolvedTab === tab.id
                  ? 'investigation-dock-tab--active'
                  : ''
              )}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="investigation-dock-body">
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
