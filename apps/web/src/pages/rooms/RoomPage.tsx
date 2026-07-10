import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Archive, ArrowLeft, Users, Crown, DoorOpen, Swords, FileText, History, User, ScrollText, Search, GitBranch, ChevronDown, ChevronUp, Dice5, BookOpen, PanelRightOpen, MoreHorizontal } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { cn } from '@lib/utils';
import { useAuthStore } from '@stores/auth.store';
import { useLayoutStore } from '@stores/layout.store';
import { Modal } from '@components/ui/Modal';
import { UserProfileCard } from '@components/UserProfileCard';
import { useSocket } from '@hooks/useSocket';
import { Surface } from '@components/system';
import { MagneticButton } from '@components/ui/MagneticButton';

// ===== 新增沉浸式体验组件 =====
import { QuickRollBar } from '@components/room/QuickRollBar';
import { KPDicePanel } from '@components/room/KPDicePanel';
import { KpLifecycleControls } from './components/KpLifecycleControls';
import { RoomVoicePanel } from './components/RoomVoicePanel';
import { RoomJoinGate } from './components/RoomJoinGate';
import { RoomLifecycleBanner } from './components/RoomLifecycleBanner';
import { RoomParticipantRail } from './components/RoomParticipantRail';
import { RoomChatComposer } from './components/RoomChatComposer';
import { RoomChatTranscript } from './components/RoomChatTranscript';
import { RoomKeeperRollDock } from './components/RoomKeeperRollDock';
import { RoomPlayerView } from './components/RoomPlayerView';
import { RoomSceneBanner } from './components/RoomSceneBanner';
import type {
  RoomChatMessage,
  RoomCombatState,
  RoomGameplayMember,
  RoomGameplayRoom,
} from './components/RoomGameplayTypes';
import type { InvestigationTab } from './components/InvestigationDock';
import { archiveImportantMessage, archiveKeyDice } from '@/services/investigation.service';

const RoomCommandRail = lazy(() =>
  import('./components/RoomCommandRail').then((module) => ({
    default: module.RoomCommandRail,
  }))
);

const RoomSettlementPanel = lazy(() =>
  import('./components/RoomSettlementPanel').then((module) => ({
    default: module.RoomSettlementPanel,
  }))
);

const InvestigationDock = lazy(() =>
  import('./components/InvestigationDock').then((module) => ({
    default: module.InvestigationDock,
  }))
);

const CluePanel = lazy(() =>
  import('@components/room/CluePanel').then((module) => ({
    default: module.CluePanel,
  }))
);

const RoomLogPanel = lazy(() =>
  import('@components/room/RoomLogPanel').then((module) => ({
    default: module.RoomLogPanel,
  }))
);

const SubRoomManager = lazy(() =>
  import('@components/room/SubRoomManager').then((module) => ({
    default: module.SubRoomManager,
  }))
);

const RoomEventLogPanel = lazy(() =>
  import('@components/room/RoomEventLogPanel').then((module) => ({
    default: module.RoomEventLogPanel,
  }))
);

const GMKitPanel = lazy(() =>
  import('@components/room/GMKitPanel').then((module) => ({
    default: module.GMKitPanel,
  }))
);

const NpcFocusPanel = lazy(() =>
  import('@components/room/NpcFocusPanel').then((module) => ({
    default: module.NpcFocusPanel,
  }))
);

const CombatTimeline = lazy(() =>
  import('@components/room/CombatTimeline').then((module) => ({
    default: module.CombatTimeline,
  }))
);

const NotesPanel = lazy(() =>
  import('@components/room/NotesPanel').then((module) => ({
    default: module.NotesPanel,
  }))
);

const RoomStatsPanel = lazy(() =>
  import('@components/room/RoomStatsPanel').then((module) => ({
    default: module.RoomStatsPanel,
  }))
);

function readCharacterJsonValue<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readCharacterQuickSkills(character: any | null): string[] {
  return readCharacterJsonValue<string[]>(character?.quickSkills, ['侦查', '聆听', '图书馆使用', '心理学', '话术']);
}

function readCharacterSkills(character: any | null): Record<string, number> {
  return readCharacterJsonValue<Record<string, number>>(character?.skills, {});
}

export function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { roomLeftPanelCollapsed, toggleRoomLeftPanel, setRoomLeftPanelCollapsed, isMobile } = useLayoutStore();
  const [room, setRoom] = useState<RoomGameplayRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<RoomChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showMobileMembers, setShowMobileMembers] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [myCharacters, setMyCharacters] = useState<any[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'combat'>('chat');
  const [combatState, setCombatState] = useState<RoomCombatState | null>(null);
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [attackTarget, setAttackTarget] = useState('');
  const [isSecretDice, setIsSecretDice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 成员详情弹窗
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [selectedMember, setSelectedMember] = useState<RoomGameplayMember | null>(null);

  // 线索板
  const [clues, setClues] = useState<Array<{
    id: string;
    content: string;
    source: string;
    timestamp: string;
    category?: string;
  }>>([]);

  // ===== 新增沉浸式体验状态 =====
  const [sceneDesc, setSceneDesc] = useState<string>('');
  const [memberStatuses, setMemberStatuses] = useState<Record<string, string[]>>({});
  const [chatTargetUserId, setChatTargetUserId] = useState('public');
  const [_countdowns, setCountdowns] = useState<Array<{
    id: string;
    title: string;
    duration: number;
    remaining: number;
    isActive: boolean;
  }>>([]);
  const [showStats, setShowStats] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [showCluePanel, setShowCluePanel] = useState(false);
  const [showNpcPanel, setShowNpcPanel] = useState(false);
  const [showCombatTimeline, setShowCombatTimeline] = useState(false);
  const [showGMKit, setShowGMKit] = useState(false);
  const [showSubRooms, setShowSubRooms] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showKpDicePanel, setShowKpDicePanel] = useState(false);
  const [showInvestigationDock, setShowInvestigationDock] = useState(false);
  const [investigationDockTab, setInvestigationDockTab] = useState<InvestigationTab>('scenes');
  const [showMobileActionDrawer, setShowMobileActionDrawer] = useState(false);
  const [showMobileToolTray, setShowMobileToolTray] = useState(false);
  const [showMobileQuickRolls, setShowMobileQuickRolls] = useState(false);
  const [showDesktopCommandRail, setShowDesktopCommandRail] = useState(true);
  const [showSceneBanner, setShowSceneBanner] = useState(!isMobile);
  const [roomStats, setRoomStats] = useState({
    duration: 0,
    totalRolls: 0,
    successRolls: 0,
    failRolls: 0,
    mostUsedSkill: null as string | null,
  });
  const caps = room?.myCapabilities;
  const canUseKPTools = caps?.canUseKPTools ?? false;
  const canViewInvestigation = caps?.canViewPublicContent ?? false;
  const canSendPrivateMessage = caps?.canSendPrivateMessage ?? false;
  const playerQuickSkills = readCharacterQuickSkills(selectedCharacter);
  const playerCharacterSkills = readCharacterSkills(selectedCharacter);

  type FloatingToolPanel =
    | 'investigation'
    | 'clues'
    | 'npc'
    | 'eventLog'
    | 'log'
    | 'gmKit'
    | 'subRooms'
    | 'notes';

  const closeFloatingToolPanels = (except?: FloatingToolPanel) => {
    if (except !== 'investigation') setShowInvestigationDock(false);
    if (except !== 'clues') setShowCluePanel(false);
    if (except !== 'npc') setShowNpcPanel(false);
    if (except !== 'eventLog') setShowEventLog(false);
    if (except !== 'log') setShowLogPanel(false);
    if (except !== 'gmKit') setShowGMKit(false);
    if (except !== 'subRooms') setShowSubRooms(false);
    if (except !== 'notes') setShowNotesPanel(false);
  };

  const closeMobileActionSurfaces = () => {
    setShowMobileActionDrawer(false);
    setShowMobileToolTray(false);
    setShowMobileQuickRolls(false);
  };

  const toggleMobileActionDrawer = () => {
    setShowMobileActionDrawer((visible) => {
      if (visible) setShowMobileToolTray(false);
      return !visible;
    });
  };

  const setFloatingToolPanel = (
    panel: FloatingToolPanel,
    currentValue: boolean,
    setter: (value: boolean) => void,
    updater: boolean | ((value: boolean) => boolean),
  ) => {
    const nextValue = typeof updater === 'function' ? updater(currentValue) : updater;
    if (nextValue) {
      closeFloatingToolPanels(panel);
      setShowMobileActionDrawer(false);
      setShowMobileToolTray(false);
    }
    setter(nextValue);
  };

  const openInvestigationDock = (tab: InvestigationTab = 'scenes') => {
    setInvestigationDockTab(tab);
    setFloatingToolPanel('investigation', showInvestigationDock, setShowInvestigationDock, true);
  };

  // ===== SAN 扣除弹窗状态 =====
  const [showSanityModal, setShowSanityModal] = useState(false);
  const [sanityTargets, setSanityTargets] = useState<Record<string, number>>({});
  const [sanityDescription, setSanityDescription] = useState('');

  // 加载已保存的线索
  useEffect(() => {
    if (roomId) {
      const saved = localStorage.getItem(`clues_${roomId}`);
      if (saved) {
        try {
          setClues(JSON.parse(saved));
        } catch {}
      }
    }
  }, [roomId]);

  const [showChatTools, setShowChatTools] = useState(!isMobile);

  // 移动端默认收起左面板
  useEffect(() => {
    if (isMobile && !roomLeftPanelCollapsed) {
      setRoomLeftPanelCollapsed(true);
    }
    if (isMobile) setShowSceneBanner(false);
    setShowChatTools(!isMobile);
    if (!isMobile) setShowMobileQuickRolls(false);
  }, [isMobile]);

  const addClue = (clue: any) => {
    const newClues = [clue, ...clues];
    setClues(newClues);
    localStorage.setItem(`clues_${roomId}`, JSON.stringify(newClues));
  };

  const handleArchiveImportantMessage = async (msg: RoomChatMessage, displayName: string) => {
    if (!roomId || !msg.content.trim()) return;
    try {
      await archiveImportantMessage(roomId, {
        messageId: msg.id,
        content: msg.content,
        nickname: displayName,
        timestamp: msg.timestamp,
        isPinned: true,
      });
      alert('已归档为调查重要消息');
    } catch (error) {
      alert(error instanceof Error ? error.message : '归档重要消息失败');
    }
  };

  const handleArchiveKeyDice = async (msg: RoomChatMessage, displayName: string) => {
    if (!roomId || !msg.rollData?.rollResult) return;
    const fallbackRollType = msg.rollData.targetName
      ? '1D100'
      : msg.content.match(/🎲\s*([^:：]+)/)?.[1]?.trim() || '1D100';
    try {
      await archiveKeyDice(roomId, {
        diceRollId: msg.id,
        rollType: fallbackRollType,
        targetName: msg.rollData.targetName ?? null,
        targetValue: msg.rollData.targetValue ?? null,
        rollResult: msg.rollData.rollResult,
        successLevel: msg.rollData.successLevel ?? null,
        nickname: displayName,
        timestamp: msg.timestamp,
        isPinned: false,
      });
      alert('已归档为关键骰点');
    } catch (error) {
      alert(error instanceof Error ? error.message : '归档关键骰点失败');
    }
  };

  // Socket连接
  const { socket, connected, sendMessage: socketSendMessage, rollDice: socketRollDice } = useSocket({
    roomId: roomId || '',
    onMessage: (msg) => {
      setMessages(prev => [...prev, {
        id: msg.id,
        userId: msg.sender.userId,
        nickname: msg.sender.nickname,
        content: msg.content,
        type: msg.type === 'private' ? 'private' : 'text',
        timestamp: msg.timestamp,
        privateMeta: msg.meta,
      }]);
    },
    onDiceRoll: (roll) => {
      const content = roll.content || (roll.targetName
        ? `🎲 ${roll.targetName} 检定: ${roll.rollResult}/${roll.targetValue} ${roll.successLevel}`
        : `🎲 ${roll.rollType}: ${roll.rollResult}`);

      setMessages(prev => [...prev, {
        id: roll.id,
        userId: roll.sender.userId,
        nickname: roll.sender.nickname,
        content,
        type: 'dice',
        timestamp: roll.timestamp,
        rollData: roll.content ? undefined : {
          targetName: roll.targetName,
          targetValue: roll.targetValue,
          rollResult: roll.rollResult,
          successLevel: roll.successLevel,
        },
      }]);
    },
    onRoomJoined: (data) => {
      // 保存当前用户的角色数据
      if (data.myCharacter) {
        setSelectedCharacter(data.myCharacter);
      }
    },
    onHistoryMessages: (history) => {
      const formatted = history.map((msg: any) => {
        const base = {
          id: msg.id,
          userId: msg.userId || 'system',
          nickname: msg.nickname || '未知',
          content: msg.content,
          type: (msg.type === 'dice' || msg.type === 'system' || msg.type === 'private' ? msg.type : 'text') as RoomChatMessage['type'],
          timestamp: msg.timestamp,
          privateMeta: msg.type === 'private' ? msg.meta : undefined,
        };
        if (msg.type === 'dice' && msg.meta) {
          return {
            ...base,
            rollData: {
              targetName: msg.meta.targetName,
              targetValue: msg.meta.targetValue,
              rollResult: msg.meta.rollResult,
              successLevel: msg.meta.successLevel,
            } as RoomChatMessage['rollData'],
          };
        }
        return base;
      });
      setMessages(formatted);
    },
    onCombatStarted: (state) => {
      setCombatState(state);
      setActiveTab('combat');
    },
    onCombatUpdated: (state) => {
      setCombatState(state);
    },
    onCombatEnded: (state) => {
      setCombatState(state);
    },
    onAttackResult: (result) => {
      // 攻击结果显示在聊天中
      const content = result.hitSuccess
        ? `⚔️ ${result.actor} 攻击 ${result.target}: ${result.hitRoll} ${result.hitLevel}, 造成 ${result.finalDamage} 点伤害`
        : `⚔️ ${result.actor} 攻击 ${result.target}: ${result.hitRoll} ${result.hitLevel}`;

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        userId: 'system',
        nickname: '系统',
        content,
        type: 'system',
        timestamp: new Date().toISOString(),
      }]);
    },
    onSanityDeducted: (data) => {
      const { results } = data;
      results.forEach((r: any) => {
        let content = `☠️ ${r.nickname}(${r.characterName}) 损失了 ${r.loss} 点理智 [${r.newSan}/${r.characterName ? 50 : 50}]`;
        if (r.description) content += ` — ${r.description}`;
        if (r.insanity) {
          if (r.insanity.resisted) {
            content += `\n🧠 智力检定通过（${r.insanity.intCheck}/${r.insanity.intValue}），勉强保持清醒`;
          } else {
            content += `\n🌀 临时疯狂发作：${r.insanity.symptomName}（持续 ${r.insanity.duration} 小时）`;
          }
        }
        setMessages(prev => [...prev, {
          id: Date.now().toString() + Math.random(),
          userId: 'system',
          nickname: '理智侵蚀',
          content,
          type: 'system',
          timestamp: new Date().toISOString(),
        }]);
      });
      // 更新本地成员 SAN 数据
      setRoom(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map(m => {
            const update = results.find((r: any) => r.userId === m.userId);
            if (update && m.character) {
              return { ...m, character: { ...m.character, san: update.newSan } };
            }
            return m;
          }),
        };
      });
      // 若当前用户受影响，同步 selectedCharacter
      const myUpdate = results.find((r: any) => r.userId === user?.id);
      if (myUpdate && selectedCharacter) {
        setSelectedCharacter({ ...selectedCharacter, san: myUpdate.newSan });
      }
    },
  });

  useEffect(() => {
    fetchRoom();

    // 定期轮询倒计时
    const interval = setInterval(() => {
      if (roomId) {
        fetchCountdowns();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchRoom = async () => {
    try {
      const response = await apiFetch(`/rooms/${roomId}`);
      const data = await handleApiResponse<{ room: RoomGameplayRoom }>(response);
      setRoom(data.room);
      const myMember = data.room.members?.find((m: RoomGameplayMember) => m.userId === user?.id);
      const myCharacter = myMember?.character || myMember?.displayedCharacter;
      if (myCharacter) {
        setSelectedCharacter(myCharacter);
      }

      // 加载场景描述和氛围
      // @ts-ignore - 等待后端类型更新
      setSceneDesc(data.room.sceneDesc || '');

      // 加载成员状态标记
      const statuses: Record<string, string[]> = {};
      data.room.members?.forEach((m: RoomGameplayMember) => {
        // @ts-ignore
        if (m.statusTags) {
          try {
            // @ts-ignore
            statuses[m.id] = JSON.parse(m.statusTags);
          } catch {}
        }
      });
      setMemberStatuses(statuses);

      // 加载倒计时
      fetchCountdowns();

      if (!data.room.isMember) {
        fetchMyCharacters();
      }
    } catch (error: any) {
      if (error.message?.includes('不存在')) {
        alert('房间不存在');
        navigate('/rooms');
      }
    } finally {
      setLoading(false);
    }
  };

  // 加载倒计时
  const fetchCountdowns = async () => {
    try {
      const response = await apiFetch(`/rooms/${roomId}/countdowns`);
      const data = await handleApiResponse<{ countdowns: Array<{
        id: string;
        title: string;
        duration: number;
        remaining: number;
        isActive: boolean;
      }> }>(response);
      setCountdowns(data.countdowns);
    } catch (error) {
      console.error('获取倒计时失败:', error);
    }
  };

  // 加载房间统计
  const fetchRoomStats = async () => {
    try {
      const response = await apiFetch(`/rooms/${roomId}/stats`);
      const data = await handleApiResponse<{
        duration: number;
        totalRolls: number;
        successRolls: number;
        failRolls: number;
        mostUsedSkill: string | null;
      }>(response);
      setRoomStats(data);
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  // 更新场景描述
  const updateSceneDesc = async (desc: string) => {
    try {
      await apiFetch(`/rooms/${roomId}/atmosphere`, {
        method: 'PATCH',
        body: JSON.stringify({ sceneDesc: desc }),
      });
      setSceneDesc(desc);
    } catch (error) {
      console.error('更新场景描述失败:', error);
    }
  };

  // 更新成员状态标记
  const updateMemberStatus = async (memberId: string, tags: string[]) => {
    try {
      await apiFetch(`/rooms/${roomId}/members/${memberId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ statusTags: tags }),
      });
      setMemberStatuses(prev => ({ ...prev, [memberId]: tags }));
    } catch (error) {
      console.error('更新状态标记失败:', error);
    }
  };

  const fetchMyCharacters = async () => {
    try {
      const response = await apiFetch('/characters');
      const data = await handleApiResponse<{ characters: any[] }>(response);
      setMyCharacters(data.characters);
      setShowCharacterModal(true);
    } catch (error) {
      console.error('获取角色卡失败:', error);
    }
  };

  const handleLeaveRoom = async () => {
    if (!confirm('确定要离开这个房间吗？')) return;
    try {
      await apiFetch(`/rooms/${roomId}/leave`, { method: 'POST' });
      navigate('/rooms');
    } catch (error: any) {
      alert(error.message || '离开房间失败');
    }
  };

  const handleCloseRoom = async () => {
    if (!confirm('确定要关闭这个房间吗？此操作不可撤销。')) return;
    try {
      await apiFetch(`/rooms/${roomId}/close`, { method: 'POST' });
      navigate('/rooms');
    } catch (error: any) {
      alert(error.message || '关闭房间失败');
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || !connected) return;
    const privateTargetUserId = canSendPrivateMessage && chatTargetUserId !== 'public'
      ? chatTargetUserId
      : undefined;
    const sendChatText = (content: string, characterId?: string) => {
      socketSendMessage(
        content,
        characterId,
        privateTargetUserId ? false : isSecretDice,
        privateTargetUserId ? 'private' : undefined,
        privateTargetUserId,
      );
    };

    // 解析快捷命令
    if (inputMessage.startsWith('/骰 ')) {
      const skillName = inputMessage.slice(3).trim();
      // 从角色技能中查找
      const skills = selectedCharacter?.skills
        ? typeof selectedCharacter.skills === 'string'
          ? JSON.parse(selectedCharacter.skills)
          : selectedCharacter.skills
        : {};
      const skillValue = skills[skillName] || 50;
      handleRollDice(skillName, skillValue);
      setInputMessage('');
      return;
    }

    if (inputMessage === '/状态') {
      if (selectedCharacter) {
        const statusMsg = `【状态】HP: ${selectedCharacter.hp}/${selectedCharacter.maxHp || selectedCharacter.hp} | MP: ${selectedCharacter.mp}/${selectedCharacter.maxMp || selectedCharacter.mp} | SAN: ${selectedCharacter.san}/${selectedCharacter.maxSan || selectedCharacter.san}`;
        sendChatText(statusMsg, selectedCharacter?.id);
      }
      setInputMessage('');
      return;
    }

    // KP 专属指令
    if (canUseKPTools) {
      if (inputMessage === '/结束战斗') {
        socket.current?.emit('combat:end', { roomId });
        setInputMessage('');
        return;
      }
      if (inputMessage.startsWith('/场景 ')) {
        const desc = inputMessage.slice(4).trim();
        updateSceneDesc(desc);
        setInputMessage('');
        return;
      }
    }

    // 通用简易骰子（如 1d4, 2d6, 1d100）
    const simpleDiceMatch = inputMessage.trim().match(/^(\d+)d(\d+)$/i);
    if (simpleDiceMatch) {
      const count = parseInt(simpleDiceMatch[1], 10);
      const sides = parseInt(simpleDiceMatch[2], 10);
      if (count >= 1 && count <= 100 && sides >= 1 && sides <= 10000) {
        handleGenericRoll(`${count}d${sides}`);
        setInputMessage('');
        return;
      }
    }

    // 带技能名的骰子（如 "侦查 1d100 60" 或 "1d100 侦查 60"）
    const namedDiceMatch1 = inputMessage.trim().match(/^(.*?)\s+(\d+)d(\d+)(?:\s+(\d+))?$/i);
    const namedDiceMatch2 = inputMessage.trim().match(/^(\d+)d(\d+)\s+(.*?)(?:\s+(\d+))?$/i);
    const namedMatch = namedDiceMatch1 || namedDiceMatch2;
    if (namedMatch) {
      let skillName = '';
      let rollType = '';
      let targetValue: number | undefined;
      if (namedDiceMatch1) {
        skillName = namedDiceMatch1[1].trim();
        rollType = `${namedDiceMatch1[2]}d${namedDiceMatch1[3]}`;
        targetValue = namedDiceMatch1[4] ? parseInt(namedDiceMatch1[4], 10) : undefined;
      } else if (namedDiceMatch2) {
        rollType = `${namedDiceMatch2[1]}d${namedDiceMatch2[2]}`;
        skillName = namedDiceMatch2[3].trim();
        targetValue = namedDiceMatch2[4] ? parseInt(namedDiceMatch2[4], 10) : undefined;
      }
      const count = parseInt(rollType.match(/^(\d+)d/)?.[1] || '1', 10);
      const sides = parseInt(rollType.match(/^\d+d(\d+)$/)?.[1] || '100', 10);
      if (count >= 1 && count <= 100 && sides >= 1 && sides <= 10000 && skillName) {
        handleGenericRoll(rollType, skillName, targetValue);
        setInputMessage('');
        return;
      }
    }

    sendChatText(inputMessage, selectedCharacter?.id);
    setInputMessage('');
  };

  const handleRollDice = (skillName: string, skillValue: number) => {
    if (!connected) return;

    socketRollDice({
      rollType: '1D100',
      targetName: skillName,
      targetValue: skillValue,
      characterId: selectedCharacter?.id,
      isSecret: isSecretDice,
    });
  };

  const handleUpdateQuickSkills = async (skills: string[]) => {
    if (!selectedCharacter?.id) return;
    try {
      await apiFetch(`/characters/${selectedCharacter.id}/quick-skills`, {
        method: 'PATCH',
        body: JSON.stringify({ quickSkills: skills }),
      });
      setSelectedCharacter({ ...selectedCharacter, quickSkills: JSON.stringify(skills) });
    } catch (error) {
      console.error('更新快捷技能失败:', error);
    }
  };

  const handleGenericRoll = (rollType: string, skillName?: string, skillValue?: number) => {
    if (!connected) return;

    socketRollDice({
      rollType: rollType.toUpperCase(),
      targetName: skillName,
      targetValue: skillValue,
      characterId: selectedCharacter?.id,
      isSecret: isSecretDice,
    });
  };

  const handleKeeperQuickRoll = () => {
    if (!connected || !canUseKPTools) return;

    socketRollDice({
      rollType: '1D100',
      targetName: isSecretDice ? 'KP暗骰' : 'KP公开骰',
      characterId: undefined,
      isSecret: isSecretDice,
    });
  };

  // 战斗操作
  const handleStartCombat = () => {
    socket.current?.emit('combat:start', { roomId });
  };

  const handleAttack = () => {
    if (!attackTarget) return;

    socket.current?.emit('combat:attack', {
      roomId,
      targetUserId: attackTarget,
      useEquippedWeapon: true,
    });
    setShowAttackModal(false);
  };

  const handleNextTurn = () => {
    socket.current?.emit('combat:next_turn', { roomId });
  };

  const handleEndCombat = () => {
    socket.current?.emit('combat:end', { roomId });
  };

  const openMyCharacter = () => {
    const myMember = room?.members?.find((m) => m.userId === user?.id);
    if (myMember) {
      setSelectedMember(myMember);
      setShowMemberDetail(true);
    } else {
      setShowMobileMembers(true);
    }
  };

  const isMyTurn = combatState?.status === 'IN_PROGRESS' && combatState.turnOrder[combatState.currentTurnIndex]?.userId === user?.id;
  const phaseSteps = room?.phases?.length
    ? room.phases.slice(0, 4).map((phase, index) => ({
        label: phase.title,
        active: room.currentPhase?.id === phase.id || (!room.currentPhase && index === 0),
      }))
    : [
        { label: '准备阶段', active: room?.lifecycle === 'PREPARING' },
        { label: '探索阶段', active: room?.lifecycle === 'IN_PROGRESS' || room?.lifecycle === 'PAUSED' || !room?.lifecycle },
        { label: '调查阶段', active: activeTab === 'chat' },
        { label: '结算阶段', active: room?.lifecycle === 'FINISHING' || room?.lifecycle === 'FINISHED' },
      ];
  const roleLabel = room?.myRole === 'OWNER_KP'
    ? '守密人'
    : room?.myRole === 'ASSISTANT_KP'
      ? '助理 KP'
    : room?.myRole === 'PLAYER'
      ? '调查员'
      : room?.myRole === 'OBSERVER'
        ? '观众'
        : '访客';
  const mobileActiveMemberCount = room?.members?.filter(member => member.role !== 'OBSERVER').length ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-coc-accent-red border-t-transparent" />
      </div>
    );
  }

  return (
      <div
        data-testid="room-gameplay-shell"
        data-mobile-mobile-first-room={isMobile ? 'true' : undefined}
        data-mobile-room-role={isMobile ? (canUseKPTools ? 'keeper' : 'player') : undefined}
      className={cn("room-gameplay-shell room-visual-rebuild room-shell-v3 flex flex-col", isMobile ? "h-[calc(100dvh-1rem)]" : "h-[calc(100dvh-2.5rem)]")}
    >
      {/* 头部 */}
      <Surface
        variant="panel"
        padding="sm"
        data-testid={isMobile ? 'room-mobile-play-header' : 'room-desktop-header'}
        className={cn(
          'room-gameplay-topbar relative z-50 flex items-center',
          isMobile
            ? 'room-mobile-chat-header mb-1 w-full'
            : 'mb-4 justify-between'
        )}
      >
        <div className={cn("flex items-center", isMobile ? "w-full gap-2" : "gap-4")}>
          {isMobile ? (
            <div className="room-mobile-chat-header__bar">
              <Link
                to="/rooms"
                aria-label="返回房间列表"
                className="room-mobile-chat-header__back"
              >
                <ArrowLeft size={21} />
              </Link>
              <div className="room-mobile-chat-header__title">
                <div className="room-mobile-chat-header__title-row">
                  <span
                    className="room-mobile-chat-header__connection"
                    data-status={connected ? 'connected' : 'disconnected'}
                    aria-label={connected ? '房间已连接' : '房间未连接'}
                    title={connected ? '已连接' : '未连接'}
                  >
                    <i aria-hidden="true" />
                  </span>
                  <strong>{room?.name || `房间 ${room?.roomId || roomId || ''}`}</strong>
                </div>
                <small data-room-mobile-title="true">
                  <span>{mobileActiveMemberCount} 人</span>
                  <span>{connected ? '在线' : '重连中'}</span>
                  <span>#{room?.roomId || roomId}</span>
                </small>
              </div>
              <button
                type="button"
                data-testid="room-mobile-action-drawer-toggle"
                className="room-mobile-chat-header__more"
                aria-controls="room-mobile-tools-sheet"
                aria-expanded={showMobileActionDrawer}
                onClick={toggleMobileActionDrawer}
              >
                <MoreHorizontal size={22} />
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/rooms"
                aria-label="返回房间列表"
                className="rounded border border-[#3a3a3a]/60 p-2 text-[#c9a227] transition-all hover:border-[#c9a227]/50 hover:bg-[#c9a227]/10"
              >
                <ArrowLeft size={20} />
              </Link>
              <div className="room-topnav-v4__brand">
                <span className="room-topnav-v4__logo-mark">
                  <img src="/images/logo-sunken-gothic-cutout.png" alt="沉没之城" />
                </span>
              </div>
            </>
          )}
        </div>

        {!isMobile && (
          <div className="room-topnav-v4__desktop hidden md:grid">
            <div className="room-topnav-v4__room">
              <span className="room-topnav-v4__room-kicker">房间名</span>
              <strong
                data-room-title="true"
                data-room-connection-status={connected ? 'connected' : 'disconnected'}
                aria-label={connected ? '房间已连接' : '房间未连接'}
                title={connected ? '已连接' : '未连接'}
              >
                {room?.name || `房间 ${room?.roomId || roomId || ''}`}
              </strong>
              <small>房间号：{room?.roomId || roomId}</small>
            </div>

            <div className="room-topnav-v4__phases">
              {phaseSteps.map((phase) => (
                <div
                  key={phase.label}
                  className={cn('room-topnav-v4__phase', phase.active && 'room-topnav-v4__phase--active')}
                >
                  <span />
                  {phase.label}
                </div>
              ))}
            </div>

            <div className="room-topnav-v4__actions">
              <button type="button" className="room-topnav-v4__pill">
                <Crown size={14} />
                角色：{roleLabel}
              </button>
              <button type="button" className="room-topnav-v4__pill">
                <Users size={14} />
                观众：{room?.members?.filter(member => member.role === 'OBSERVER').length ?? 0} 人
              </button>
              <button onClick={handleLeaveRoom} className="room-topnav-v4__leave">
                <DoorOpen size={14} />
                离开
              </button>
              {caps?.canCloseRoom === true && (
                <button onClick={handleCloseRoom} className="room-topnav-v4__danger">
                  关闭
                </button>
              )}
            </div>
          </div>
        )}

      </Surface>

      {isMobile && room && (
        <section
          data-testid="room-mobile-scene-card"
          className="room-mobile-chat-meta-strip room-mobile-scene-card"
          aria-expanded={showSceneBanner}
        >
          <button
            type="button"
            className="room-mobile-scene-card__summary"
            onClick={() => setShowSceneBanner((visible) => !visible)}
          >
            <span>
              <BookOpen size={15} />
              当前场景
            </span>
            <strong>{room.currentScene?.title || room.currentPhase?.title || '自由模式'}</strong>
            {showSceneBanner ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {showSceneBanner && (
            <div className="room-mobile-scene-card__body">
              <p>{sceneDesc || room.currentScene?.description || '当前还没有公开场景描述。'}</p>
              <div className="room-mobile-scene-card__meta">
                <span>{room.currentScene?.atmosphere || room.currentPhase?.title || '调查中'}</span>
                {canUseKPTools && (
                  <button type="button" onClick={() => openInvestigationDock('scenes')}>
                    编辑场景
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {room && canUseKPTools && (
        <div className="room-gameplay-status-row mb-3 flex flex-wrap items-center gap-2">
          <RoomLifecycleBanner
            lifecycle={room.lifecycle}
            myRole={room.myRole}
            className="flex-1"
          />
          <KpLifecycleControls
            roomId={roomId || ''}
            capabilities={caps}
            lifecycle={room.lifecycle}
            onChanged={fetchRoom}
          />
        </div>
      )}

      {room?.lifecycle === 'FINISHING' && caps?.canFinalizeRoom && (
        <Suspense fallback={null}>
          <RoomSettlementPanel
            roomId={roomId || ''}
            onFinalized={fetchRoom}
          />
        </Suspense>
      )}

      {isMobile && canUseKPTools && (
        <nav
          className="room-mobile-bottom-dock room-mobile-bottom-dock--keeper"
          aria-label="房间快捷操作"
        >
          <button
            type="button"
            data-room-mobile-dock-action="true"
            data-room-mobile-kp-lite-action="true"
            data-active={activeTab === 'chat' ? 'true' : 'false'}
            onClick={() => {
              closeMobileActionSurfaces();
              setActiveTab('chat');
            }}
          >
            <ScrollText size={17} />
            <span>记录</span>
          </button>
          <button
            type="button"
            data-room-mobile-dock-action="true"
            data-room-mobile-kp-lite-action="true"
            onClick={() => {
              closeMobileActionSurfaces();
              setActiveTab('chat');
              setShowKpDicePanel(true);
            }}
          >
            <Dice5 size={17} />
            <span>投骰</span>
          </button>
            <button
              type="button"
              data-room-mobile-dock-action="true"
              data-room-mobile-kp-lite-action="true"
              data-active={showMobileActionDrawer ? 'true' : 'false'}
              aria-controls="room-mobile-tools-sheet"
              aria-expanded={showMobileActionDrawer}
              onClick={toggleMobileActionDrawer}
            >
              {showMobileActionDrawer ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
              <span>{canUseKPTools ? '工具' : '行动'}</span>
            </button>
        </nav>
      )}

      {isMobile && showMobileActionDrawer && (
        <>
          <button
            type="button"
            className="room-mobile-tools-backdrop"
            aria-label="关闭房间工具抽屉"
            onClick={closeMobileActionSurfaces}
          />
          <section
            id="room-mobile-tools-sheet"
            data-testid="room-mobile-tools-sheet"
            className="room-mobile-tools-sheet"
            aria-label={canUseKPTools ? '守密人工具抽屉' : '调查员工具抽屉'}
          >
            <header className="room-mobile-tools-sheet__header">
              <div>
                <span>{canUseKPTools ? 'KP' : '行动'}</span>
                <h3>{canUseKPTools ? '守密人工具' : '调查员行动'}</h3>
              </div>
              <button
                type="button"
                aria-label="收起工具抽屉"
                onClick={closeMobileActionSurfaces}
              >
                <ChevronDown size={18} />
              </button>
            </header>

            <RoomVoicePanel roomId={roomId || ''} compact className="room-mobile-tools-sheet__voice" />

            {!canUseKPTools && (
              <section className="room-mobile-tools-sheet__quick-rolls" aria-label="移动端常用检定">
                <header>
                  <span>常用检定</span>
                  <b>{selectedCharacter ? selectedCharacter.name || '调查员' : '未绑定角色'}</b>
                </header>
                {selectedCharacter ? (
                  <QuickRollBar
                    quickSkills={playerQuickSkills}
                    characterSkills={playerCharacterSkills}
                    onRoll={(skillName, skillValue) => {
                      handleRollDice(skillName, skillValue);
                      setActiveTab('chat');
                      closeMobileActionSurfaces();
                    }}
                    onUpdateQuickSkills={handleUpdateQuickSkills}
                    isEditable
                    compact
                    desktopPageSize={5}
                  />
                ) : (
                  <button
                    type="button"
                    className="room-mobile-tools-sheet__quick-rolls-empty"
                    onClick={() => {
                      openMyCharacter();
                      closeMobileActionSurfaces();
                    }}
                  >
                    <User size={15} />
                    <span>选择角色后可进行常用检定</span>
                  </button>
                )}
              </section>
            )}

            <div className={cn('room-mobile-tools-sheet__grid room-mobile-tools-sheet__primary', !canUseKPTools && 'room-mobile-tools-sheet__primary--player')}>
              {canUseKPTools ? (
                <>
                  <button
                    type="button"
                    className="room-mobile-tool-tile"
                    data-room-mobile-action="true"
                    data-room-mobile-kp-lite-action="true"
                    data-mobile-tool-id="members"
                    onClick={() => {
                      setShowMobileMembers(true);
                      closeMobileActionSurfaces();
                    }}
                  >
                    <span className="room-mobile-tool-tile__icon"><Users size={20} /></span>
                    <span>成员</span>
                  </button>
                  <button
                    type="button"
                    className="room-mobile-tool-tile"
                    data-room-mobile-action="true"
                    data-room-mobile-kp-lite-action="true"
                    data-mobile-tool-id="scene"
                    onClick={() => {
                      openInvestigationDock('scenes');
                      closeMobileActionSurfaces();
                    }}
                  >
                    <span className="room-mobile-tool-tile__icon"><BookOpen size={20} /></span>
                    <span>场景</span>
                  </button>
                  <button
                    type="button"
                    className="room-mobile-tool-tile"
                    data-room-mobile-action="true"
                    data-room-mobile-kp-lite-action="true"
                    data-mobile-tool-id="clues"
                    onClick={() => {
                      openInvestigationDock('clues');
                      closeMobileActionSurfaces();
                    }}
                  >
                    <span className="room-mobile-tool-tile__icon"><Search size={20} /></span>
                    <span>线索</span>
                  </button>
                  <button
                    type="button"
                    className="room-mobile-tool-tile"
                    data-room-mobile-action="true"
                    data-room-mobile-kp-lite-action="true"
                    data-mobile-tool-id="npc"
                    onClick={() => {
                      openInvestigationDock('npcs');
                      closeMobileActionSurfaces();
                    }}
                  >
                    <span className="room-mobile-tool-tile__icon"><User size={20} /></span>
                    <span>NPC</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="room-mobile-tool-tile"
                    data-room-mobile-action="true"
                    data-room-mobile-pl-primary-action="true"
                    data-mobile-tool-id="character"
                    onClick={() => {
                      openMyCharacter();
                      closeMobileActionSurfaces();
                    }}
                  >
                    <span className="room-mobile-tool-tile__icon"><User size={20} /></span>
                    <span>角色</span>
                  </button>
                  {canViewInvestigation && (
                    <button
                      type="button"
                      className="room-mobile-tool-tile"
                      data-room-mobile-action="true"
                      data-room-mobile-pl-primary-action="true"
                      data-mobile-tool-id="clues"
                      onClick={() => {
                        openInvestigationDock('clues');
                        closeMobileActionSurfaces();
                      }}
                    >
                      <span className="room-mobile-tool-tile__icon"><Search size={20} /></span>
                      <span>线索</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="room-mobile-tool-tile"
                    data-room-mobile-action="true"
                    data-room-mobile-pl-primary-action="true"
                    data-mobile-tool-id="members"
                    onClick={() => {
                      setShowMobileMembers(true);
                      closeMobileActionSurfaces();
                    }}
                  >
                    <span className="room-mobile-tool-tile__icon"><Users size={20} /></span>
                    <span>成员</span>
                  </button>
                  <button
                    type="button"
                    className="room-mobile-tool-tile"
                    data-room-mobile-action="true"
                    data-room-mobile-pl-primary-action="true"
                    data-mobile-tool-id="notes"
                    onClick={() => {
                      setFloatingToolPanel('notes', showNotesPanel, setShowNotesPanel, true);
                      closeMobileActionSurfaces();
                    }}
                  >
                    <span className="room-mobile-tool-tile__icon"><BookOpen size={20} /></span>
                    <span>笔记</span>
                  </button>
                  <button
                    type="button"
                    className="room-mobile-tool-tile"
                    data-room-mobile-action="true"
                    data-room-mobile-pl-primary-action="true"
                    data-mobile-tool-id="subrooms"
                    onClick={() => {
                      setFloatingToolPanel('subRooms', showSubRooms, setShowSubRooms, true);
                      closeMobileActionSurfaces();
                    }}
                  >
                    <span className="room-mobile-tool-tile__icon"><GitBranch size={20} /></span>
                    <span>子房间</span>
                  </button>
                  {canViewInvestigation && (
                    <button
                      type="button"
                      className="room-mobile-tool-tile"
                      data-room-mobile-action="true"
                      data-room-mobile-pl-primary-action="true"
                      data-mobile-tool-id="archive"
                      onClick={() => {
                        openInvestigationDock('scenes');
                        closeMobileActionSurfaces();
                      }}
                    >
                      <span className="room-mobile-tool-tile__icon"><Archive size={20} /></span>
                      <span>档案</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="room-mobile-tool-tile"
                    data-room-mobile-action="true"
                    data-room-mobile-pl-primary-action="true"
                    data-mobile-tool-id="more"
                    aria-expanded={showMobileToolTray}
                    onClick={() => setShowMobileToolTray((v) => !v)}
                  >
                    <span className="room-mobile-tool-tile__icon"><ChevronDown size={20} /></span>
                    <span>更多</span>
                  </button>
                </>
              )}
            </div>

            {!canUseKPTools && showMobileToolTray && (
              <div className="room-mobile-tools-sheet__grid room-mobile-tools-sheet__secondary">
                <button
                  type="button"
                  className="room-mobile-tool-tile"
                  data-room-mobile-action="true"
                  data-mobile-tool-id="combat"
                  onClick={() => {
                    setActiveTab(activeTab === 'chat' ? 'combat' : 'chat');
                    closeMobileActionSurfaces();
                  }}
                >
                  <span className="room-mobile-tool-tile__icon"><Swords size={20} /></span>
                  <span>{activeTab === 'chat' ? '战斗视图' : '聊天视图'}</span>
                </button>
                <button
                  type="button"
                  className="room-mobile-tool-tile"
                  data-room-mobile-action="true"
                  data-mobile-tool-id="npc"
                  onClick={() => {
                    openInvestigationDock('npcs');
                    closeMobileActionSurfaces();
                  }}
                >
                  <span className="room-mobile-tool-tile__icon"><User size={20} /></span>
                  <span>NPC</span>
                </button>
                <Link to={`/rooms/${roomId}/report`} className="room-mobile-tool-tile" data-room-mobile-action="true" data-mobile-tool-id="report" onClick={closeMobileActionSurfaces}>
                  <span className="room-mobile-tool-tile__icon"><FileText size={20} /></span>
                  <span>报告</span>
                </Link>
                <Link to={`/rooms/${roomId}/dice-history`} className="room-mobile-tool-tile" data-room-mobile-action="true" data-mobile-tool-id="dice-history" onClick={closeMobileActionSurfaces}>
                  <span className="room-mobile-tool-tile__icon"><History size={20} /></span>
                  <span>投骰历史</span>
                </Link>
                <button
                  type="button"
                  className="room-mobile-tool-tile"
                  data-room-mobile-action="true"
                  data-mobile-tool-id="combat-log"
                  onClick={() => {
                    setShowCombatTimeline(true);
                    closeMobileActionSurfaces();
                  }}
                >
                  <span className="room-mobile-tool-tile__icon"><ScrollText size={20} /></span>
                  <span>战斗记录</span>
                </button>
                <button type="button" className="room-mobile-tool-tile" data-room-mobile-action="true" data-mobile-tool-id="leave" data-danger="true" onClick={handleLeaveRoom}>
                  <span className="room-mobile-tool-tile__icon"><DoorOpen size={20} /></span>
                  <span>离开房间</span>
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {/* 主内容区 */}
      <div className={cn("room-gameplay-body flex-1 flex flex-row min-h-0 overflow-hidden", isMobile && "room-mobile-information-panels")}>
        <div
          className={cn(
            "room-gameplay-content flex-1 flex min-h-0 overflow-hidden",
            !canUseKPTools && "room-gameplay-content--player",
            roomLeftPanelCollapsed && "room-gameplay-content--left-collapsed",
            !showDesktopCommandRail && "room-gameplay-content--right-collapsed",
            !showSceneBanner && "room-gameplay-content--scene-collapsed"
          )}
        >
          {!canUseKPTools && room ? (
            <RoomPlayerView
              room={room}
              roomId={roomId || ''}
              currentUserId={user?.id}
              selectedCharacter={selectedCharacter}
              messages={messages}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              connected={connected}
              isMobile={isMobile}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              combatState={combatState}
              isMyTurn={isMyTurn}
              sceneDescription={sceneDesc}
              showSceneBanner={showSceneBanner}
              onToggleSceneBanner={() => setShowSceneBanner((visible) => !visible)}
              showChatTools={showChatTools}
              setShowChatTools={setShowChatTools}
              showMobileQuickRolls={showMobileQuickRolls}
              setShowMobileQuickRolls={setShowMobileQuickRolls}
              onOpenMobileActionDrawer={toggleMobileActionDrawer}
              canSendPrivateMessage={canSendPrivateMessage}
              sendTargetUserId={chatTargetUserId}
              onSendTargetChange={setChatTargetUserId}
              onSubmitMessage={handleSendMessage}
              onRollSkill={handleRollDice}
              onUpdateQuickSkills={handleUpdateQuickSkills}
              messagesEndRef={messagesEndRef}
              clues={clues}
              onMarkClue={addClue}
              onArchiveImportantMessage={(msg, displayName) => void handleArchiveImportantMessage(msg, displayName)}
              onArchiveKeyDice={(msg, displayName) => void handleArchiveKeyDice(msg, displayName)}
              onOpenCharacter={openMyCharacter}
              onOpenClues={() => openInvestigationDock('clues')}
              onOpenNpc={() => openInvestigationDock('npcs')}
              canViewInvestigation={canViewInvestigation}
              setShowInvestigationDock={(updater) => {
                const nextValue = typeof updater === 'function' ? updater(showInvestigationDock) : updater;
                if (nextValue) {
                  openInvestigationDock('scenes');
                } else {
                  setShowInvestigationDock(false);
                }
              }}
              setShowNotesPanel={(updater) => setFloatingToolPanel('notes', showNotesPanel, setShowNotesPanel, updater)}
              setShowSubRooms={(updater) => setFloatingToolPanel('subRooms', showSubRooms, setShowSubRooms, updater)}
              setShowCombatTimeline={setShowCombatTimeline}
              onSelectMember={(member) => {
                setSelectedMember(member);
                setShowMemberDetail(true);
              }}
            />
          ) : (
            <>
          <RoomParticipantRail
            roomCode={room?.roomId || roomId}
            members={room?.members || []}
            currentUserId={user?.id}
            selectedCharacter={selectedCharacter}
            memberStatuses={memberStatuses}
            isCollapsed={roomLeftPanelCollapsed}
            isMobile={isMobile}
            activeTab={activeTab}
            canUseKPTools={canUseKPTools}
            combatState={combatState}
            isMyTurn={isMyTurn}
            onToggleCollapsed={toggleRoomLeftPanel}
            onSelectMember={(member) => {
              setSelectedMember(member);
              setShowMemberDetail(true);
            }}
            onUpdateMemberStatus={updateMemberStatus}
            onStartCombat={handleStartCombat}
            onOpenAttackModal={() => setShowAttackModal(true)}
            onNextTurn={handleNextTurn}
            onEndCombat={handleEndCombat}
          />

        {/* 右侧：聊天/战斗区 */}
        <div className={cn(
          "room-stage room-stage-v3 flex-1 flex flex-col min-h-0 overflow-hidden",
          isMobile ? "room-mobile-keeper-stage pl-0" : "pl-3"
        )}>
          {activeTab === 'chat' ? (
            <Surface
              variant="solid"
              padding="none"
              className={cn("room-stage-surface room-stage-surface-v3 flex-1 flex flex-col min-h-0 overflow-hidden", isMobile ? "p-1" : "p-4")}
            >
              {!isMobile && (
                <RoomSceneBanner
                  room={room}
                  sceneDescription={sceneDesc}
                  canEdit={canUseKPTools}
                  onEdit={() => openInvestigationDock('scenes')}
                  isCollapsed={!showSceneBanner}
                  onToggleCollapsed={() => setShowSceneBanner((visible) => !visible)}
                />
              )}

              <RoomChatTranscript
                messages={messages}
                members={room?.members || []}
                currentUserId={user?.id}
                isMobile={isMobile}
                canUseKPTools={canUseKPTools}
                messagesEndRef={messagesEndRef}
                onArchiveImportantMessage={(msg, displayName) => void handleArchiveImportantMessage(msg, displayName)}
                onArchiveKeyDice={(msg, displayName) => void handleArchiveKeyDice(msg, displayName)}
                onMarkClue={addClue}
              />

              <div className="room-bottom-command-deck flex-shrink-0">
                <RoomChatComposer
                  value={inputMessage}
                  onChange={setInputMessage}
                  members={room?.members || []}
                  currentUserId={user?.id}
                  connected={connected}
                  isMobile={isMobile}
                  showChatTools={showChatTools}
                  setShowChatTools={setShowChatTools}
                  hasSelectedCharacter={!!selectedCharacter}
                  showMobileQuickRolls={showMobileQuickRolls}
                  setShowMobileQuickRolls={setShowMobileQuickRolls}
                  onOpenMobileActionDrawer={toggleMobileActionDrawer}
                  canUseKPTools={canUseKPTools}
                  canSendPrivateMessage={canSendPrivateMessage}
                  sendTargetUserId={chatTargetUserId}
                  onSendTargetChange={setChatTargetUserId}
                  onOpenSanityModal={() => {
                    const initial: Record<string, number> = {};
                    room?.members.forEach(m => {
                      if (m.character) initial[m.userId] = 0;
                    });
                    setSanityTargets(initial);
                    setSanityDescription('');
                    setShowSanityModal(true);
                  }}
                  onSubmit={handleSendMessage}
                />

                {canUseKPTools ? (
                  <RoomKeeperRollDock
                    connected={connected}
                    isSecretDice={isSecretDice}
                    onToggleSecretDice={() => setIsSecretDice(!isSecretDice)}
                    onQuickRoll={handleKeeperQuickRoll}
                    onOpenFull={() => setShowKpDicePanel(true)}
                  />
                ) : selectedCharacter && (!isMobile || showMobileQuickRolls) && (
                  <div className="room-quick-roll-tray">
                    <QuickRollBar
                      quickSkills={playerQuickSkills}
                      characterSkills={playerCharacterSkills}
                      onRoll={(skillName, skillValue) => {
                        handleRollDice(skillName, skillValue);
                        if (isMobile) setShowMobileQuickRolls(false);
                      }}
                      onUpdateQuickSkills={handleUpdateQuickSkills}
                      isEditable={true}
                      compact={isMobile}
                    />
                  </div>
                )}
              </div>
            </Surface>
          ) : (
            /* 战斗面板 */
            <Surface
              variant="solid"
              tone="blood"
              padding="none"
              className={cn("room-stage-surface room-stage-surface--combat flex-1 flex flex-col min-h-0 overflow-hidden", isMobile ? "p-1" : "p-4")}
            >
              {!combatState || combatState.status === 'IDLE' ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Swords size={48} className="mx-auto mb-4" style={{ color: "#6b6558" }} />
                    <p style={{ color: "#8b8375" }}>战斗未开始</p>
                    {canUseKPTools && (
                      <MagneticButton
                        variant="blood"
                        size="sm"
                        onClick={handleStartCombat}
                        className="mt-4"
                      >
                        开始战斗
                      </MagneticButton>
                    )}
                  </div>
                </div>
              ) : combatState.status === 'ENDED' ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p style={{ color: "#8b8375" }}>战斗已结束</p>
                    {canUseKPTools && (
                      <MagneticButton
                        variant="blood"
                        size="sm"
                        onClick={handleStartCombat}
                        className="mt-4"
                      >
                        开始新战斗
                      </MagneticButton>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* 战斗状态 */}
                  <div className="p-4 border-b border-[#3a3a3a]/40 backdrop-blur-sm bg-black/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold" style={{ color: "#a63848" }}>第 {combatState.currentRound} 回合</span>
                        <span className="mx-2">|</span>
                        <span style={{ color: "#e8d4a0" }}>当前: {combatState.turnOrder[combatState.currentTurnIndex]?.nickname}</span>
                      </div>
                      {isMyTurn && <span className="animate-pulse font-medium" style={{ color: "#c9a227" }}>你的回合</span>}
                    </div>
                  </div>

                  {/* 行动顺序 */}
                  <div className="p-4 border-b border-[#3a3a3a]/40 backdrop-blur-sm bg-black/10">
                    <h4 className="text-sm mb-2" style={{ color: "#6b6558" }}>行动顺序</h4>
                    <div className="flex gap-2 overflow-x-auto">
                      {combatState.turnOrder.map((c, i) => (
                        <div
                          key={c.userId}
                          className={`flex-shrink-0 p-2 rounded border transition-all ${
                            i === combatState.currentTurnIndex
                              ? 'bg-[#a63848]/20 border-[#a63848]/60 text-[#e8d4a0] shadow-[0_0_8px_rgba(166,56,72,0.3)]'
                              : 'bg-black/20 border-[#3a3a3a]/40 text-[#8b8375]'
                          }`}
                        >
                          <div className="text-sm font-medium">{c.nickname}</div>
                          <div className="text-xs">HP: {c.hp}/{c.maxHp}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 战斗日志 */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 backdrop-blur-sm bg-black/10">
                    {combatState.log.map((entry) => (
                      <div key={entry.id} className="text-sm">
                        <span style={{ color: "#6b6558" }}>[{entry.round}]</span>{' '}
                        <span style={{ color: "#c9a227" }}>{entry.actor}</span>{' '}
                        <span>{entry.action}</span>
                        {entry.target && <span style={{ color: "#4db8b8" }}> → {entry.target}</span>}
                        <span style={{ color: "#8b8375" }}>: {entry.result}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Surface>
          )}
        </div>
        {!isMobile && showDesktopCommandRail ? (
          <Suspense fallback={<aside className="room-command-rail room-command-rail--loading">工具台加载中...</aside>}>
            <RoomCommandRail
              roomId={roomId || ''}
              members={room?.members || []}
              currentUserId={user?.id}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              roomLeftPanelCollapsed={roomLeftPanelCollapsed}
              toggleRoomLeftPanel={toggleRoomLeftPanel}
              canViewInvestigation={canViewInvestigation}
              showInvestigationDock={showInvestigationDock}
              setShowInvestigationDock={(updater) => {
                const nextValue = typeof updater === 'function' ? updater(showInvestigationDock) : updater;
                if (nextValue) {
                  openInvestigationDock('scenes');
                } else {
                  setShowInvestigationDock(false);
                }
              }}
              showCluePanel={showCluePanel}
              setShowCluePanel={(updater) => setFloatingToolPanel('clues', showCluePanel, setShowCluePanel, updater)}
              showNpcPanel={showNpcPanel}
              setShowNpcPanel={(updater) => setFloatingToolPanel('npc', showNpcPanel, setShowNpcPanel, updater)}
              showCombatTimeline={showCombatTimeline}
              setShowCombatTimeline={setShowCombatTimeline}
              showNotesPanel={showNotesPanel}
              setShowNotesPanel={(updater) => setFloatingToolPanel('notes', showNotesPanel, setShowNotesPanel, updater)}
              showSubRooms={showSubRooms}
              setShowSubRooms={(updater) => setFloatingToolPanel('subRooms', showSubRooms, setShowSubRooms, updater)}
              showLogPanel={showLogPanel}
              setShowLogPanel={(updater) => setFloatingToolPanel('log', showLogPanel, setShowLogPanel, updater)}
              showEventLog={showEventLog}
              setShowEventLog={(updater) => setFloatingToolPanel('eventLog', showEventLog, setShowEventLog, updater)}
              showStats={showStats}
              onToggleStats={() => {
                fetchRoomStats();
                setShowStats((value) => {
                  const nextValue = !value;
                  if (nextValue) {
                    closeFloatingToolPanels();
                  }
                  return nextValue;
                });
              }}
              canUseKPTools={canUseKPTools}
              showGMKit={showGMKit}
              setShowGMKit={(updater) => setFloatingToolPanel('gmKit', showGMKit, setShowGMKit, updater)}
              showKpDicePanel={showKpDicePanel}
              onOpenKpDicePanel={() => setShowKpDicePanel(true)}
              onOpenInvestigationTab={openInvestigationDock}
              onRequestClose={() => setShowDesktopCommandRail(false)}
              voicePanel={<RoomVoicePanel roomId={roomId || ''} />}
            />
          </Suspense>
        ) : !isMobile ? (
          <button
            type="button"
            className="room-rail-reopen room-rail-reopen--right"
            onClick={() => setShowDesktopCommandRail(true)}
            aria-label="展开工具台"
          >
            <PanelRightOpen size={18} />
            <span>工具台</span>
          </button>
        ) : null}
            </>
          )}
      </div>
      {(showLogPanel || showSubRooms || showEventLog || showGMKit || showNpcPanel || showCluePanel || showNotesPanel) && (
        <div
          className={cn('room-side-tool-drawer', isMobile && 'room-mobile-layer-panel')}
          data-room-side-tool-drawer="true"
        >
          {showLogPanel && (
            <Suspense fallback={null}>
              <RoomLogPanel
                roomId={roomId || ''}
                isOpen={showLogPanel}
                onClose={() => setShowLogPanel(false)}
                isKP={canUseKPTools}
              />
            </Suspense>
          )}
          {showSubRooms && (
            <Suspense fallback={null}>
              <SubRoomManager
                roomId={roomId || ''}
                isOpen={showSubRooms}
                onClose={() => setShowSubRooms(false)}
                isKP={canUseKPTools}
                members={room?.members?.map(m => ({ userId: m.userId, nickname: m.nickname, avatarUrl: m.avatarUrl })) || []}
              />
            </Suspense>
          )}
          {showEventLog && (
            <Suspense fallback={null}>
              <RoomEventLogPanel
                roomId={roomId || ''}
                isOpen={showEventLog}
                onClose={() => setShowEventLog(false)}
                isKP={canUseKPTools}
              />
            </Suspense>
          )}
          {showGMKit && canUseKPTools && (
            <Suspense fallback={null}>
              <GMKitPanel
                roomId={roomId || ''}
                isOpen={showGMKit}
                onClose={() => setShowGMKit(false)}
              />
            </Suspense>
          )}
          {showNpcPanel && (
            <Suspense fallback={null}>
              <NpcFocusPanel
                roomId={roomId || ''}
                isOpen={showNpcPanel}
                onClose={() => setShowNpcPanel(false)}
                currentSceneId={room?.currentScene?.id}
                isKP={canUseKPTools}
              />
            </Suspense>
          )}
          {showCluePanel && (
            <Suspense fallback={null}>
              <CluePanel
                roomId={roomId || ''}
                isOpen={showCluePanel}
                onClose={() => setShowCluePanel(false)}
                isKP={canUseKPTools}
              />
            </Suspense>
          )}
          {roomId && showNotesPanel && (
            <Suspense fallback={null}>
              <NotesPanel
                roomId={roomId}
                isOpen={showNotesPanel}
                onOpenChange={(open) => setFloatingToolPanel('notes', showNotesPanel, setShowNotesPanel, open)}
                hideToggle
                inline
              />
            </Suspense>
          )}
        </div>
      )}
      {roomId && caps && showInvestigationDock && (
        <Suspense fallback={null}>
          <InvestigationDock
            roomId={roomId}
            capabilities={caps}
            isOpen={showInvestigationDock}
            activeTab={investigationDockTab}
            onClose={() => setShowInvestigationDock(false)}
          />
        </Suspense>
      )}
    </div>

    {/* ===== V2.1 新增：战斗时间线（底部弹层） ===== */}
    {showCombatTimeline && (
      <Suspense fallback={null}>
        <CombatTimeline
          roomId={roomId || ''}
          isOpen={showCombatTimeline}
          onClose={() => setShowCombatTimeline(false)}
          isKP={canUseKPTools}
          userId={user?.id}
        />
      </Suspense>
    )}

      {/* 选择角色弹窗 */}
      <Modal
        isOpen={showCharacterModal}
        onClose={() => navigate('/rooms')}
        title="选择调查员"
      >
        <RoomJoinGate
          roomId={roomId || ''}
          characters={myCharacters}
          capabilities={caps}
          lifecycle={room?.lifecycle}
          onJoined={() => {
            setShowCharacterModal(false);
            fetchRoom();
          }}
          onCancel={() => navigate('/rooms')}
        />
      </Modal>

      {/* 攻击弹窗 */}
      <Modal
        isOpen={showAttackModal}
        onClose={() => setShowAttackModal(false)}
        title="发起攻击"
      >
        {(() => {
          const currentCombatant = combatState?.turnOrder?.[combatState.currentTurnIndex];
          return (
            <div className="space-y-4">
              {/* 显示当前角色的武器 */}
              {currentCombatant?.weapons && (
                <div className="p-3 rounded backdrop-blur-sm bg-black/20 border border-[#3a3a3a]/40">
                  <div className="text-sm mb-2" style={{ color: "#8b8375" }}>选择武器</div>
                  <div className="space-y-1">
                    {currentCombatant.weapons.length > 0 ? (
                      currentCombatant.weapons.map((w: any, i: number) => {
                        const isEquipped = currentCombatant.equippedWeapon?.id === w.id;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              // 发送切换武器请求
                              socket.current?.emit('combat:switch_weapon', { roomId, weaponIndex: i });
                            }}
                            className={`w-full text-sm flex justify-between items-center p-2 rounded ${
                              isEquipped
                                ? 'bg-[#a63848]/15 border border-[#a63848]/50'
                                : 'border-transparent hover:bg-black/40'
                            }`}
                          >
                            <span>{w.name} {isEquipped && <span style={{ color: "#a63848" }}>(已装备)</span>}</span>
                            <span style={{ color: "#c9a227" }}>{w.damage}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-sm" style={{ color: "#6b6558" }}>徒手 (1D3伤害)</div>
                    )}
                  </div>
                </div>
              )}

          <div>
            <label className="block text-sm mb-1" style={{ color: "#8b8375" }}>攻击目标</label>
            <select
              value={attackTarget}
              onChange={(e) => setAttackTarget(e.target.value)}
              className="w-full coc-input"
            >
              <option value="">选择目标</option>
              {combatState?.turnOrder.filter(c => c.userId !== user?.id).map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.nickname} (HP: {c.hp}/{c.maxHp}{c.equippedArmor ? ` | 护甲${c.equippedArmor.rating}` : ''})
                </option>
              ))}
            </select>
          </div>

          {attackTarget && combatState?.turnOrder.find(c => c.userId === attackTarget)?.equippedArmor && (
            <div className="text-xs" style={{ color: "#6b6558" }}>
              目标护甲: {combatState.turnOrder.find(c => c.userId === attackTarget)?.equippedArmor?.name}
              (护甲值: {combatState.turnOrder.find(c => c.userId === attackTarget)?.equippedArmor?.rating})
            </div>
          )}

          <div className="flex gap-3">
            <MagneticButton
              variant="void"
              size="sm"
              onClick={() => setShowAttackModal(false)}
              className="flex-1"
            >
              取消
            </MagneticButton>
            <MagneticButton
              variant="blood"
              size="sm"
              onClick={handleAttack}
              disabled={!attackTarget}
              className="flex-1"
            >
              攻击
            </MagneticButton>
          </div>
        </div>
          );
        })()}
      </Modal>

      {/* KP 完整投骰 */}
      <Modal
        isOpen={showKpDicePanel}
        onClose={() => setShowKpDicePanel(false)}
        title="守密人投骰"
        className="room-kp-dice-modal"
      >
        <KPDicePanel
          connected={connected}
          isSecret={isSecretDice}
          onToggleSecret={() => setIsSecretDice((value) => !value)}
          onRoll={(rollType, skillName, skillValue) => {
            if (!canUseKPTools) return;
            handleGenericRoll(rollType, skillName, skillValue);
            setShowKpDicePanel(false);
          }}
        />
      </Modal>

      {/* 成员详情弹窗 */}
      <Modal
        isOpen={showMemberDetail}
        onClose={() => {
          setShowMemberDetail(false);
          setSelectedMember(null);
        }}
        title=""
      >
        {selectedMember && (
          <UserProfileCard
            user={{
              nickname: selectedMember.nickname,
              avatarUrl: selectedMember.avatarUrl,
              frameUrl: selectedMember.frameUrl,
              rankName: selectedMember.rankName,
              rankColor: selectedMember.rankColor,
              titleName: selectedMember.titleName,
              titleColor: selectedMember.titleColor,
              exp: selectedMember.exp,
              expToNext: selectedMember.expToNext,
              nextRankName: selectedMember.nextRankName,
              coins: selectedMember.coins,
              stardust: selectedMember.stardust,
              displayedCharacter: selectedMember.displayedCharacter
                ? {
                    id: selectedMember.displayedCharacter.id,
                    name: selectedMember.displayedCharacter.name,
                    occupation: selectedMember.displayedCharacter.occupation,
                    avatarUrl: selectedMember.displayedCharacter.avatarUrl,
                    hp: selectedMember.displayedCharacter.hp,
                    maxHp: selectedMember.displayedCharacter.maxHp,
                    mp: selectedMember.displayedCharacter.mp,
                    maxMp: selectedMember.displayedCharacter.maxMp,
                    san: selectedMember.displayedCharacter.san,
                    maxSan: selectedMember.displayedCharacter.maxSan,
                    str: selectedMember.displayedCharacter.str,
                    dex: selectedMember.displayedCharacter.dex,
                    con: selectedMember.displayedCharacter.con,
                    siz: selectedMember.displayedCharacter.siz,
                    app: selectedMember.displayedCharacter.app,
                    int: selectedMember.displayedCharacter.int,
                    pow: selectedMember.displayedCharacter.pow,
                    edu: selectedMember.displayedCharacter.edu,
                    luck: selectedMember.displayedCharacter.luck,
                    mov: selectedMember.displayedCharacter.mov,
                    build: selectedMember.displayedCharacter.build,
                    background: selectedMember.displayedCharacter.background,
                    skills: selectedMember.displayedCharacter.skills,
                    quickSkills: selectedMember.displayedCharacter.quickSkills,
                  }
                : null,
            }}
          />
        )}
      </Modal>

      {/* 移动端成员列表弹窗 */}
      <Modal
        isOpen={showMobileMembers}
        onClose={() => setShowMobileMembers(false)}
        title="调查员"
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {room?.members.map((member) => {
            const char = member.displayedCharacter || member.character;
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border border-transparent backdrop-blur-sm bg-black/20 hover:bg-black/40 hover:border-[#c9a227]/30"
                onClick={() => {
                  setSelectedMember(member);
                  setShowMemberDetail(true);
                  setShowMobileMembers(false);
                }}
              >
                <div className="relative w-10 h-10 flex-shrink-0">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-coc-border bg-coc-bg-secondary" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#3a3a3a] flex items-center justify-center">
                      <User size={18} className="text-coc-text-muted" />
                    </div>
                  )}
                  {member.frameUrl && (
                    <img src={member.frameUrl} className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'scale(1.3)' }} alt="" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-sm truncate">{char?.name || member.nickname}</span>
                    {member.role === 'KP' && <Crown size={12} className="text-coc-accent-gold flex-shrink-0" />}
                  </div>
                  {char?.name && <div className="text-xs text-coc-text-secondary truncate">{member.nickname}</div>}
                  {char && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-coc-accent-red">HP {char.hp}/{char.maxHp || char.hp}</span>
                      <span className="text-xs text-coc-accent-cyan">MP {char.mp}/{char.maxMp || char.mp}</span>
                      <span className="text-xs text-yellow-400">SAN {char.san}/{char.maxSan || char.san}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* SAN 扣除弹窗 */}
      <Modal
        isOpen={showSanityModal}
        onClose={() => setShowSanityModal(false)}
        title="理智侵蚀"
      >
        <div className="space-y-4 w-[320px] md:w-[400px]">
          <p className="text-sm" style={{ color: "#8b8375" }}>
            为遭遇恐怖的调查员扣除理智。单次损失 ≥ 5 且智力检定成功（≤INT）时，将陷入 1D10 小时临时疯狂。
          </p>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {room?.members.filter(m => m.character).map((member) => (
              <div key={member.userId} className="flex items-center justify-between p-2 rounded backdrop-blur-sm bg-black/20 border border-[#3a3a3a]/40">
                <div className="text-sm">
                  {member.nickname}
                  <span className="ml-1" style={{ color: "#6b6558" }}>({member.character!.name}) [{member.character!.san}SAN]</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={member.character!.san}
                  value={sanityTargets[member.userId] || 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setSanityTargets(prev => ({ ...prev, [member.userId]: Math.max(0, Math.min(val, member.character!.san)) }));
                  }}
                  className="w-16 px-2 py-1 rounded text-center text-sm" style={{ background: "#1a1a1a", border: "1px solid #3a3a3a", color: "#d4c5a8" }}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs" style={{ color: "#8b8375" }}>场景描述（可选）</label>
            <textarea
              value={sanityDescription}
              onChange={(e) => setSanityDescription(e.target.value)}
              placeholder="例如：目睹深潜者从海中浮现..."
              className="w-full mt-1 px-3 py-2 rounded text-sm resize-none" style={{ background: "#1a1a1a", border: "1px solid #3a3a3a", color: "#d4c5a8" }}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowSanityModal(false)}
              className="px-4 py-2 rounded text-sm border border-[#3a3a3a] transition-colors" style={{ color: "#8b8375" }} onMouseEnter={(e)=>(e.currentTarget.style.background="rgba(0,0,0,0.3)")} onMouseLeave={(e)=>(e.currentTarget.style.background="transparent")}
            >
              取消
            </button>
            <button
              onClick={() => {
                const deductions = Object.entries(sanityTargets)
                  .filter(([, amount]) => amount > 0)
                  .map(([userId, amount]) => ({ userId, amount, description: sanityDescription }));
                if (deductions.length > 0) {
                  socket.current?.emit('sanity:deduct', { roomId, deductions });
                }
                setShowSanityModal(false);
              }}
              disabled={Object.values(sanityTargets).every(v => !v || v <= 0)}
              className="px-4 py-2 rounded text-sm bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40"
            >
              确认扣除
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== 新增：统计面板 ===== */}
      {showStats && (
        <Suspense fallback={null}>
          <RoomStatsPanel
            stats={roomStats}
            isOpen={showStats}
            onClose={() => setShowStats(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
