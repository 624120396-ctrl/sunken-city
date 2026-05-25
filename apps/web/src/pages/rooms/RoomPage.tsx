import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, Send, Crown, DoorOpen, Swords, Play, Square, SkipForward, FileText, History, MessageSquare, BarChart3, User, ScrollText, Search, GitBranch, Sparkles, ChevronDown, Heart, Brain, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { cn } from '@lib/utils';
import { useAuthStore } from '@stores/auth.store';
import { useLayoutStore } from '@stores/layout.store';
import { Modal } from '@components/ui/Modal';
import { Tooltip } from '@components/ui/Tooltip';
import { UserProfileCard } from '@components/UserProfileCard';
import { useSocket } from '@hooks/useSocket';
import { getSuccessExplanation, getSkillExplanation } from '@lib/dice-explanations';
import { QuickPhrases } from '@components/room/QuickPhrases';
import { MentionInput } from '@components/room/MentionInput';
import { SecretDiceToggle } from '@components/room/SecretDiceToggle';
import { NotesPanel } from '@components/room/NotesPanel';
import { ClueMarker } from '@components/room/ClueMarker';
import { DoubleBezelCard } from '@components/ui/DoubleBezelCard';
import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { MagneticButton } from '@components/ui/MagneticButton';
import { PlayerHud } from '@components/room/PlayerHud';

// ===== 新增沉浸式体验组件 =====
import { SceneCard } from '@components/room/SceneCard';
import { StatusTags } from '@components/room/StatusTags';
import { PrivateChatPanel } from '@components/room/PrivateChatPanel';
import { QuickRollBar } from '@components/room/QuickRollBar';
import { RoomStatsPanel } from '@components/room/RoomStatsPanel';
import { StaggerList, StaggerItem } from '@components/ui/Animation';
// ===== V2.1 新增 =====
import { RoomStatusBar } from '@components/room/RoomStatusBar';
import { RoomEventLogPanel } from '@components/room/RoomEventLogPanel';
import { CluePanel } from '@components/room/CluePanel';
import { NpcFocusPanel } from '@components/room/NpcFocusPanel';
import { CombatTimeline } from '@components/room/CombatTimeline';
import { GMKitPanel } from '@components/room/GMKitPanel';
import { RoomLogPanel } from '@components/room/RoomLogPanel';
import { SubRoomManager } from '@components/room/SubRoomManager';
import { AIAssistantPanel } from '@components/room/AIAssistantPanel';

interface Room {
  id: string;
  roomId: string;
  name: string;
  description?: string;
  status: string;
  isCreator: boolean;
  isMember: boolean;
  members: RoomMember[];
  atmosphere?: string;
  sceneDesc?: string;
  // ===== V2.1 新增 =====
  phases?: Array<{
    id: string;
    title: string;
    description?: string;
    sortOrder: number;
    status: string;
    scenes: Array<{
      id: string;
      title: string;
      description?: string;
      atmosphere: string;
      imageUrl?: string;
      musicUrl?: string;
      sortOrder: number;
      status: string;
    }>;
  }>;
  currentPhase?: {
    id: string;
    title: string;
    description?: string;
    status: string;
  } | null;
  currentScene?: {
    id: string;
    title: string;
    description?: string;
    atmosphere: string;
    imageUrl?: string;
  } | null;
}

interface RoomMember {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  frameUrl?: string;
  role: 'KP' | 'PLAYER';
  exp?: number;
  coins?: number;
  stardust?: number;
  displayedTitleKey?: string | null;
  rankName?: string;
  rankColor?: string;
  titleName?: string | null;
  titleColor?: string | null;
  expToNext?: number;
  nextRankName?: string | null;
  displayedCharacter?: {
    id: string;
    name: string;
    occupation: string;
    avatarUrl?: string;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    san: number;
    maxSan: number;
    str?: number;
    dex?: number;
    con?: number;
    siz?: number;
    app?: number;
    int?: number;
    pow?: number;
    edu?: number;
    luck?: number;
    mov?: number;
    build?: number;
    background?: string;
    skills?: string;
    quickSkills?: string;
  } | null;
  character?: {
    id: string;
    name: string;
    occupation: string;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    san: number;
    maxSan: number;
    str?: number;
    dex?: number;
    con?: number;
    siz?: number;
    app?: number;
    int?: number;
    pow?: number;
    edu?: number;
    luck?: number;
    mov?: number;
    build?: number;
  } | null;
}

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  type: 'text' | 'dice' | 'system';
  timestamp: string;
  rollData?: {
    targetName?: string;
    targetValue?: number;
    rollResult?: number;
    successLevel?: string;
  };
}

interface Combatant {
  userId: string;
  characterId?: string;
  nickname: string;
  characterName?: string;
  dex: number;
  hp: number;
  maxHp: number;
  mp: number;
  san: number;
  isKP: boolean;
  weapons?: any[];
  equippedWeapon?: any;
  equippedArmor?: any;
}

interface CombatState {
  status: 'IDLE' | 'IN_PROGRESS' | 'PAUSED' | 'ENDED';
  currentRound: number;
  currentTurnIndex: number;
  turnOrder: Combatant[];
  log: any[];
}

export function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { roomLeftPanelCollapsed, toggleRoomLeftPanel, setRoomLeftPanelCollapsed, isMobile } = useLayoutStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showMobileMembers, setShowMobileMembers] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [myCharacters, setMyCharacters] = useState<any[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'combat'>('chat');
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [attackTarget, setAttackTarget] = useState('');
  const [isSecretDice, setIsSecretDice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 成员详情弹窗
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null);

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
  const [showPrivateChat, setShowPrivateChat] = useState(false);
  const [privateUnreadCount, setPrivateUnreadCount] = useState(0);
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
  const [showAI, setShowAI] = useState(false);
  const [roomStats, setRoomStats] = useState({
    duration: 0,
    totalRolls: 0,
    successRolls: 0,
    failRolls: 0,
    mostUsedSkill: null as string | null,
  });

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
    setShowChatTools(!isMobile);
  }, [isMobile]);

  const addClue = (clue: any) => {
    const newClues = [clue, ...clues];
    setClues(newClues);
    localStorage.setItem(`clues_${roomId}`, JSON.stringify(newClues));
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
        type: 'text',
        timestamp: msg.timestamp,
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
          type: (msg.type === 'dice' || msg.type === 'system' ? msg.type : 'text') as ChatMessage['type'],
          timestamp: msg.timestamp,
        };
        if (msg.type === 'dice' && msg.meta) {
          return {
            ...base,
            rollData: {
              targetName: msg.meta.targetName,
              targetValue: msg.meta.targetValue,
              rollResult: msg.meta.rollResult,
              successLevel: msg.meta.successLevel,
            } as ChatMessage['rollData'],
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

    // 定期轮询倒计时和未读数
    const interval = setInterval(() => {
      if (roomId) {
        fetchCountdowns();
        fetchPrivateUnreadCount();
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
      const data = await handleApiResponse<{ room: Room }>(response);
      setRoom(data.room);

      // 加载场景描述和氛围
      // @ts-ignore - 等待后端类型更新
      setSceneDesc(data.room.sceneDesc || '');

      // 加载成员状态标记
      const statuses: Record<string, string[]> = {};
      data.room.members?.forEach((m: RoomMember) => {
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

  // 加载私聊未读数
  const fetchPrivateUnreadCount = async () => {
    if (!selectedCharacter?.id) return;
    try {
      const response = await apiFetch(`/rooms/${roomId}/private-messages/unread`);
      const data = await handleApiResponse<{ count: number }>(response);
      setPrivateUnreadCount(data.count);
    } catch (error) {
      console.error('获取未读数失败:', error);
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

  const handleJoinRoom = async (characterId?: string) => {
    try {
      await apiFetch(`/rooms/${roomId}/join`, {
        method: 'POST',
        body: JSON.stringify({ characterId }),
      });
      setShowCharacterModal(false);
      fetchRoom();
    } catch (error: any) {
      alert(error.message || '加入房间失败');
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
        socketSendMessage(statusMsg, selectedCharacter?.id, isSecretDice);
      }
      setInputMessage('');
      return;
    }

    // KP 专属指令
    if (room?.isCreator) {
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

    socketSendMessage(inputMessage, selectedCharacter?.id, isSecretDice);
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

  const isMyTurn = combatState?.status === 'IN_PROGRESS' && combatState.turnOrder[combatState.currentTurnIndex]?.userId === user?.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-coc-accent-red border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-8rem)] flex flex-col">
      {/* 头部 */}
      <div className="relative z-50 flex items-center justify-between mb-4 px-3 py-2 rounded-lg
                      backdrop-blur-md bg-black/40 border border-[#3a3a3a]/40 shadow-md">
        <div className="flex items-center gap-4">
          <Link to="/rooms" className="p-2 rounded border border-[#3a3a3a]/60 text-[#c9a227] 
                     hover:border-[#c9a227]/50 hover:bg-[#c9a227]/10 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-serif font-bold" style={{ color: '#c9a227' }}>{room?.name}</h1>
            <p className="text-sm" style={{ color: '#6b6558' }}>#{room?.roomId}</p>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]'}`} title={connected ? '已连接' : '未连接'} />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab(activeTab === 'chat' ? 'combat' : 'chat')}
            className={cn(
              "rounded flex items-center gap-1.5 text-[#e8d4a0] bg-[url('/btn-off.png')] bg-cover bg-center hover:bg-[url('/btn-on.png')] hover:text-white active:bg-[url('/btn-on.png')] transition-all justify-center",
              isMobile ? "w-9 h-9 px-0 py-0" : "px-4 py-1.5 text-sm min-w-[80px]"
            )}
            title={activeTab === 'chat' ? '战斗' : '聊天'}
          >
            {activeTab === 'chat' ? <Swords size={isMobile ? 18 : 14} /> : <Send size={isMobile ? 18 : 14} />}
            {!isMobile && (activeTab === 'chat' ? '战斗' : '聊天')}
          </button>
          <button
            onClick={() => setShowPrivateChat(true)}
            className={cn(
              "rounded flex items-center gap-1.5 text-[#e8d4a0] bg-[url('/btn-off.png')] bg-cover bg-center hover:bg-[url('/btn-on.png')] hover:text-white active:bg-[url('/btn-on.png')] transition-all justify-center relative",
              isMobile ? "w-9 h-9 px-0 py-0" : "px-4 py-1.5 text-sm min-w-[80px]"
            )}
            title="私聊"
          >
            <MessageSquare size={isMobile ? 18 : 14} />
            {!isMobile && <span>私聊</span>}
            {privateUnreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#a63848] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                {privateUnreadCount}
              </span>
            )}
          </button>
          <div className="relative group z-[100]">
            <button className={cn(
                "rounded flex items-center gap-1 text-[#e8d4a0] bg-[url('/btn-off.png')] bg-cover bg-center hover:bg-[url('/btn-on.png')] hover:text-white active:bg-[url('/btn-on.png')] transition-all justify-center",
                isMobile ? "w-9 h-9 px-0 py-0" : "px-4 py-1.5 text-sm min-w-[80px]"
              )}>
              <span className={isMobile ? "hidden" : ""}>更多</span>
              <ChevronDown size={isMobile ? 18 : 12} />
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 backdrop-blur-md bg-black/80 
                            border border-[#3a3a3a]/60 rounded-lg shadow-xl shadow-black/60
                            opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[9999] py-1">
              {[
                { label: '成员', icon: Users, show: showMobileMembers, toggle: () => setShowMobileMembers(!showMobileMembers) },
                { label: '线索', icon: Search, show: showCluePanel, toggle: () => setShowCluePanel(!showCluePanel) },
                { label: 'NPC', icon: User, show: showNpcPanel, toggle: () => setShowNpcPanel(!showNpcPanel) },
                { label: '战斗', icon: Swords, show: showCombatTimeline, toggle: () => setShowCombatTimeline(!showCombatTimeline) },
                { label: 'AI', icon: Sparkles, show: showAI, toggle: () => setShowAI(!showAI) },
                { label: '子房间', icon: GitBranch, show: showSubRooms, toggle: () => setShowSubRooms(!showSubRooms) },
                { label: 'Log', icon: ScrollText, show: showLogPanel, toggle: () => setShowLogPanel(!showLogPanel) },
                { label: '统计', icon: BarChart3, show: showStats, toggle: () => { fetchRoomStats(); setShowStats(!showStats); } },
                { label: '报告', icon: FileText, show: false, link: `/rooms/${roomId}/report` },
                { label: '投骰', icon: History, show: false, link: `/rooms/${roomId}/dice-history` },
              ].map(item => (
                item.link ? (
                  <Link key={item.label} to={item.link} className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#8b8375] hover:bg-[#c9a227]/10 hover:text-[#c9a227] transition-colors">
                    <item.icon size={14} />
                    {item.label}
                  </Link>
                ) : (
                  <button key={item.label} onClick={item.toggle} className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${item.show ? 'text-[#c9a227] bg-[#c9a227]/10' : 'text-[#8b8375] hover:bg-[#c9a227]/10 hover:text-[#c9a227]'}`}>
                    <item.icon size={14} />
                    {item.label}
                  </button>
                )
              ))}
            </div>
          </div>
          {room?.isCreator && (
            <button
              onClick={() => setShowGMKit(!showGMKit)}
              className={`px-4 py-1.5 rounded text-sm flex items-center gap-1 text-[#e8d4a0]
                          bg-[url('/btn-off.png')] bg-cover bg-center
                          hover:bg-[url('/btn-on.png')] hover:text-white active:bg-[url('/btn-on.png')]
                          transition-all min-w-[60px] justify-center
                          ${showGMKit ? "bg-[url('/btn-on.png')] text-white" : ""}`}
            >
              <Crown size={14} />
              KP
            </button>
          )}
          <div className="w-px h-5 mx-1" style={{ background: 'rgba(58,58,58,0.5)' }} />
          <button onClick={handleLeaveRoom} className="px-4 py-1.5 rounded text-sm flex items-center gap-1 text-[#e8d4a0]
                       bg-[url('/btn-off.png')] bg-cover bg-center
                       hover:bg-[url('/btn-on.png')] hover:text-white active:bg-[url('/btn-on.png')]
                       transition-all min-w-[60px] justify-center">
            <DoorOpen size={14} />
            离开
          </button>
          {room?.isCreator && (
            <button onClick={handleCloseRoom} className="px-4 py-1.5 rounded text-sm flex items-center gap-1 text-[#e8d4a0]
                       bg-[url('/btn-off.png')] bg-cover bg-center
                       hover:bg-[url('/btn-on.png')] hover:text-white active:bg-[url('/btn-on.png')]
                       transition-all min-w-[60px] justify-center">
              关闭
            </button>
          )}
        </div>
      </div>

      {/* ===== V2.1 新增：房间状态栏 ===== */}
      <RoomStatusBar
        currentPhase={room?.currentPhase || null}
        currentScene={room?.currentScene || null}
        phases={room?.phases}
        isKP={!!room?.isCreator}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* ===== V2.1 新增：线索面板（左侧抽屉） ===== */}
        {showCluePanel && (
          <CluePanel
            roomId={roomId || ''}
            isOpen={showCluePanel}
            onClose={() => setShowCluePanel(false)}
            isKP={!!room?.isCreator}
          />
        )}

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* 左侧：成员列表 */}
          <div className={cn(
          'shrink-0 flex-col min-h-0 border-r border-[#3a3a3a]/30 transition-all duration-300',
          roomLeftPanelCollapsed ? 'w-14' : 'w-[200px]',
          isMobile ? 'hidden md:flex' : 'flex'
        )}>
            {/* 收放按钮 */}
            <button
              onClick={toggleRoomLeftPanel}
              className="w-full flex items-center justify-center py-2 border-b border-[#3a3a3a]/20 hover:bg-[rgba(201,162,39,0.08)] transition-colors flex-shrink-0"
            >
              {roomLeftPanelCollapsed ? (
                <ChevronRight size={16} style={{ color: '#6b6558' }} />
              ) : (
                <ChevronLeft size={16} style={{ color: '#6b6558' }} />
              )}
            </button>

            {/* 收起态：竖向图标栏 */}
            {roomLeftPanelCollapsed ? (
              <div className="flex-1 overflow-y-auto py-2 space-y-3 px-1">
                {room?.members.map((member) => {
                  const char = member.displayedCharacter || member.character;
                  return (
                    <Tooltip key={member.id} content={char?.name || member.nickname} position="right">
                      <div
                        className="flex flex-col items-center gap-1 cursor-pointer py-1"
                        onClick={() => {
                          setSelectedMember(member);
                          setShowMemberDetail(true);
                        }}
                      >
                        <div className="relative w-9 h-9">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              className="w-9 h-9 rounded-full object-cover border border-coc-border bg-coc-bg-secondary"
                              alt=""
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#3a3a3a] flex items-center justify-center">
                              <User size={18} className="text-coc-text-muted" />
                            </div>
                          )}
                          {member.frameUrl && (
                            <img
                              src={member.frameUrl}
                              className="absolute inset-0 w-full h-full pointer-events-none"
                              style={{ transform: 'scale(1.3)' }}
                              alt=""
                            />
                          )}
                        </div>
                        {/* 状态点 */}
                        {char && (
                          <div className="flex flex-col items-center gap-0.5">
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: char.hp > char.maxHp * 0.3 ? '#a63848' : char.hp > 0 ? '#c9a227' : '#3a3a3a' }}
                            />
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: char.mp > 0 ? '#4db8b8' : '#3a3a3a' }}
                            />
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: char.san > char.maxSan * 0.3 ? '#fbbf24' : char.san > 0 ? '#c9a227' : '#3a3a3a' }}
                            />
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-3 py-2">
          {/* 当前状态 - 水平紧凑条 */}
          {selectedCharacter && (
            <div className="flex items-center gap-2 px-3 py-2 bg-coc-bg-secondary/50 border border-coc-border/30 rounded-lg">
              <Tooltip content={`HP ${selectedCharacter.hp}/${selectedCharacter.maxHp || selectedCharacter.hp}`}>
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-[10px] text-coc-accent-red font-bold">HP</span>
                  <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full bg-coc-accent-red rounded-full" style={{ width: `${(selectedCharacter.hp / (selectedCharacter.maxHp || selectedCharacter.hp || 1)) * 100}%` }} />
                  </div>
                </div>
              </Tooltip>
              <Tooltip content={`MP ${selectedCharacter.mp}/${selectedCharacter.maxMp || selectedCharacter.mp}`}>
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-[10px] text-coc-accent-cyan font-bold">MP</span>
                  <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full bg-coc-accent-cyan rounded-full" style={{ width: `${(selectedCharacter.mp / (selectedCharacter.maxMp || selectedCharacter.mp || 1)) * 100}%` }} />
                  </div>
                </div>
              </Tooltip>
              <Tooltip content={`SAN ${selectedCharacter.san}/${selectedCharacter.maxSan || selectedCharacter.san}`}>
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-[10px] text-yellow-400 font-bold">SAN</span>
                  <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(selectedCharacter.san / (selectedCharacter.maxSan || selectedCharacter.san || 1)) * 100}%` }} />
                  </div>
                </div>
              </Tooltip>
            </div>
          )}

          {/* v1.5 PlayerHud */}
          {selectedCharacter && (
            <PlayerHud
              character={selectedCharacter}
              statusTags={memberStatuses[room?.members?.find(m => m.userId === user?.id)?.id || ''] || []}
              quickSkills={(() => {
                const qs = selectedCharacter.quickSkills
                  ? typeof selectedCharacter.quickSkills === 'string'
                    ? JSON.parse(selectedCharacter.quickSkills)
                    : selectedCharacter.quickSkills
                  : [];
                const skills = selectedCharacter.skills
                  ? typeof selectedCharacter.skills === 'string'
                    ? JSON.parse(selectedCharacter.skills)
                    : selectedCharacter.skills
                  : {};
                return qs.map((name: string) => ({ name, value: skills[name] || 0 })).filter((s: any) => s.value > 0);
              })()}
              onQuickRoll={handleRollDice}
            />
          )}

          <div className="backdrop-blur-md bg-black/40 border border-[#3a3a3a]/40 rounded-lg p-3 shadow-md">
            <h3 className="text-xs font-bold mb-2.5 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "#6b6558" }}>
              <Users size={12} />
              调查员 ({room?.members.length || 0})
            </h3>
            <div className="space-y-2">
              {room?.members.map((member) => {
                const char = member.displayedCharacter || member.character;
                return (
                <div
                  key={member.id}
                  className="p-2.5 rounded-lg cursor-pointer transition-all border border-transparent backdrop-blur-sm bg-black/20 hover:bg-black/40 hover:border-[#c9a227]/30 shadow-sm"
                  onClick={() => {
                    setSelectedMember(member);
                    setShowMemberDetail(true);
                  }}
                >
                  {/* 第一行：头像 + 名字 + 角色 */}
                  <div className="flex items-center gap-2.5 mb-2">
                    {/* 头像 */}
                    <div className="relative w-9 h-9 flex-shrink-0">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          className="w-9 h-9 rounded-full object-cover border border-coc-border bg-coc-bg-secondary"
                          alt=""
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#3a3a3a] flex items-center justify-center">
                          <User size={18} className="text-coc-text-muted" />
                        </div>
                      )}
                      {member.frameUrl && (
                        <img
                          src={member.frameUrl}
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          style={{ transform: 'scale(1.3)' }}
                          alt=""
                        />
                      )}
                    </div>
                    {/* 名字 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-sm truncate">
                          {char?.name || member.nickname}
                        </span>
                        {member.role === 'KP' && (
                          <Crown size={12} className="text-coc-accent-gold flex-shrink-0" />
                        )}
                      </div>
                      {char?.name && (
                        <div className="text-xs text-coc-text-secondary truncate">
                          {member.nickname}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 两行：HP+MP / SAN */}
                  {char ? (
                    <div className="space-y-1">
                      {/* 第一行：HP + MP */}
                      <div className="flex items-center gap-2">
                        <Tooltip content={`生命值 ${char.hp}/${char.maxHp || char.hp}`}>
                          <div className="flex items-center gap-1 text-xs">
                            <Heart size={12} className="text-coc-accent-red" />
                            <span className="text-coc-accent-red font-mono">{char.hp}</span>
                            <span className="text-coc-text-muted text-[10px]">/{char.maxHp || char.hp}</span>
                          </div>
                        </Tooltip>
                        <Tooltip content={`魔法值 ${char.mp}/${char.maxMp || char.mp}`}>
                          <div className="flex items-center gap-1 text-xs">
                            <Sparkles size={12} className="text-coc-accent-cyan" />
                            <span className="text-coc-accent-cyan font-mono">{char.mp}</span>
                            <span className="text-coc-text-muted text-[10px]">/{char.maxMp || char.mp}</span>
                          </div>
                        </Tooltip>
                      </div>
                      {/* 第二行：SAN */}
                      <div className="flex items-center gap-2">
                        <Tooltip content={`理智值 ${char.san}/${char.maxSan || char.san}`}>
                          <div className="flex items-center gap-1 text-xs">
                            <Brain size={12} className="text-yellow-400" />
                            <span className="text-yellow-400 font-mono">{char.san}</span>
                            <span className="text-coc-text-muted text-[10px]">/{char.maxSan || char.san}</span>
                          </div>
                        </Tooltip>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: "#6b6558" }}>观察者</span>
                  )}

                  {/* 状态标签 */}
                  {memberStatuses[member.id]?.length > 0 && (
                    <div className="mt-1.5">
                      <StatusTags tags={memberStatuses[member.id]} size="sm" />
                    </div>
                  )}

                  {/* KP可编辑状态标记 */}
                  {room?.isCreator && char && (
                    <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                      <StatusTags
                        tags={memberStatuses[member.id] || []}
                        isEditable={true}
                        onChange={(tags) => updateMemberStatus(member.id, tags)}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>

          {/* 战斗控制 */}
          {activeTab === 'combat' && room?.isCreator && (
            <div className="backdrop-blur-md bg-black/40 border border-[#3a3a3a]/40 rounded-lg p-3 shadow-md">
              <h3 className="text-xs font-bold text-coc-text-muted mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <Swords size={12} />
                战斗控制
              </h3>
              <div className="space-y-1.5">
                {(!combatState || combatState.status === 'IDLE' || combatState.status === 'ENDED') ? (
                  <MagneticButton
                    variant="blood"
                    size="sm"
                    onClick={handleStartCombat}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Play size={16} /> 开始战斗
                  </MagneticButton>
                ) : (
                  <>
                    <div className="text-sm text-coc-text-secondary">
                      第 {combatState.currentRound} 回合
                    </div>
                    <div className="text-sm">
                      当前行动: {combatState.turnOrder[combatState.currentTurnIndex]?.nickname}
                    </div>
                    {isMyTurn && (
                      <>
                        <MagneticButton
                          variant="blood"
                          size="sm"
                          onClick={() => setShowAttackModal(true)}
                          className="w-full mt-2 flex items-center justify-center gap-2"
                        >
                          <Swords size={16} /> 攻击
                        </MagneticButton>
                        <MagneticButton
                          variant="void"
                          size="sm"
                          onClick={handleNextTurn}
                          className="w-full mt-2 flex items-center justify-center gap-2"
                        >
                          <SkipForward size={16} /> 结束回合
                        </MagneticButton>
                      </>
                    )}
                    <MagneticButton
                      variant="blood"
                      size="sm"
                      onClick={handleEndCombat}
                      className="w-full mt-1 text-red-400 flex items-center justify-center gap-2"
                    >
                      <Square size={16} /> 结束战斗
                    </MagneticButton>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        )}
        </div>

        {/* 右侧：聊天/战斗区 */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden pl-3">
          {activeTab === 'chat' ? (
            <DoubleBezelCard variant="default" runeCorners innerClassName="p-4 flex-1 flex flex-col min-h-0">
              {/* ===== 新增：场景描述卡片 ===== */}
              {(sceneDesc || room?.isCreator) && (
                <div className="px-4 pt-4 flex-shrink-0">
                  <SceneCard
                    description={sceneDesc}
                    isKP={!!room?.isCreator}
                    onUpdate={updateSceneDesc}
                  />
                </div>
              )}

              {/* 消息列表 */}
              <StaggerList className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" staggerDelay={0.03}>
                {messages.length === 0 ? (
                  <StaggerItem>
                    <EmptyState
                      icon={EmptyIcons.Messages}
                      title="还没有消息"
                      description="开始聊天吧，声音会在深渊中回响……"
                      size="sm"
                      animate={false}
                    />
                  </StaggerItem>
                ) : (
                  messages.map((msg) => {
                    const isSystem = msg.userId === 'system';
                    const isMe = msg.userId === user?.id;
                    const sender = room?.members?.find(m => m.userId === msg.userId);
                    const isKPMessage = sender?.role === 'KP';
                    const displayName = sender?.character?.name || sender?.displayedCharacter?.name || msg.nickname;

                    const Avatar = () => (
                      <div className="relative w-10 h-10 flex-shrink-0">
                        {sender?.avatarUrl ? (
                          <img
                            src={sender.avatarUrl}
                            className="w-10 h-10 rounded-full object-cover border border-coc-bg-tertiary bg-coc-bg-secondary"
                            alt=""
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-coc-bg-tertiary border border-coc-border flex items-center justify-center">
                            <User size={20} className="text-coc-text-muted" />
                          </div>
                        )}
                      </div>
                    );

                    if (isSystem) {
                      return (
                        <StaggerItem key={msg.id}>
                          <div className="flex justify-center">
                            <div className="max-w-[85%] px-5 py-3 rounded-lg bg-[#c9a227]/15 border border-[#c9a227]/60 italic text-sm text-center shadow-md" style={{ color: "#e8d4a0" }}>
                              {msg.content}
                              <span className="ml-2 text-xs text-coc-text-muted not-italic">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </StaggerItem>
                      );
                    }

                    return (
                      <StaggerItem key={msg.id}>
                        <div className="flex justify-start gap-3">
                          <Avatar />
                          <div
                            className={`max-w-[75%] px-4 py-3 rounded-lg relative group border shadow-md ${
                              msg.type === 'dice'
                                ? 'bg-[#1a1a1a] border-[#c9a227]/50'
                                : isMe
                                ? 'bg-[#1a1a1a] border-l-2 border-l-[#c9a227] border-[#3a3a3a]/60'
                                : 'bg-coc-bg-tertiary'
                            }`}
                          >
                    <div className="text-sm font-bold mb-0.5 flex items-center gap-1.5">
                              {isKPMessage ? (
                                <>
                                  <Crown size={14} className="text-coc-accent-gold" />
                                  <span style={{ color: "#c9a227" }}>{displayName}</span>
                                </>
                              ) : (
                                <span style={{ color: "#e8d4a0" }}>{displayName}</span>
                              )}
                              {isMe && <span className="text-xs font-normal text-coc-text-muted">(我)</span>}
                              <Tooltip content={new Date(msg.timestamp).toLocaleString()}>
                                <span className="text-xs font-normal ml-auto cursor-help" style={{ color: "#6b6558" }}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </Tooltip>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: "#d4c5a8" }}>{msg.content}</p>

                            {msg.type === 'dice' && msg.rollData?.successLevel && (
                              <div className="text-xs mt-2 pt-2 border-t border-[#3a3a3a]/60" style={{ color: "#8b8375" }}>
                                <Tooltip content={getSuccessExplanation(msg.rollData.successLevel)}>
                                  <span className="cursor-help">{msg.rollData.successLevel} → {getSuccessExplanation(msg.rollData.successLevel)}</span>
                                </Tooltip>
                                {msg.rollData.targetName && (
                                  <div className="mt-0.5 opacity-70">
                                    {getSkillExplanation(msg.rollData.targetName)}
                                  </div>
                                )}
                              </div>
                            )}

                            {msg.type === 'text' && (
                              <div className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ClueMarker
                                  messageId={msg.id}
                                  messageContent={msg.content}
                                  nickname={displayName}
                                  timestamp={msg.timestamp}
                                  onMarkAsClue={addClue}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </StaggerItem>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </StaggerList>

              {/* 输入框 */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-[#3a3a3a]/40 space-y-2 flex-shrink-0 backdrop-blur-md bg-black/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    {showChatTools && (
                      <>
                        <QuickPhrases
                          onSelect={(phrase) => setInputMessage(prev => prev + phrase)}
                        />
                        {room?.isCreator && (
                          <>
                            <SecretDiceToggle
                              isSecret={isSecretDice}
                              onToggle={() => setIsSecretDice(!isSecretDice)}
                              disabled={!connected}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const initial: Record<string, number> = {};
                                room?.members.forEach(m => {
                                  if (m.character) initial[m.userId] = 0;
                                });
                                setSanityTargets(initial);
                                setSanityDescription('');
                                setShowSanityModal(true);
                              }}
                              disabled={!connected}
                              className="px-2 py-1 rounded text-xs border border-purple-500/50 text-purple-300 hover:bg-purple-500/10 transition-colors"
                            >
                              理智侵蚀
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChatTools(!showChatTools)}
                    className="p-1 text-[#6b6558] hover:text-[#c9a227] transition-colors flex-shrink-0"
                    title={showChatTools ? '收起工具' : '展开工具'}
                  >
                    {showChatTools ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <MentionInput
                    value={inputMessage}
                    onChange={setInputMessage}
                    members={room?.members.map(m => ({ userId: m.userId, nickname: m.nickname })) || []}
                    onSubmit={handleSendMessage}
                    placeholder={connected ? "输入消息..." : "连接中..."}
                    disabled={!connected}
                  />
                  <MagneticButton
                    variant="blood"
                    size="sm"
                    type="submit"
                    disabled={!connected}
                  >
                    <Send size={18} />
                  </MagneticButton>
                </div>
              </form>

              {/* ===== 新增：快捷掷骰栏 ===== */}
              {selectedCharacter && (
                <div className="flex-shrink-0">
                  <QuickRollBar
                  quickSkills={(() => {
                    const qs = selectedCharacter.quickSkills
                      ? typeof selectedCharacter.quickSkills === 'string'
                        ? JSON.parse(selectedCharacter.quickSkills)
                        : selectedCharacter.quickSkills
                      : ['侦查', '聆听', '图书馆使用', '心理学', '话术'];
                    return qs;
                  })()}
                  characterSkills={(() => {
                    const skills = selectedCharacter.skills
                      ? typeof selectedCharacter.skills === 'string'
                        ? JSON.parse(selectedCharacter.skills)
                        : selectedCharacter.skills
                      : {};
                    return skills;
                  })()}
                  onRoll={handleRollDice}
                  onUpdateQuickSkills={async (skills) => {
                    try {
                      await apiFetch(`/characters/${selectedCharacter.id}/quick-skills`, {
                        method: 'PATCH',
                        body: JSON.stringify({ quickSkills: skills }),
                      });
                      setSelectedCharacter({ ...selectedCharacter, quickSkills: JSON.stringify(skills) });
                    } catch (error) {
                      console.error('更新快捷技能失败:', error);
                    }
                  }}
                  isEditable={true}
                />
                </div>
              )}
            </DoubleBezelCard>
          ) : (
            /* 战斗面板 */
            <DoubleBezelCard variant="blood" runeCorners innerClassName="p-4 flex-1 flex flex-col min-h-0">
              {!combatState || combatState.status === 'IDLE' ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Swords size={48} className="mx-auto mb-4" style={{ color: "#6b6558" }} />
                    <p style={{ color: "#8b8375" }}>战斗未开始</p>
                    {room?.isCreator && (
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
                    {room?.isCreator && (
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
            </DoubleBezelCard>
          )}
        </div>
      </div>
      {/* ===== V2.1 新增：跑团 Log 面板 ===== */}
      {showLogPanel && (
        <RoomLogPanel
          roomId={roomId || ''}
          isOpen={showLogPanel}
          onClose={() => setShowLogPanel(false)}
          isKP={!!room?.isCreator}
        />
      )}
      {/* ===== V2.1 新增：AI 助手面板 ===== */}
      {showAI && (
        <AIAssistantPanel
          roomId={roomId || ''}
          isOpen={showAI}
          onClose={() => setShowAI(false)}
        />
      )}
      {/* ===== V2.1 新增：子房间面板 ===== */}
      {showSubRooms && (
        <SubRoomManager
          roomId={roomId || ''}
          isOpen={showSubRooms}
          onClose={() => setShowSubRooms(false)}
          isKP={!!room?.isCreator}
          members={room?.members?.map(m => ({ userId: m.userId, nickname: m.nickname, avatarUrl: m.avatarUrl })) || []}
        />
      )}
      {/* ===== V2.1 新增：事件日志面板 ===== */}
      {showEventLog && (
        <RoomEventLogPanel
          roomId={roomId || ''}
          isOpen={showEventLog}
          onClose={() => setShowEventLog(false)}
          isKP={!!room?.isCreator}
        />
      )}
      {/* ===== V2.1 新增：GM 工具箱面板 ===== */}
      {showGMKit && room?.isCreator && (
        <GMKitPanel
          roomId={roomId || ''}
          isOpen={showGMKit}
          onClose={() => setShowGMKit(false)}
        />
      )}
      {/* ===== V2.1 新增：NPC 焦点面板 ===== */}
      {showNpcPanel && (
        <NpcFocusPanel
          roomId={roomId || ''}
          isOpen={showNpcPanel}
          onClose={() => setShowNpcPanel(false)}
          currentSceneId={room?.currentScene?.id}
          isKP={!!room?.isCreator}
        />
      )}
    </div>

    {/* ===== V2.1 新增：战斗时间线（底部弹层） ===== */}
    {showCombatTimeline && (
      <CombatTimeline
        roomId={roomId || ''}
        isOpen={showCombatTimeline}
        onClose={() => setShowCombatTimeline(false)}
        isKP={!!room?.isCreator}
        userId={user?.id}
      />
    )}

      {/* 选择角色弹窗 */}
      <Modal
        isOpen={showCharacterModal}
        onClose={() => navigate('/rooms')}
        title="选择调查员"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: '#8b8375' }}>
            进入房间需要绑定一个调查员角色卡
          </p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {myCharacters.length === 0 ? (
              <div className="text-center py-8">
                <EmptyState
                  icon={EmptyIcons.Investigator}
                  title="你还没有创建调查员"
                  description="先创建一位调查员，才能踏入房间。"
                  size="sm"
                  animate={false}
                />
                <Link
                  to="/characters/new"
                  className="hover:underline mt-2 inline-block"
                  style={{ color: '#a63848' }}
                >
                  创建调查员
                </Link>
              </div>
            ) : (
              myCharacters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => {
                    setSelectedCharacter(char);
                    handleJoinRoom(char.id);
                  }}
                  className="w-full p-3 rounded transition-colors text-left border border-[#3a3a3a]/40 hover:bg-[#a63848]/15 hover:border-[#a63848]/30"
                  style={{ background: 'rgba(0,0,0,0.2)', color: '#d4c5a8' }}
                >
                  <div className="font-medium">{char.name}</div>
                  <div className="text-sm" style={{ color: '#8b8375' }}>
                    {char.occupation} | HP:{char.hp} MP:{char.mp} SAN:{char.san}
                  </div>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => handleJoinRoom()}
            className="btn-v2 w-full"
            style={{ 
              background: 'rgba(0,0,0,0.3)', 
              border: '1px solid rgba(58,58,58,0.6)', 
              color: '#8b8375',
            }}
          >
            以观察者身份加入
          </button>
        </div>
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

      {/* 笔记栏和线索板 */}
      {roomId && <NotesPanel roomId={roomId} />}

      {/* ===== 新增：私聊面板 ===== */}
      {roomId && (
        <PrivateChatPanel
          roomId={roomId}
          members={room?.members || []}
          myCharacterId={selectedCharacter?.id}
          isOpen={showPrivateChat}
          onClose={() => {
            setShowPrivateChat(false);
            fetchPrivateUnreadCount(); // 关闭时刷新未读数
          }}
          unreadCount={privateUnreadCount}
        />
      )}

      {/* ===== 新增：统计面板 ===== */}
      <RoomStatsPanel
        stats={roomStats}
        isOpen={showStats}
        onClose={() => setShowStats(false)}
      />
    </div>
  );
}