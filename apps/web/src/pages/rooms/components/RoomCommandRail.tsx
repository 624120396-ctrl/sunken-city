import { Link } from 'react-router-dom';
import {
  Archive,
  Bell,
  BookOpen,
  Dice5,
  Eye,
  FileText,
  History,
  Megaphone,
  PanelRightClose,
  Search,
  Settings,
  Swords,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@lib/utils';
import type { RoomGameplayMember } from './RoomGameplayTypes';

type RoomViewMode = 'chat' | 'combat';
type InvestigationTab = 'focus' | 'prep' | 'clues' | 'npcs' | 'scenes' | 'timeline' | 'kpNotes';

interface RoomCommandItem {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
  badge?: number;
}

interface RoomCommandRailProps {
  roomId: string;
  members: RoomGameplayMember[];
  currentUserId?: string;
  activeTab: RoomViewMode;
  setActiveTab: (tab: RoomViewMode) => void;
  roomLeftPanelCollapsed: boolean;
  toggleRoomLeftPanel: () => void;
  canViewInvestigation: boolean;
  showInvestigationDock: boolean;
  setShowInvestigationDock: (updater: boolean | ((value: boolean) => boolean)) => void;
  showCluePanel: boolean;
  setShowCluePanel: (updater: boolean | ((value: boolean) => boolean)) => void;
  showNpcPanel: boolean;
  setShowNpcPanel: (updater: boolean | ((value: boolean) => boolean)) => void;
  showCombatTimeline: boolean;
  setShowCombatTimeline: (updater: boolean | ((value: boolean) => boolean)) => void;
  showNotesPanel: boolean;
  setShowNotesPanel: (updater: boolean | ((value: boolean) => boolean)) => void;
  showSubRooms: boolean;
  setShowSubRooms: (updater: boolean | ((value: boolean) => boolean)) => void;
  showLogPanel: boolean;
  setShowLogPanel: (updater: boolean | ((value: boolean) => boolean)) => void;
  showEventLog: boolean;
  setShowEventLog: (updater: boolean | ((value: boolean) => boolean)) => void;
  showStats: boolean;
  onToggleStats: () => void;
  canUseKPTools: boolean;
  showGMKit: boolean;
  setShowGMKit: (updater: boolean | ((value: boolean) => boolean)) => void;
  showKpDicePanel?: boolean;
  onOpenKpDicePanel?: () => void;
  onOpenInvestigationTab?: (tab: InvestigationTab) => void;
  onRequestClose?: () => void;
}

function memberRole(member: RoomGameplayMember) {
  if (member.role === 'KP') return '守密人';
  if (member.role === 'OBSERVER') return '观众（只读）';
  return '玩家';
}

export function RoomCommandRail({
  roomId,
  members,
  currentUserId,
  activeTab,
  setActiveTab,
  roomLeftPanelCollapsed,
  toggleRoomLeftPanel,
  canViewInvestigation,
  showInvestigationDock,
  setShowInvestigationDock,
  showCluePanel,
  setShowCluePanel,
  showNpcPanel,
  setShowNpcPanel,
  showCombatTimeline,
  setShowCombatTimeline,
  showNotesPanel,
  setShowNotesPanel,
  showSubRooms,
  setShowSubRooms,
  showLogPanel,
  setShowLogPanel,
  showEventLog,
  setShowEventLog,
  showStats,
  onToggleStats,
  canUseKPTools,
  showGMKit,
  setShowGMKit,
  showKpDicePanel = false,
  onOpenKpDicePanel,
  onOpenInvestigationTab,
  onRequestClose,
}: RoomCommandRailProps) {
  const openSceneTool = () => {
    if (onOpenInvestigationTab) {
      onOpenInvestigationTab('scenes');
      return;
    }
    setShowInvestigationDock((value) => !value);
  };

  const openClueTool = () => {
    if (onOpenInvestigationTab) {
      onOpenInvestigationTab('clues');
      return;
    }
    setShowCluePanel((value) => !value);
  };

  const openNpcTool = () => {
    if (onOpenInvestigationTab) {
      onOpenInvestigationTab('npcs');
      return;
    }
    setShowNpcPanel((value) => !value);
  };

  const openSceneEditTool = () => {
    if (onOpenInvestigationTab) {
      onOpenInvestigationTab('scenes');
      return;
    }
    setShowNotesPanel((value) => !value);
  };

  const navItems: RoomCommandItem[] = [
    { label: '成员', icon: Users, active: !roomLeftPanelCollapsed, onClick: toggleRoomLeftPanel },
    ...(canViewInvestigation
      ? [{
          label: '场景',
          icon: Archive,
          active: showInvestigationDock,
          onClick: openSceneTool,
        }]
      : []),
    { label: '线索', icon: Search, active: showCluePanel || showInvestigationDock, onClick: openClueTool },
    { label: 'NPC', icon: User, active: showNpcPanel || showInvestigationDock, onClick: openNpcTool },
    {
      label: '战斗',
      icon: Swords,
      active: activeTab === 'combat' || showCombatTimeline,
      onClick: () => {
        setActiveTab(activeTab === 'chat' ? 'combat' : 'chat');
        setShowCombatTimeline((value) => !value);
      },
    },
    { label: '结算', icon: FileText, active: showStats, onClick: onToggleStats },
  ];

  const quickItems: RoomCommandItem[] = [
    { label: '公告', icon: Megaphone, active: showEventLog, onClick: () => setShowEventLog((value) => !value) },
    {
      label: '投掷骰子',
      icon: Dice5,
      active: showKpDicePanel,
      onClick: onOpenKpDicePanel ?? (() => setActiveTab('chat')),
    },
    { label: '发起线索', icon: Search, active: showCluePanel || showInvestigationDock, onClick: openClueTool },
    { label: '调整场景', icon: BookOpen, active: showInvestigationDock || showNotesPanel, onClick: openSceneEditTool },
    { label: '子房间', icon: Archive, active: showSubRooms, onClick: () => setShowSubRooms((value) => !value) },
    { label: '开始战斗', icon: Swords, active: activeTab === 'combat', onClick: () => setActiveTab('combat') },
  ];

  const visibleMembers = members.slice(0, 7);

  return (
    <aside className="room-command-rail hidden md:flex" data-testid="room-desktop-command-rail">
      <header className="room-command-rail__header">
        <div>
          <span className="room-command-rail__eyebrow">Keeper Console</span>
          <h3>{canUseKPTools ? '守密人工具台' : '观察与行动'}</h3>
          <p>{canUseKPTools ? '主持、线索、场景与战斗入口' : '查看现场与可用行动'}</p>
        </div>
        <div className="room-command-rail__header-actions">
          {onRequestClose && (
            <button
              type="button"
              aria-label="收起工具台"
              className="room-command-rail__ghost"
              onClick={onRequestClose}
            >
              <PanelRightClose size={16} />
            </button>
          )}
          <button
            type="button"
            aria-label="控制台设置"
            className={cn('room-command-rail__ghost', showGMKit && 'room-command-rail__ghost--active')}
            onClick={() => setShowGMKit((value) => !value)}
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      <nav className="room-command-rail__nav" aria-label="房间工具">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            data-room-desktop-action="true"
            onClick={item.onClick}
            className={cn('room-command-rail__tab', item.active && 'room-command-rail__tab--active')}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <em>{item.badge}</em>
            )}
          </button>
        ))}
      </nav>

      <section className="room-command-rail__section room-command-rail__section--people">
        <div className="room-command-rail__section-title">
          <Users size={14} />
          角色与观众
        </div>
        <div className="room-command-rail__people">
          {visibleMembers.length === 0 ? (
            <div className="room-command-rail__empty">暂无成员</div>
          ) : visibleMembers.map((member) => {
            const char = member.displayedCharacter || member.character;
            const isMe = member.userId === currentUserId;
            return (
              <button
                key={member.id}
                type="button"
                className="room-command-rail__person"
                onClick={toggleRoomLeftPanel}
              >
                <span className="room-command-rail__avatar">
                  {member.avatarUrl || char?.avatarUrl ? <img src={member.avatarUrl || char?.avatarUrl} alt="" /> : <User size={14} />}
                </span>
                <span className="room-command-rail__person-main">
                  <span className="room-command-rail__person-name">{char?.name || member.nickname}</span>
                  <span className="room-command-rail__person-sub">{memberRole(member)}</span>
                </span>
                <span className={cn('room-command-rail__status', member.role === 'OBSERVER' && 'room-command-rail__status--watch')}>
                  {member.role === 'OBSERVER' ? <Eye size={12} /> : <span />}
                  {member.role === 'OBSERVER' ? '观众' : isMe ? '本人' : '在线'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="room-command-rail__section room-command-rail__section--quick">
        <div className="room-command-rail__section-title">
          <Bell size={14} />
          快速操作
        </div>
        <div className="room-command-rail__quick-grid">
          {quickItems.map((item) => (
            <button
              key={item.label}
              type="button"
              data-room-desktop-action="true"
              onClick={item.onClick}
              className={cn('room-command-rail__quick', item.active && 'room-command-rail__quick--active')}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="room-command-rail__section room-command-rail__section--log">
        <div className="room-command-rail__section-title">
          <FileText size={14} />
          公开日志
        </div>
        <p>所有人可见的关键事件记录。</p>
        <button type="button" onClick={() => setShowLogPanel((value) => !value)}>
          {showLogPanel ? '收起' : '展开'}
        </button>
      </section>

      <footer className="room-command-rail__archive">
        <Link to={`/rooms/${roomId}/report`} data-room-desktop-action="true">
          <FileText size={17} />
          报告归档
        </Link>
        <Link to={`/rooms/${roomId}/dice-history`} data-room-desktop-action="true">
          <History size={17} />
          投骰历史
        </Link>
      </footer>
    </aside>
  );
}
