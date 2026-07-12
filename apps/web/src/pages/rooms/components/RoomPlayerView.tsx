import { useState, type FormEvent, type RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { Link } from 'react-router-dom';
import {
  Archive,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronUp,
  Dice5,
  Eye,
  FileText,
  Heart,
  History,
  Search,
  Sparkles,
  Swords,
  User,
  Users,
} from 'lucide-react';
import { QuickRollBar } from '@components/room/QuickRollBar';
import { Surface } from '@components/system';
import { cn } from '@lib/utils';
import { RoomChatComposer } from './RoomChatComposer';
import { RoomChatTranscript } from './RoomChatTranscript';
import { RoomSceneBanner } from './RoomSceneBanner';
import { RoomStageShell } from '../../../features/room-stage/RoomStageShell';
import type {
  RoomChatMessage,
  RoomCombatState,
  RoomGameplayMember,
  RoomGameplayRoom,
} from './RoomGameplayTypes';

type ClueDraft = {
  id: string;
  content: string;
  source: string;
  timestamp: string;
  category?: string;
};

interface RoomPlayerViewProps {
  room: RoomGameplayRoom;
  roomId: string;
  currentUserId?: string;
  selectedCharacter: any | null;
  messages: RoomChatMessage[];
  inputMessage: string;
  setInputMessage: (value: string) => void;
  connected: boolean;
  socketRef: RefObject<Socket | null>;
  isMobile: boolean;
  activeTab: 'chat' | 'combat';
  setActiveTab: (tab: 'chat' | 'combat') => void;
  combatState: RoomCombatState | null;
  isMyTurn: boolean;
  sceneDescription: string;
  showSceneBanner: boolean;
  onToggleSceneBanner: () => void;
  showChatTools: boolean;
  setShowChatTools: (visible: boolean | ((visible: boolean) => boolean)) => void;
  showMobileQuickRolls: boolean;
  setShowMobileQuickRolls: (visible: boolean | ((visible: boolean) => boolean)) => void;
  onOpenMobileActionDrawer: () => void;
  canSendPrivateMessage: boolean;
  sendTargetUserId: string;
  onSendTargetChange: (value: string) => void;
  onSubmitMessage: (event?: FormEvent) => void;
  onRollSkill: (skillName: string, skillValue: number) => void;
  onUpdateQuickSkills: (skills: string[]) => Promise<void>;
  messagesEndRef: RefObject<HTMLDivElement>;
  clues: ClueDraft[];
  onMarkClue: (clue: ClueDraft) => void;
  onArchiveImportantMessage: (msg: RoomChatMessage, displayName: string) => void;
  onArchiveKeyDice: (msg: RoomChatMessage, displayName: string) => void;
  onOpenCharacter: () => void;
  onOpenClues: () => void;
  onOpenNpc: () => void;
  canViewInvestigation: boolean;
  setShowInvestigationDock: (updater: boolean | ((value: boolean) => boolean)) => void;
  setShowNotesPanel: (updater: boolean | ((value: boolean) => boolean)) => void;
  setShowSubRooms: (updater: boolean | ((value: boolean) => boolean)) => void;
  setShowCombatTimeline: (updater: boolean | ((value: boolean) => boolean)) => void;
  onSelectMember: (member: RoomGameplayMember) => void;
}

function readJsonValue<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function statValue(value?: number, max?: number) {
  if (typeof value !== 'number') return '-';
  return `${value}/${typeof max === 'number' ? max : value}`;
}

function roleText(member: RoomGameplayMember) {
  if (member.role === 'KP') return '守密人';
  if (member.role === 'OBSERVER') return '观众';
  return '调查员';
}

function memberSubtitle(member: RoomGameplayMember, char?: RoomGameplayMember['character']) {
  if (char?.occupation) return char.occupation;
  return roleText(member);
}

function successText(value?: string) {
  if (!value) return '结果';
  const normalized = value.toUpperCase();
  if (normalized === 'CRITICAL_SUCCESS') return '大成功';
  if (normalized === 'EXTREME_SUCCESS') return '极难成功';
  if (normalized === 'HARD_SUCCESS') return '困难成功';
  if (normalized === 'SUCCESS') return '成功';
  if (normalized === 'EXTREME_FAILURE') return '极大失败';
  if (normalized === 'FUMBLE') return '大失败';
  if (normalized === 'FAILURE' || normalized === 'FAIL') return '失败';
  return value.replace('SUCCESS', '成功').replace('FAIL', '失败');
}

function diceTone(value?: string) {
  if (!value) return 'none';
  const normalized = value.toUpperCase();
  if (value.includes('大成功') || normalized === 'CRITICAL_SUCCESS') return 'critical-success';
  if (value.includes('极难成功') || value.includes('极大成功') || normalized === 'EXTREME_SUCCESS') return 'extreme-success';
  if (value.includes('困难成功') || normalized === 'HARD_SUCCESS') return 'hard-success';
  if ((value.includes('成功') && !value.includes('失败')) || normalized === 'SUCCESS') return 'success';
  if (value.includes('大失败') || value.includes('极大失败') || normalized === 'FUMBLE' || normalized === 'EXTREME_FAILURE') return 'fumble';
  return 'failure';
}

function splitPhaseTitle(title?: string | null) {
  const fallback = title || '序章';
  const [kicker, ...rest] = fallback.split(/[·・]/);
  return {
    kicker: kicker || fallback,
    name: rest.join('·') || '',
  };
}

export function RoomPlayerView({
  room,
  roomId,
  currentUserId,
  selectedCharacter,
  messages,
  inputMessage,
  setInputMessage,
  connected,
  socketRef,
  isMobile,
  activeTab,
  setActiveTab,
  combatState,
  isMyTurn,
  sceneDescription,
  showSceneBanner,
  onToggleSceneBanner,
  showChatTools,
  setShowChatTools,
  showMobileQuickRolls,
  setShowMobileQuickRolls,
  onOpenMobileActionDrawer,
  canSendPrivateMessage,
  sendTargetUserId,
  onSendTargetChange,
  onSubmitMessage,
  onRollSkill,
  onUpdateQuickSkills,
  messagesEndRef,
  clues,
  onMarkClue,
  onArchiveImportantMessage,
  onArchiveKeyDice,
  onOpenCharacter,
  onOpenClues,
  onOpenNpc,
  canViewInvestigation,
  setShowInvestigationDock,
  setShowNotesPanel,
  setShowSubRooms,
  setShowCombatTimeline,
  onSelectMember,
}: RoomPlayerViewProps) {
  const members = room.members || [];
  const myMember = members.find((member) => member.userId === currentUserId);
  const myCharacter = selectedCharacter || myMember?.displayedCharacter || myMember?.character || null;
  const quickSkills = readJsonValue<string[]>(myCharacter?.quickSkills, ['侦查', '聆听', '图书馆使用', '心理学', '话术']);
  const characterSkills = readJsonValue<Record<string, number>>(myCharacter?.skills, {});
  const latestDice = [...messages].reverse().find((message) => message.type === 'dice' && message.rollData?.rollResult !== undefined);
  const party = members.filter((member) => member.role !== 'OBSERVER');
  const phaseTitle = splitPhaseTitle(room.currentPhase?.title);
  const [mobileOpenLayer, setMobileOpenLayer] = useState<'dossier' | 'board' | null>(null);
  const isDossierOpen = !isMobile || mobileOpenLayer === 'dossier';
  const isBoardOpen = !isMobile || mobileOpenLayer === 'board';

  return (
    <div
      className={cn('room-player-view', isMobile && 'room-player-mobile-info-stack')}
      data-testid="room-player-view"
    >
      {!isMobile && (
      <aside
        className={cn('room-player-dossier', isMobile && 'room-player-mobile-layer-card')}
        data-mobile-expanded={isDossierOpen ? 'true' : 'false'}
        aria-label="我的调查员档案"
      >
        {isMobile && (
          <button
            type="button"
            className="room-player-mobile-layer-summary"
            aria-expanded={isDossierOpen}
            onClick={() => setMobileOpenLayer((layer) => (layer === 'dossier' ? null : 'dossier'))}
          >
            <span>
              <User size={15} />
              调查员档案
            </span>
            <b>{myCharacter?.name || myMember?.nickname || '未绑定角色'}</b>
            {isDossierOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
        <div className="room-player-mobile-layer-content">
        <section className="room-player-card room-player-identity">
          <div className="room-player-identity__portrait">
            {myMember?.avatarUrl || myCharacter?.avatarUrl ? (
              <img src={myMember?.avatarUrl || myCharacter?.avatarUrl} alt="" />
            ) : (
              <User size={34} />
            )}
          </div>
          <div className="room-player-identity__text">
            <span>我的调查员</span>
            <h2>{myCharacter?.name || myMember?.nickname || '未绑定角色'}</h2>
            <p>{myCharacter?.occupation || roleText(myMember || { role: 'OBSERVER' } as RoomGameplayMember)}</p>
          </div>
          <button type="button" onClick={onOpenCharacter}>
            查看档案
          </button>
        </section>

        <section className="room-player-card room-player-vitals">
          <header>
            <span>生命迹象</span>
            <b>{connected ? '在线' : '断线'}</b>
          </header>
          <div className="room-player-vitals__grid">
            <div data-vital="hp">
              <Heart size={17} />
              <span>HP</span>
              <strong>{statValue(myCharacter?.hp, myCharacter?.maxHp)}</strong>
            </div>
            <div data-vital="mp">
              <Sparkles size={17} />
              <span>MP</span>
              <strong>{statValue(myCharacter?.mp, myCharacter?.maxMp)}</strong>
            </div>
            <div data-vital="san">
              <Brain size={17} />
              <span>SAN</span>
              <strong>{statValue(myCharacter?.san, myCharacter?.maxSan)}</strong>
            </div>
          </div>
        </section>

        <section className="room-player-card room-player-skills">
          <header>
            <span>常用检定</span>
            <Dice5 size={16} />
          </header>
          {myCharacter ? (
            <div className="room-player-skill-list">
              {quickSkills.slice(0, 6).map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => onRollSkill(skill, Number(characterSkills[skill] ?? 50))}
                >
                  <span>{skill}</span>
                  <b>{Number(characterSkills[skill] ?? 50)}</b>
                </button>
              ))}
            </div>
          ) : (
            <p className="room-player-muted">绑定调查员后可快速投骰。</p>
          )}
        </section>

        <section className="room-player-card room-player-party">
          <header>
            <span>同行者</span>
            <b>{party.length}</b>
          </header>
          <div className="room-player-party__list">
            {members.slice(0, 7).map((member) => {
              const char = member.displayedCharacter || member.character;
              return (
                <button
                  key={member.id}
                  type="button"
                  data-self={member.userId === currentUserId ? 'true' : 'false'}
                  onClick={() => onSelectMember(member)}
                >
                  <span>
                    {member.avatarUrl || char?.avatarUrl ? <img src={member.avatarUrl || char?.avatarUrl} alt="" /> : <User size={15} />}
                  </span>
                  <b>{char?.name || member.nickname}</b>
                  <em>{memberSubtitle(member, char)}</em>
                </button>
              );
            })}
          </div>
        </section>
        </div>
      </aside>
      )}

      <main className="room-player-stage">
        <Surface
          variant="solid"
          padding="none"
          className={cn('room-player-stage__surface room-stage-surface-v3 flex min-h-0 flex-1 flex-col overflow-hidden', activeTab === 'combat' && 'room-player-stage__surface--combat')}
        >
          {activeTab === 'chat' ? (
            <>
              {!isMobile && (
                <RoomSceneBanner
                  room={room}
                  sceneDescription={sceneDescription}
                  canEdit={false}
                  onEdit={() => setShowNotesPanel(true)}
                  isCollapsed={!showSceneBanner}
                  onToggleCollapsed={onToggleSceneBanner}
                />
              )}
              {isMobile && (
                <section className="room-player-mobile-status-strip" aria-label="调查员快速状态">
                  <button
                    type="button"
                    className="room-player-mobile-status-strip__identity"
                    onClick={onOpenCharacter}
                  >
                    <span className="room-player-mobile-status-strip__avatar">
                      {myMember?.avatarUrl || myCharacter?.avatarUrl ? (
                        <img src={myMember?.avatarUrl || myCharacter?.avatarUrl} alt="" />
                      ) : (
                        <User size={15} />
                      )}
                    </span>
                    <span>
                      <b>{myCharacter?.name || myMember?.nickname || '未绑定角色'}</b>
                      <small>{myCharacter?.occupation || roleText(myMember || { role: 'OBSERVER' } as RoomGameplayMember)}</small>
                    </span>
                  </button>

                  <div className="room-player-mobile-status-strip__vitals" aria-label="生命迹象">
                    <span data-vital="hp">
                      <Heart size={12} />
                      <b>HP</b>
                      <strong>{statValue(myCharacter?.hp, myCharacter?.maxHp)}</strong>
                    </span>
                    <span data-vital="san">
                      <Brain size={12} />
                      <b>SAN</b>
                      <strong>{statValue(myCharacter?.san, myCharacter?.maxSan)}</strong>
                    </span>
                  </div>

                  <div className="room-player-mobile-status-strip__roll" data-result-tone={diceTone(latestDice?.rollData?.successLevel)}>
                    <Dice5 size={13} />
                    <span>{latestDice?.rollData?.targetName || '检定'}</span>
                    <b>{latestDice?.rollData ? `${latestDice.rollData.rollResult}` : '暂无'}</b>
                  </div>

                </section>
              )}
              <RoomStageShell roomId={roomId} socketRef={socketRef} connected={connected} isMobile={isMobile} />
              <RoomChatTranscript
                messages={messages}
                members={members}
                currentUserId={currentUserId}
                isMobile={isMobile}
                canUseKPTools={false}
                messagesEndRef={messagesEndRef}
                onArchiveImportantMessage={onArchiveImportantMessage}
                onArchiveKeyDice={onArchiveKeyDice}
                onMarkClue={onMarkClue}
              />
              <div className="room-bottom-command-deck room-player-composer">
                <RoomChatComposer
                  value={inputMessage}
                  onChange={setInputMessage}
                  members={members}
                  currentUserId={currentUserId}
                  connected={connected}
                  isMobile={isMobile}
                  showChatTools={showChatTools}
                  setShowChatTools={setShowChatTools}
                  hasSelectedCharacter={!!myCharacter}
                  showMobileQuickRolls={showMobileQuickRolls}
                  setShowMobileQuickRolls={setShowMobileQuickRolls}
                  onOpenMobileActionDrawer={onOpenMobileActionDrawer}
                  canUseKPTools={false}
                  canSendPrivateMessage={canSendPrivateMessage}
                  sendTargetUserId={sendTargetUserId}
                  onSendTargetChange={onSendTargetChange}
                  onOpenSanityModal={() => undefined}
                  onSubmit={onSubmitMessage}
                />
                {myCharacter && (!isMobile || showMobileQuickRolls) && (
                  <div className="room-quick-roll-tray">
                    <QuickRollBar
                      quickSkills={quickSkills}
                      characterSkills={characterSkills}
                      onRoll={(skillName, skillValue) => {
                        onRollSkill(skillName, skillValue);
                        if (isMobile) setShowMobileQuickRolls(false);
                      }}
                      onUpdateQuickSkills={onUpdateQuickSkills}
                      isEditable
                      compact={isMobile}
                      desktopPageSize={5}
                    />
                  </div>
                )}
                {!myCharacter && !isMobile && (
                  <div className="room-quick-roll-tray room-quick-roll-tray--empty" aria-label="快捷检定未启用">
                    <Dice5 size={16} />
                    <span>绑定调查员后显示快捷检定</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="room-player-combat">
              <Swords size={42} />
              <h3>{combatState?.status === 'IN_PROGRESS' ? '战斗进行中' : '战斗未开始'}</h3>
              <p>{isMyTurn ? '现在轮到你行动。' : '战斗视图会在 KP 推进后同步更新。'}</p>
              {combatState?.turnOrder?.length ? (
                <div className="room-player-combat__order">
                  {combatState.turnOrder.map((combatant, index) => (
                    <span key={combatant.userId} data-current={index === combatState.currentTurnIndex ? 'true' : 'false'}>
                      {combatant.characterName || combatant.nickname}
                    </span>
                  ))}
                </div>
              ) : null}
              <button type="button" onClick={() => setActiveTab('chat')}>回到记录</button>
            </div>
          )}
        </Surface>
      </main>

      {!isMobile && (
      <aside
        className={cn('room-player-board', isMobile && 'room-player-mobile-layer-card')}
        data-mobile-expanded={isBoardOpen ? 'true' : 'false'}
        aria-label="调查板"
      >
        {isMobile && (
          <button
            type="button"
            className="room-player-mobile-layer-summary"
            aria-expanded={isBoardOpen}
            onClick={() => setMobileOpenLayer((layer) => (layer === 'board' ? null : 'board'))}
          >
            <span>
              <Archive size={15} />
              调查板
            </span>
            <b>{clues.length} 条线索 · {latestDice?.rollData ? `${latestDice.rollData.rollResult}` : '暂无检定'}</b>
            {isBoardOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
        <div className="room-player-mobile-layer-content">
        <section className="room-player-board__hero" aria-label="调查员案板">
          <div className="room-player-board__hero-meta" aria-label="当前调查状态">
            <small className="room-player-board__phase-title">
              <span>{phaseTitle.kicker}</span>
              {phaseTitle.name && <b>{phaseTitle.name}</b>}
            </small>
          </div>
        </section>

        <section className="room-player-board__action-panel">
          <header>
            <span>快速行动</span>
            <b>{activeTab === 'combat' ? '战斗视图' : '调查视图'}</b>
          </header>
          <div className="room-player-board__actions">
            <button type="button" onClick={onOpenClues}>
              <Search size={18} />
              线索
            </button>
            <button type="button" onClick={onOpenNpc}>
              <User size={18} />
              NPC
            </button>
            <button
              type="button"
              data-active={activeTab === 'combat' ? 'true' : 'false'}
              onClick={() => setActiveTab(activeTab === 'chat' ? 'combat' : 'chat')}
            >
              <Swords size={18} />
              战斗
            </button>
            {canViewInvestigation && (
              <button type="button" onClick={() => setShowInvestigationDock((visible) => !visible)}>
                <Archive size={18} />
                档案
              </button>
            )}
            <button type="button" onClick={() => setShowNotesPanel((visible) => !visible)}>
              <BookOpen size={18} />
              笔记
            </button>
          </div>
        </section>

        <section className="room-player-board__section room-player-board__section--clues">
          <header>
            <span>已标记线索</span>
            <b>{clues.length}</b>
          </header>
          {clues.length > 0 ? (
            <div className="room-player-clues">
              {clues.slice(-3).reverse().map((clue) => (
                <article key={clue.id}>
                  <b>{clue.category || '线索'}</b>
                  <p>{clue.content}</p>
                  <small>{clue.source}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="room-player-muted">可在聊天记录中把重要文本标为线索。</p>
          )}
        </section>

        <section className="room-player-board__section room-player-board__section--roll">
          <header>
            <span>最近检定</span>
            <Dice5 size={15} />
          </header>
          {latestDice?.rollData ? (
            <div className="room-player-latest-roll" data-result-tone={diceTone(latestDice.rollData.successLevel)}>
              <span>{latestDice.rollData.targetName || '1d100'}</span>
              <strong>{latestDice.rollData.rollResult}</strong>
              <b>{successText(latestDice.rollData.successLevel)}</b>
            </div>
          ) : (
            <p className="room-player-muted">暂无检定结果。</p>
          )}
        </section>

        <section className="room-player-board__section room-player-board__section--links">
          <button type="button" onClick={() => setShowSubRooms((visible) => !visible)}>
            <Users size={16} />
            子房间
          </button>
          <button type="button" onClick={() => setShowCombatTimeline((visible) => !visible)}>
            <Eye size={16} />
            战斗记录
          </button>
          <Link to={`/rooms/${roomId}/report`}>
            <FileText size={16} />
            报告
          </Link>
          <Link to={`/rooms/${roomId}/dice-history`}>
            <History size={16} />
            投骰历史
          </Link>
        </section>

        <section className="room-player-board__section room-player-board__section--status" aria-label="本轮记录概览">
          <header>
            <span>本轮记录</span>
            <b>{messages.length}</b>
          </header>
          <div className="room-player-board__status-grid">
            <span>同步</span>
            <b>{connected ? '已连接' : '待连接'}</b>
            <span>线索</span>
            <b>{clues.length} 条</b>
            <span>检定</span>
            <b>{latestDice?.rollData ? `${latestDice.rollData.rollResult}` : '暂无'}</b>
          </div>
        </section>
        </div>
      </aside>
      )}
    </div>
  );
}
