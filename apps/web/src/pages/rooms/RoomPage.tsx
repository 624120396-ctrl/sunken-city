import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, Send, Crown, DoorOpen, Dice5, Swords, Shield, Play, Square, SkipForward, FileText, History, MessageSquare, BarChart3, Timer, User } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { useAuthStore } from '@stores/auth.store';
import { Modal } from '@components/ui/Modal';
import { Tooltip } from '@components/ui/Tooltip';
import { StatusBar } from '@components/ui/StatusBar';
import { UserProfileCard } from '@components/UserProfileCard';
import { useSocket } from '@hooks/useSocket';
import { getSuccessExplanation, getSkillExplanation } from '@lib/dice-explanations';
import { QuickPhrases } from '@components/room/QuickPhrases';
import { MentionInput } from '@components/room/MentionInput';
import { SecretDiceToggle } from '@components/room/SecretDiceToggle';
import { NotesPanel } from '@components/room/NotesPanel';
import { ClueMarker, ClueBoard } from '@components/room/ClueMarker';
import { DoubleBezelCard } from '@components/ui/DoubleBezelCard';
import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { MagneticButton } from '@components/ui/MagneticButton';
import { PlayerHud } from '@components/room/PlayerHud';

// ===== 新增沉浸式体验组件 =====
import { SceneCard } from '@components/room/SceneCard';
import { StatusTags } from '@components/room/StatusTags';
import { PrivateChatPanel } from '@components/room/PrivateChatPanel';
import { QuickRollBar } from '@components/room/QuickRollBar';
import { CountdownPanel } from '@components/room/CountdownPanel';
import { RoomStatsPanel } from '@components/room/RoomStatsPanel';
import { StaggerList, StaggerItem } from '@components/ui/Animation';

interface Room {
  id: string;
  roomId: string;
  name: string;
  description?: string;
  status: string;
  isCreator: boolean;
  isMember: boolean;
  members: RoomMember[];
  // 新增字段
  atmosphere?: string;
  sceneDesc?: string;
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
  };
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
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
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
  const [countdowns, setCountdowns] = useState<Array<{
    id: string;
    title: string;
    duration: number;
    remaining: number;
    isActive: boolean;
  }>>([]);
  const [showStats, setShowStats] = useState(false);
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

  // 创建倒计时
  const createCountdown = async (title: string, duration: number) => {
    try {
      await apiFetch(`/rooms/${roomId}/countdowns`, {
        method: 'POST',
        body: JSON.stringify({ title, duration }),
      });
      fetchCountdowns();
    } catch (error) {
      console.error('创建倒计时失败:', error);
    }
  };

  // 停止倒计时
  const stopCountdown = async (countdownId: string) => {
    try {
      await apiFetch(`/rooms/${roomId}/countdowns/${countdownId}/stop`, {
        method: 'POST',
      });
      fetchCountdowns();
    } catch (error) {
      console.error('停止倒计时失败:', error);
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link to="/rooms" className="btn-v2 coc-btn-secondary p-2">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-serif font-bold">{room?.name}</h1>
            <p className="text-sm text-coc-text-secondary">#{room?.roomId}</p>
          </div>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} title={connected ? '已连接' : '未连接'} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'chat' ? 'combat' : 'chat')}
            className="btn-v2 coc-btn-secondary text-sm flex items-center gap-1"
          >
            {activeTab === 'chat' ? <Swords size={14} /> : <Send size={14} />}
            {activeTab === 'chat' ? '战斗' : '聊天'}
          </button>
          {/* ===== 新增：私聊按钮 ===== */}
          <button
            onClick={() => setShowPrivateChat(true)}
            className="btn-v2 coc-btn-secondary text-sm flex items-center gap-1 relative"
          >
            <MessageSquare size={14} />
            私聊
            {privateUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-coc-accent-red text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {privateUnreadCount}
              </span>
            )}
          </button>
          {/* ===== 新增：统计按钮 ===== */}
          <button
            onClick={() => {
              fetchRoomStats();
              setShowStats(true);
            }}
            className="btn-v2 coc-btn-secondary text-sm flex items-center gap-1"
          >
            <BarChart3 size={14} />
            统计
          </button>
          <Link
            to={`/rooms/${roomId}/report`}
            className="btn-v2 coc-btn-secondary text-sm flex items-center gap-1"
          >
            <FileText size={14} />
            报告
          </Link>
          <Link
            to={`/rooms/${roomId}/dice-history`}
            className="btn-v2 coc-btn-secondary text-sm flex items-center gap-1"
          >
            <History size={14} />
            投骰
          </Link>
          <button
            onClick={handleLeaveRoom}
            className="btn-v2 coc-btn-secondary text-sm flex items-center gap-1"
          >
            <DoorOpen size={14} />
            离开
          </button>
          {room?.isCreator && (
            <button
              onClick={handleCloseRoom}
              className="btn-v2 coc-btn-secondary text-sm text-red-400 hover:text-red-300"
            >
              关闭房间
            </button>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 grid-rows-[minmax(0,1fr)]">
        {/* 左侧：成员列表 */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto min-h-0">
          {/* 当前状态条 - 自己的角色 */}
          {selectedCharacter && (
            <DoubleBezelCard variant="blood" runeCorners glow innerClassName="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Shield size={16} />
                我的状态
              </h3>
              <div className="space-y-3">
                <Tooltip content="生命值。归零时昏迷，负值时濒死">
                  <StatusBar
                    label="HP"
                    current={selectedCharacter.hp}
                    max={selectedCharacter.maxHp || selectedCharacter.hp || 10}
                    color="red"
                  />
                </Tooltip>
                <Tooltip content="魔法值。施法消耗，每8小时恢复1点">
                  <StatusBar
                    label="MP"
                    current={selectedCharacter.mp}
                    max={selectedCharacter.maxMp || selectedCharacter.mp || 10}
                    color="cyan"
                  />
                </Tooltip>
                <Tooltip content="理智值。遭遇恐怖事件时检定，归零时疯狂">
                  <StatusBar
                    label="SAN"
                    current={selectedCharacter.san}
                    max={selectedCharacter.maxSan || selectedCharacter.san || 50}
                    color="gold"
                  />
                </Tooltip>
              </div>
            </DoubleBezelCard>
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

          <DoubleBezelCard variant="gold" runeCorners innerClassName="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Users size={16} />
              调查员 ({room?.members.length || 0})
            </h3>
            <div className="space-y-2">
              {room?.members.map((member) => (
                <div
                  key={member.id}
                  className="p-2 bg-coc-bg-tertiary rounded flex items-center justify-between cursor-pointer hover:bg-coc-bg-primary transition-colors"
                  onClick={() => {
                    setSelectedMember(member);
                    setShowMemberDetail(true);
                  }}
                >
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{member.nickname}</span>
                      {member.role === 'KP' && (
                        <Crown size={12} className="text-coc-accent-gold" />
                      )}
                    </div>
                    {member.character && (
                      <div className="text-xs text-coc-text-secondary">
                        {member.character.name}
                      </div>
                    )}
                    {/* ===== 新增：状态标记 ===== */}
                    {memberStatuses[member.id]?.length > 0 && (
                      <div className="mt-1">
                        <StatusTags tags={memberStatuses[member.id]} size="sm" />
                      </div>
                    )}
                  </div>
                  {member.character ? (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-1 text-xs">
                        <Tooltip content={`生命值 ${member.character.hp}/${member.character.maxHp || member.character.hp}`}>
                          <span className="text-coc-accent-red cursor-help">{member.character.hp}HP</span>
                        </Tooltip>
                        <Tooltip content={`魔法值 ${member.character.mp}/${member.character.maxMp || member.character.mp}`}>
                          <span className="text-coc-accent-cyan cursor-help">{member.character.mp}MP</span>
                        </Tooltip>
                        <Tooltip content={`理智值 ${member.character.san}/${member.character.maxSan || member.character.san}`}>
                          <span className="text-yellow-400 cursor-help">{member.character.san}SAN</span>
                        </Tooltip>
                      </div>
                      {/* ===== 新增：KP可编辑状态标记 ===== */}
                      {room?.isCreator && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <StatusTags
                            tags={memberStatuses[member.id] || []}
                            isEditable={true}
                            onChange={(tags) => updateMemberStatus(member.id, tags)}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-coc-text-muted">观察者</span>
                  )}
                </div>
              ))}
            </div>
          </DoubleBezelCard>

          {/* 快捷投骰 - 基于角色技能 */}
          {activeTab === 'chat' && selectedCharacter && (
            <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Dice5 size={16} />
                快捷检定
              </h3>

              {(() => {
                // 解析角色技能
                const skills = selectedCharacter.skills ?
                  (typeof selectedCharacter.skills === 'string' ? JSON.parse(selectedCharacter.skills) : selectedCharacter.skills)
                  : {};

                // 常见技能列表（优先显示）
                const commonSkills = [
                  { key: '侦查', default: 25 },
                  { key: '聆听', default: 20 },
                  { key: '图书馆', default: 20 },
                  { key: '心理学', default: 10 },
                  { key: '话术', default: 5 },
                  { key: '格斗', default: 25 },
                  { key: '闪避', default: selectedCharacter.dex ? selectedCharacter.dex / 2 : 25 },
                  { key: '幸运', default: selectedCharacter.luck || 50 },
                ];

                // 获取实际技能值
                const skillList = commonSkills.map(s => ({
                  name: s.key,
                  value: skills[s.key] || s.default,
                }));

                // 添加其他高于默认的技能
                Object.entries(skills).forEach(([key, value]) => {
                  if (!commonSkills.find(s => s.key === key) && typeof value === 'number' && value > 0) {
                    skillList.push({ name: key, value });
                  }
                });

                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {skillList.slice(0, 8).map((skill) => (
                        <Tooltip key={skill.name} content={getSkillExplanation(skill.name)}>
                          <button
                            onClick={() => handleRollDice(skill.name, skill.value)}
                            className="text-sm p-2 bg-coc-bg-tertiary rounded hover:bg-coc-accent-red/20 transition-colors text-left"
                          >
                            <div className="font-medium">{skill.name}</div>
                            <div className="text-xs text-coc-accent-gold">{skill.value}%</div>
                          </button>
                        </Tooltip>
                      ))}
                    </div>

                    {/* 其他技能折叠区 */}
                    {skillList.length > 8 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-coc-text-secondary hover:text-coc-text-primary py-1">
                          更多技能 ({skillList.length - 8})
                        </summary>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {skillList.slice(8).map((skill) => (
                            <Tooltip key={skill.name} content={getSkillExplanation(skill.name)}>
                              <button
                                onClick={() => handleRollDice(skill.name, skill.value)}
                                className="text-sm p-2 bg-coc-bg-tertiary rounded hover:bg-coc-accent-red/20 transition-colors text-left"
                              >
                                <div className="font-medium">{skill.name}</div>
                                <div className="text-xs text-coc-accent-gold">{skill.value}%</div>
                              </button>
                            </Tooltip>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })()}
            </DoubleBezelCard>
          )}

          {/* 快捷投骰 - 无角色时显示默认 */}
          {activeTab === 'chat' && !selectedCharacter && (
            <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Dice5 size={16} />
                快捷检定
              </h3>
              <p className="text-sm text-coc-text-muted">加入房间后使用角色技能</p>
            </DoubleBezelCard>
          )}

          {/* ===== 新增：倒计时器 ===== */}
          <DoubleBezelCard variant="gold" runeCorners innerClassName="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Timer size={16} className="text-coc-accent-gold" />
              <h3 className="font-bold">倒计时</h3>
            </div>
            <CountdownPanel
              countdowns={countdowns}
              isKP={!!room?.isCreator}
              onCreate={createCountdown}
              onStop={stopCountdown}
            />
          </DoubleBezelCard>

          {/* 战斗控制 */}
          {activeTab === 'combat' && room?.isCreator && (
            <DoubleBezelCard variant="blood" runeCorners innerClassName="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Swords size={16} />
                战斗控制
              </h3>
              <div className="space-y-2">
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
                      className="w-full mt-2 text-red-400 flex items-center justify-center gap-2"
                    >
                      <Square size={16} /> 结束战斗
                    </MagneticButton>
                  </>
                )}
              </div>
            </DoubleBezelCard>
          )}
        </div>

        {/* 右侧：聊天/战斗区 */}
        <div className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
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
                        {sender?.frameUrl && (
                          <img
                            src={sender.frameUrl}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ transform: 'scale(1.35)' }}
                            alt=""
                          />
                        )}
                      </div>
                    );

                    if (isSystem) {
                      return (
                        <StaggerItem key={msg.id}>
                          <div className="flex justify-center">
                            <div className="max-w-[85%] px-4 py-2 rounded-lg bg-coc-gold/10 border border-coc-gold/50 italic text-sm text-coc-text-primary text-center shadow-sm">
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
                            className={`max-w-[75%] px-3 py-2 rounded-lg relative group border border-coc-border/40 shadow-sm ${
                              msg.type === 'dice'
                                ? 'bg-coc-bg-tertiary border-coc-gold/30'
                                : isMe
                                ? 'bg-coc-bg-tertiary border-l-2 border-l-coc-gold border-coc-border/40'
                                : 'bg-coc-bg-tertiary'
                            }`}
                          >
                            <div className="text-sm font-bold mb-0.5 flex items-center gap-1.5">
                              {isKPMessage ? (
                                <>
                                  <Crown size={14} className="text-coc-accent-gold" />
                                  <span className="text-coc-accent-gold">{msg.nickname}</span>
                                </>
                              ) : (
                                <span className="text-coc-text-primary">{msg.nickname}</span>
                              )}
                              {isMe && <span className="text-xs font-normal text-coc-text-muted">(我)</span>}
                              <span className="text-xs font-normal text-coc-text-muted ml-auto">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-coc-text-primary">{msg.content}</p>

                            {msg.type === 'dice' && msg.rollData?.successLevel && (
                              <div className="text-xs mt-1 pt-1 border-t border-coc-border text-coc-text-muted">
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
                                  nickname={msg.nickname}
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
                className="p-4 border-t border-coc-border space-y-2 flex-shrink-0"
              >
                <div className="flex items-center gap-2">
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
                    <Swords size={48} className="mx-auto text-coc-text-muted mb-4" />
                    <p className="text-coc-text-secondary">战斗未开始</p>
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
                    <p className="text-coc-text-secondary">战斗已结束</p>
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
                  <div className="p-4 border-b border-coc-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-coc-accent-red font-bold">第 {combatState.currentRound} 回合</span>
                        <span className="mx-2">|</span>
                        <span>当前: {combatState.turnOrder[combatState.currentTurnIndex]?.nickname}</span>
                      </div>
                      {isMyTurn && <span className="text-coc-accent-gold animate-pulse">你的回合</span>}
                    </div>
                  </div>

                  {/* 行动顺序 */}
                  <div className="p-4 border-b border-coc-border">
                    <h4 className="text-sm text-coc-text-secondary mb-2">行动顺序</h4>
                    <div className="flex gap-2 overflow-x-auto">
                      {combatState.turnOrder.map((c, i) => (
                        <div
                          key={c.userId}
                          className={`flex-shrink-0 p-2 rounded ${
                            i === combatState.currentTurnIndex
                              ? 'bg-coc-accent-red text-white'
                              : 'bg-coc-bg-tertiary'
                          }`}
                        >
                          <div className="text-sm font-medium">{c.nickname}</div>
                          <div className="text-xs">HP: {c.hp}/{c.maxHp}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 战斗日志 */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {combatState.log.map((entry) => (
                      <div key={entry.id} className="text-sm">
                        <span className="text-coc-text-muted">[{entry.round}]</span>{' '}
                        <span className="text-coc-accent-gold">{entry.actor}</span>{' '}
                        <span>{entry.action}</span>
                        {entry.target && <span className="text-coc-accent-cyan"> → {entry.target}</span>}
                        <span className="text-coc-text-secondary">: {entry.result}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </DoubleBezelCard>
          )}
        </div>
      </div>

      {/* 选择角色弹窗 */}
      <Modal
        isOpen={showCharacterModal}
        onClose={() => navigate('/rooms')}
        title="选择调查员"
      >
        <div className="space-y-4">
          <p className="text-sm text-coc-text-secondary">
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
                  className="text-coc-accent-red hover:underline mt-2 inline-block"
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
                  className="w-full p-3 bg-coc-bg-tertiary rounded hover:bg-coc-accent-red/20 transition-colors text-left"
                >
                  <div className="font-medium">{char.name}</div>
                  <div className="text-sm text-coc-text-secondary">
                    {char.occupation} | HP:{char.hp} MP:{char.mp} SAN:{char.san}
                  </div>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => handleJoinRoom()}
            className="btn-v2 w-full coc-btn-secondary"
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
                <div className="p-3 bg-coc-bg-tertiary rounded">
                  <div className="text-sm text-coc-text-secondary mb-2">选择武器</div>
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
                                ? 'bg-coc-accent-red/20 border border-coc-accent-red'
                                : 'hover:bg-coc-bg-primary'
                            }`}
                          >
                            <span>{w.name} {isEquipped && <span className="text-coc-accent-red">(已装备)</span>}</span>
                            <span className="text-coc-accent-gold">{w.damage}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-sm text-coc-text-muted">徒手 (1D3伤害)</div>
                    )}
                  </div>
                </div>
              )}

          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">攻击目标</label>
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
            <div className="text-xs text-coc-text-secondary">
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

      {/* SAN 扣除弹窗 */}
      <Modal
        isOpen={showSanityModal}
        onClose={() => setShowSanityModal(false)}
        title="理智侵蚀"
      >
        <div className="space-y-4 w-[320px] md:w-[400px]">
          <p className="text-sm text-coc-text-secondary">
            为遭遇恐怖的调查员扣除理智。单次损失 ≥ 5 且智力检定成功（≤INT）时，将陷入 1D10 小时临时疯狂。
          </p>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {room?.members.filter(m => m.character).map((member) => (
              <div key={member.userId} className="flex items-center justify-between p-2 rounded bg-coc-bg-tertiary">
                <div className="text-sm">
                  {member.nickname}
                  <span className="text-coc-text-muted ml-1">({member.character!.name}) [{member.character!.san}SAN]</span>
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
                  className="w-16 px-2 py-1 rounded bg-coc-bg-primary border border-coc-border text-center text-sm"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-coc-text-secondary">场景描述（可选）</label>
            <textarea
              value={sanityDescription}
              onChange={(e) => setSanityDescription(e.target.value)}
              placeholder="例如：目睹深潜者从海中浮现..."
              className="w-full mt-1 px-3 py-2 rounded bg-coc-bg-primary border border-coc-border text-sm resize-none"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowSanityModal(false)}
              className="px-4 py-2 rounded text-sm border border-coc-border hover:bg-coc-bg-tertiary"
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
      {roomId && <ClueBoard roomId={roomId} clues={clues} onAddClue={addClue} />}

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