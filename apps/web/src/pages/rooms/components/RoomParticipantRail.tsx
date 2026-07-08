import { Brain, ChevronLeft, ChevronRight, Heart, Settings, Shield, Sparkles, User, Users } from 'lucide-react';
import { cn } from '@lib/utils';
import type {
  RoomCombatState,
  RoomGameplayMember,
} from './RoomGameplayTypes';

interface RoomParticipantRailProps {
  roomCode?: string;
  members: RoomGameplayMember[];
  currentUserId?: string;
  selectedCharacter: any | null;
  memberStatuses: Record<string, string[]>;
  isCollapsed: boolean;
  isMobile: boolean;
  activeTab: 'chat' | 'combat';
  canUseKPTools: boolean;
  combatState: RoomCombatState | null;
  isMyTurn: boolean;
  onToggleCollapsed: () => void;
  onSelectMember: (member: RoomGameplayMember) => void;
  onUpdateMemberStatus: (memberId: string, tags: string[]) => void;
  onStartCombat: () => void;
  onOpenAttackModal: () => void;
  onNextTurn: () => void;
  onEndCombat: () => void;
}

function roleLabel(member: RoomGameplayMember) {
  if (member.role === 'KP') return '守密人';
  if (member.role === 'OBSERVER') return '观众';
  return '调查员';
}

function statValue(value?: number, max?: number) {
  if (typeof value !== 'number') return '-';
  return `${value}/${typeof max === 'number' ? max : value}`;
}

export function RoomParticipantRail(props: RoomParticipantRailProps) {
  const visibleMembers = props.members;

  return (
    <aside
      className={cn(
        'room-member-rail shrink-0 min-h-0',
        props.isMobile ? 'hidden md:flex' : 'flex',
        props.isCollapsed && 'room-member-rail--collapsed'
      )}
      data-room-left-collapsed={props.isCollapsed ? 'true' : 'false'}
    >
      <button
        type="button"
        onClick={props.onToggleCollapsed}
        className="room-member-rail__collapse"
        aria-label={props.isCollapsed ? '展开成员册' : '收起成员册'}
      >
        {props.isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="room-member-rail__scroll">
        <div className="room-member-rail__count">
          <Users size={14} />
          <span>参与者</span>
          <b>{visibleMembers.length}/6</b>
        </div>

        <div className="room-member-rail__list">
          {visibleMembers.length === 0 ? (
            <div className="room-member-rail__empty">
              <Users size={20} />
              <span>暂无成员</span>
            </div>
          ) : visibleMembers.map((member) => {
            const char = member.displayedCharacter || member.character;
            const isCurrentUser = member.userId === props.currentUserId;
            const statusTags = props.memberStatuses[member.id] || [];

            return (
              <button
                key={member.id}
                type="button"
                className={cn('room-member-card', isCurrentUser && 'room-member-card--self')}
                onClick={() => props.onSelectMember(member)}
              >
                <span className="room-member-card__portrait">
                  {member.avatarUrl || char?.avatarUrl ? (
                    <img src={member.avatarUrl || char?.avatarUrl} alt="" />
                  ) : (
                    <User size={24} />
                  )}
                  {member.frameUrl && <img src={member.frameUrl} alt="" className="room-member-card__frame" />}
                </span>

                <span className="room-member-card__body">
                  <span className="room-member-card__name-row">
                    <b>{char?.name || member.nickname}</b>
                    {isCurrentUser && <em>你</em>}
                  </span>
                  <span className="room-member-card__role">{roleLabel(member)}</span>

                  {char ? (
                    <span className="room-member-card__stats">
                      <span><Heart size={13} />{statValue(char.hp, char.maxHp)}</span>
                      <span><Sparkles size={13} />{statValue(char.mp, char.maxMp)}</span>
                      <span><Brain size={13} />{statValue(char.san, char.maxSan)}</span>
                    </span>
                  ) : (
                    <span className="room-member-card__observer">
                      <Shield size={13} />
                      只读席位
                    </span>
                  )}

                  {statusTags.length > 0 && (
                    <span className="room-member-card__tags">
                      {statusTags.slice(0, 2).map((tag) => <small key={tag}>{tag}</small>)}
                    </span>
                  )}
                </span>

                <span className="room-member-card__online">在线</span>
              </button>
            );
          })}
        </div>
      </div>

      <footer className="room-member-rail__footer">
        <button type="button" aria-label="成员">
          <Users size={18} />
        </button>
        <button type="button" aria-label="设置">
          <Settings size={18} />
        </button>
      </footer>
    </aside>
  );
}
