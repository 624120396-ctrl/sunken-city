import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { io } from 'socket.io-client';
import { User, Scroll, Sparkles, Star, Coins, Gift, CheckCircle2, Loader2, ChevronRight, Users, Crown, Award, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@stores/auth.store';
import { apiFetch } from '@lib/api';
import { SkeletonCard } from '@components/ui/EldritchLoader';
import { getMyRankTitle, UserRankInfo } from '@services/rank-title.service';
import { getAnnouncements, type Announcement } from '@services/announcement.service';
import { dailyCheckin, getOnlineUsers } from '@services/shop.service';
import { useToast } from '@components/ui/Toast';
import { UserProfileModal } from '@components/UserProfileModal';
import type { UserProfile } from '@components/UserProfileCard';

// ===== v2.3 新质感组件 =====
import { CthulhuButton } from '@components/ui/CthulhuButton';
import { CthulhuProgress } from '@components/ui/CthulhuProgress';
import { GoldOrnament } from '@components/ui/GoldOrnament';
import { CharacterCard } from '@components/system';

interface Character {
  id: string;
  name: string;
  occupation: string;
  hp: number;
  mp: number;
  san: number;
  maxHp: number;
  maxMp: number;
  maxSan: number;
  portraitUrl?: string | null;
}

// ===== Glassmorphism 卡片（Uiverse ugly-lion-23 暗黑极简风） =====
const GlassCard = ({ children, className = '', hoverGlow = false, size = 'md' }: { children: React.ReactNode; className?: string; hoverGlow?: boolean; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };
  return (
    <div
      className={`
        relative rounded-xl overflow-hidden
        bg-coc-abyss/90
        border border-white/[0.08]
        shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]
        transition-all duration-300 ease-out
        ${hoverGlow ? 'hover:border-[#c9a227]/25 hover:shadow-[0_0_30px_rgba(201,162,39,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]' : ''}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {/* 顶部微光条 */}
      <div className="absolute top-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      {/* 左上高光点 */}
      <div className="absolute top-2 left-2 w-8 h-8 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-sm pointer-events-none" />
      {/* 内容 */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

export function DashboardPage() {
  const { user, updateUser, token } = useAuthStore();
  const { showToast } = useToast();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankInfo, setRankInfo] = useState<UserRankInfo | null>(null);
  const [rankLoading, setRankLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkinReward, setCheckinReward] = useState<{ coins: number; stardust?: number } | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<(UserProfile & { userId: string })[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(true);
  const [selectedOnlineUser, setSelectedOnlineUser] = useState<UserProfile | null>(null);
  const [whispersHovered, setWhispersHovered] = useState(false);

  useEffect(() => {
    fetchCharacters();
    fetchRankInfo();
    fetchAnnouncements();
    fetchOnlineUsers();
    refreshUser();

    const onlineInterval = setInterval(() => {
      fetchOnlineUsers();
    }, 30000);

    return () => clearInterval(onlineInterval);
  }, []);

  useEffect(() => {
    if (!token) return;
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io',
    });
    socket.on('connect', () => {
      console.log('Dashboard socket connected:', socket.id);
    });
    socket.on('online:update', (data) => {
      setOnlineCount(data.count);
      setOnlineUsers(data.users);
      setOnlineLoading(false);
    });
    return () => {
      socket.disconnect();
    };
  }, [token]);

  const fetchCharacters = async () => {
    try {
      const response = await apiFetch('/characters');
      const data = await response.json();
      if (data.success) {
        setCharacters(data.data.characters.slice(0, 3));
      }
    } catch (error) {
      console.error('获取调查员失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRankInfo = async () => {
    try {
      const info = await getMyRankTitle();
      setRankInfo(info);
      updateUser({
        rankName: info.rank?.name,
        displayedTitleName: info.displayBadge?.name,
      });
    } catch (error) {
      console.error('获取位阶信息失败:', error);
    } finally {
      setRankLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const data = await getAnnouncements(1, 3);
      setAnnouncements(data.announcements);
    } catch (error) {
      console.error('获取公告失败:', error);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const data = await getOnlineUsers();
      setOnlineCount(data.count);
      setOnlineUsers(data.users);
    } catch (error) {
      console.error('获取在线用户失败:', error);
    } finally {
      setOnlineLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await apiFetch('/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        updateUser(data.user);
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
  };

  const handleCheckin = async () => {
    try {
      setCheckingIn(true);
      const data = await dailyCheckin();
      updateUser(data.user);
      setCheckedInToday(true);
      setCheckinReward(data.reward);
      showToast(`签到成功！+${data.reward.coins} 锈蚀硬币${data.reward.stardust ? ` · +${data.reward.stardust} 虚银` : ''}`, 'success');
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('已签到')) {
        setCheckedInToday(true);
      }
      showToast('签到失败：' + msg, 'error');
    } finally {
      setCheckingIn(false);
    }
  };

  const rank = rankInfo?.rank;

  const quickActions = [
    { to: '/characters/new', icon: User, title: '记录命运', subtitle: '创建调查员', bgImage: '/dashboard-card-character.png', glowColor: 'from-[#8b2635]/40 via-transparent' },
    { to: '/rooms', icon: Scroll, title: '开启故事', subtitle: '创建跑团房间', bgImage: '/dashboard-card-room.png', glowColor: 'from-[#8b2635]/40 via-transparent' },
    { to: '/rooms', icon: Sparkles, title: '进入深渊', subtitle: '加入已有跑团', bgImage: '/dashboard-card-abyss.png', glowColor: 'from-[#8b2635]/40 via-transparent' },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* ===== Layer 1: 用户信息面板 ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        <div className="relative rounded-xl overflow-hidden border border-[#3a3a3a]/40 backdrop-blur-md bg-black/50 shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-[#8b2635]/20 hover:shadow-[0_0_30px_rgba(139,38,53,0.12)]">
          {/* 顶部金色渐变装饰线 */}
          <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#c9a227]/40 to-transparent pointer-events-none" />
          
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* 左侧：头像 + 身份 */}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-[#c9a227]/20 to-[#8b2635]/20 border-2 border-[#c9a227]/40 flex items-center justify-center overflow-hidden">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 md:w-10 md:h-10 text-[#c9a227]" />
                    )}
                  </div>
                  {user?.frameUrl && (
                    <img
                      src={user.frameUrl}
                      alt="frame"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ transform: 'scale(1.35)' }}
                    />
                  )}
                  {rank?.level && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-black/50 border border-[#c9a227]/40 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[#c9a227]">Lv.{rank.level}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-[#a69b85] mb-1">欢迎从深渊归来</div>
                  <h1 className="text-3xl md:text-4xl font-bold text-[#f5f0e6] tracking-wide">
                    {user?.nickname}
                  </h1>
                  <Link
                    to="/ranks"
                    className="inline-flex items-center gap-1.5 mt-1 text-sm text-[#c9a227] hover:text-[#e8d4a0] transition-colors"
                  >
                    <Star size={14} />
                    <span>{rank?.name}</span>
                  </Link>
                </div>
              </div>

              {/* 右侧：货币徽章 + 签到 */}
              <div className="md:ml-auto flex items-center gap-4">
                {/* 锈蚀硬币徽章 */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-12 h-12 rounded-full bg-black/50 border border-[#c9a227]/30 flex items-center justify-center shadow-[0_0_12px_rgba(201,162,39,0.15)]">
                    <Coins size={20} className="text-[#c9a227]" />
                  </div>
                  <span className="text-lg font-bold text-[#e8d4a0]">{user?.coins ?? 0}</span>
                  <span className="text-[10px] text-[#a69b85]">锈蚀硬币</span>
                </div>

                {/* 虚银徽章 */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-12 h-12 rounded-full bg-black/50 border border-purple-400/30 flex items-center justify-center shadow-[0_0_12px_rgba(139,38,53,0.15)]">
                    <Sparkles size={20} className="text-purple-400" />
                  </div>
                  <span className="text-lg font-bold text-[#e8d4a0]">{user?.stardust ?? 0}</span>
                  <span className="text-[10px] text-[#a69b85]">虚银</span>
                </div>

                <div className="ml-2">
                  <CthulhuButton
                    size="sm"
                    variant={checkedInToday ? 'ghost' : 'primary'}
                    onClick={handleCheckin}
                    disabled={checkingIn || checkedInToday}
                    icon={checkingIn ? <Loader2 size={14} className="animate-spin" /> : checkedInToday ? <CheckCircle2 size={14} /> : <Gift size={14} />}
                  >
                    {checkedInToday ? '已签到' : checkingIn ? '签到中...' : '每日签到'}
                  </CthulhuButton>
                  {checkedInToday && checkinReward && (
                    <div className="text-xs text-[#c9a227] mt-1 text-center">
                      已获得 +{checkinReward.coins} 锈蚀硬币
                      {checkinReward.stardust ? ` · +${checkinReward.stardust} 虚银` : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 经验条 */}
            {!rankLoading && rankInfo && rankInfo.nextRank && (
              <div className="mt-6 pt-4 border-t border-[#2a2a35]/50">
                <CthulhuProgress
                  type="xp"
                  current={rankInfo.exp}
                  max={rankInfo.exp + rankInfo.expToNext}
                  label={`${rankInfo.exp} SP · 下一级: ${rankInfo.nextRank.name}`}
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ===== Layer 2: Bento Grid（功能入口 + 旧日低语Glass卡片） ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* 左侧：快捷入口 2×2 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2 space-y-3"
        >
          <GoldOrnament.Title>
            <h2 className="text-lg font-bold tracking-wider text-[#c9a227] drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] px-8 py-1 bg-[url('/images/title-glow.png')] bg-cover bg-center bg-no-repeat">开启仪式</h2>
          </GoldOrnament.Title>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.to + action.title}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link to={action.to} className="block group">
                  <div className="relative h-full min-h-[140px] rounded-xl overflow-hidden border border-[#3a3a3a]/40 bg-black/50 shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-[#8b2635]/30 hover:shadow-[0_0_30px_rgba(139,38,53,0.12)]">
                    {/* 背景图（如有） */}
                    {action.bgImage && (
                      <img
                        src={action.bgImage}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    {/* 磨砂玻璃覆盖层 - 仅左侧1/5 */}
                    <div className="absolute inset-y-0 left-0 w-[22%] backdrop-blur-[13px] bg-[#0a0a0f]/30 pointer-events-none" style={{ maskImage: 'linear-gradient(to right, black 60%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 60%, transparent 100%)' }} />
                    {/* 底部血红色渐变 */}
                    <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-[#8b2635]/30 via-[#8b2635]/10 to-transparent pointer-events-none" />
                    {/* 顶部微光 */}
                    <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                    {/* 内容 */}
                    <div className="relative p-4 flex flex-col h-full min-h-[140px] max-w-[55%]">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center mb-3 group-hover:border-[#c9a227]/25 group-hover:bg-[#c9a227]/5 transition-all duration-300">
                        <action.icon size={20} className="text-[#e8d4a0]" strokeWidth={1.5} />
                      </div>
                      <h3 className="font-bold text-sm text-[#f5f0e6] tracking-wide">{action.title}</h3>
                      <p className="text-xs text-[#a69b85] mt-1">{action.subtitle}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 右侧：旧日低语（3张堆叠玻璃卡片 - ugly-lion-23 风格） */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-3"
        >
          <GoldOrnament.Title>
            <h2 className="text-lg font-bold tracking-wider text-[#c9a227] drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] px-8 py-1 bg-[url('/images/title-glow.png')] bg-cover bg-center bg-no-repeat">旧日低语</h2>
          </GoldOrnament.Title>

          <div
            className="flex justify-center items-center h-[260px] mt-3"
            onMouseEnter={() => setWhispersHovered(true)}
            onMouseLeave={() => setWhispersHovered(false)}
          >
            {/* 卡片1 - 深渊公告（左，-15deg） */}
            <div
              className="relative w-[180px] h-[220px] bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 rounded-xl flex flex-col items-center justify-center transition-all duration-500 backdrop-blur-[10px] shadow-[0_25px_25px_rgba(0,0,0,0.25)] overflow-hidden"
              style={{
                transform: whispersHovered ? 'rotate(0deg)' : 'rotate(-15deg)',
                margin: whispersHovered ? '0 10px' : '0 -45px',
                zIndex: 1,
              }}
            >
              {/* 折叠态图标 */}
              <div className={`flex flex-col items-center gap-3 transition-opacity duration-300 ${whispersHovered ? 'opacity-0' : 'opacity-100'}`}>
                <Megaphone size={40} className="text-[#c9a227]" strokeWidth={1.5} />
              </div>

              {/* 展开态内容 */}
              <div className={`absolute inset-0 p-3 pt-4 transition-opacity duration-300 ${whispersHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'} overflow-y-auto`}>
                <div className="flex items-center gap-2 mb-3">
                  <Megaphone size={14} className="text-[#c9a227]" />
                  <span className="text-xs font-bold text-[#d4c5a8] tracking-wider">深渊公告</span>
                </div>
                {announcements.length > 0 ? (
                  <div className="space-y-2.5">
                    {announcements.slice(0, 3).map((ann) => (
                      <div key={ann.id} className="flex items-start gap-2">
                        <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${ann.isPinned ? 'bg-[#c9a227]' : 'bg-[#6b6558]'}`} />
                        <div className="min-w-0">
                          <div className="text-xs text-[#f5f0e6] truncate">{ann.title}</div>
                          <p className="text-[10px] text-[#6b6558] line-clamp-1">{ann.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6b6558]">暂无新公告</p>
                )}
              </div>

              {/* 底部标签 */}
              <div className="absolute bottom-0 w-full h-10 bg-white/5 flex items-center justify-center border-t border-white/5">
                <span className="text-xs text-white/70">深渊公告</span>
              </div>
            </div>

            {/* 卡片2 - 位阶天梯（中，0deg） */}
            <Link to="/ranks" className="block">
              <div
                className="relative w-[180px] h-[220px] bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 rounded-xl flex flex-col items-center justify-center transition-all duration-500 backdrop-blur-[10px] shadow-[0_25px_25px_rgba(0,0,0,0.25)] overflow-hidden"
                style={{
                  transform: whispersHovered ? 'rotate(0deg)' : 'rotate(0deg)',
                  margin: whispersHovered ? '0 10px' : '0 -45px',
                  zIndex: 2,
                }}
              >
                {/* 折叠态图标 */}
                <div className={`flex flex-col items-center gap-3 transition-opacity duration-300 ${whispersHovered ? 'opacity-0' : 'opacity-100'}`}>
                  <Crown size={40} className="text-[#c9a227]" strokeWidth={1.5} />
                </div>

                {/* 展开态内容 */}
                <div className={`absolute inset-0 p-3 pt-4 transition-opacity duration-300 ${whispersHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'} overflow-y-auto`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Crown size={14} className="text-[#c9a227]" />
                    <span className="text-xs font-bold text-[#d4c5a8] tracking-wider">位阶天梯</span>
                  </div>
                  {!rankLoading && rank?.name ? (
                    <div className="space-y-2">
                      <div className="text-sm text-[#f5f0e6] font-bold">{rank.name}</div>
                      <div className="text-[10px] text-[#6b6558]">Lv.{rank.level}</div>
                      {rankInfo?.nextRank && (
                        <div className="mt-2">
                          <div className="h-1 bg-[#1a1a24] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#c9a227]/60 rounded-full"
                              style={{ width: `${(rankInfo.exp / (rankInfo.exp + rankInfo.expToNext)) * 100}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-[#6b6558] mt-1">{rankInfo.exp} / {rankInfo.exp + rankInfo.expToNext} SP</div>
                        </div>
                      )}
                      <div className="text-[10px] text-[#c9a227] mt-2">点击查看天梯 →</div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6b6558]">暂无位阶信息</p>
                  )}
                </div>

                {/* 底部标签 */}
                <div className="absolute bottom-0 w-full h-10 bg-white/5 flex items-center justify-center border-t border-white/5">
                  <span className="text-xs text-white/70">位阶天梯</span>
                </div>
              </div>
            </Link>

            {/* 卡片3 - 印记图鉴（右，+15deg） */}
            <Link to="/titles" className="block">
              <div
                className="relative w-[180px] h-[220px] bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 rounded-xl flex flex-col items-center justify-center transition-all duration-500 backdrop-blur-[10px] shadow-[0_25px_25px_rgba(0,0,0,0.25)] overflow-hidden"
                style={{
                  transform: whispersHovered ? 'rotate(0deg)' : 'rotate(15deg)',
                  margin: whispersHovered ? '0 10px' : '0 -45px',
                  zIndex: 1,
                }}
              >
                {/* 折叠态图标 */}
                <div className={`flex flex-col items-center gap-3 transition-opacity duration-300 ${whispersHovered ? 'opacity-0' : 'opacity-100'}`}>
                  <Award size={40} className="text-[#8b2635]" strokeWidth={1.5} />
                </div>

                {/* 展开态内容 */}
                <div className={`absolute inset-0 p-3 pt-4 transition-opacity duration-300 ${whispersHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'} overflow-y-auto`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Award size={14} className="text-[#8b2635]" />
                    <span className="text-xs font-bold text-[#d4c5a8] tracking-wider">印记图鉴</span>
                  </div>
                  <div className="space-y-2">
                    {user?.displayedTitleName ? (
                      <>
                        <div className="text-sm text-[#f5f0e6] font-bold">{user.displayedTitleName}</div>
                        <div className="text-[10px] text-[#6b6558]">当前佩戴称号</div>
                      </>
                    ) : (
                      <p className="text-xs text-[#6b6558]">尚未佩戴任何称号</p>
                    )}
                    <div className="text-[10px] text-[#c9a227] mt-2">查看全部称号 →</div>
                  </div>
                </div>

                {/* 底部标签 */}
                <div className="absolute bottom-0 w-full h-10 bg-white/5 flex items-center justify-center border-t border-white/5">
                  <span className="text-xs text-white/70">印记图鉴</span>
                </div>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ===== Layer 3: 调查员 ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-3">
          <GoldOrnament.Title>
            <h2 className="text-lg font-bold tracking-wider text-[#c9a227] drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] px-8 py-1 bg-[url('/images/title-glow.png')] bg-cover bg-center bg-no-repeat">我的调查员</h2>
          </GoldOrnament.Title>
          <Link to="/characters" className="text-sm hover:opacity-80 transition-opacity tracking-wider text-[#c9a227]">
            查看全部 →
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-80">
                <SkeletonCard />
              </div>
            ))}
          </div>
        ) : characters.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
            {characters.map((char, i) => (
              <motion.div
                key={char.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="flex-shrink-0 w-80"
              >
                <CharacterCard character={char} />
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-[#1a1a24] border border-[#2a2a35] flex items-center justify-center mx-auto mb-4">
              <User size={24} className="text-[#6b6558]" />
            </div>
            <p className="text-[#a69b85] font-bold mb-1">暂无调查员记录在案</p>
            <p className="text-sm text-[#6b6558] mb-6">每一位伟大的调查员都有一个开始</p>
            <Link to="/characters/new">
              <CthulhuButton size="md" variant="primary" icon={<User size={18} />}>
                创建第一个调查员
              </CthulhuButton>
            </Link>
          </GlassCard>
        )}
      </motion.div>

      {/* ===== Layer 4: 深渊广场（最底部大入口） ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-3">
          <GoldOrnament.Title>
            <h2 className="text-lg font-bold tracking-wider text-[#c9a227] drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] px-8 py-1 bg-[url('/images/title-glow.png')] bg-cover bg-center bg-no-repeat">深渊广场</h2>
          </GoldOrnament.Title>
          {!onlineLoading && (
            <span className="px-2.5 py-1 bg-[#c9a227]/10 border border-[#c9a227]/30 text-[#c9a227] text-xs rounded-md font-medium">
              {onlineCount} 人在线
            </span>
          )}
        </div>

        <GlassCard hoverGlow size="lg" className="relative backdrop-blur-md bg-black/50">
          {/* 背景装饰 */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#c9a227]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#8b2635]/5 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="relative">
            {onlineLoading ? (
              <div className="flex items-center gap-2 text-[#a69b85] text-sm">
                <Loader2 size={16} className="animate-spin" />
                正在感应深渊中的灵魂...
              </div>
            ) : onlineUsers.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full bg-[#1a1a24] border border-[#2a2a35] flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-[#6b6558]" />
                </div>
                <p className="font-bold text-lg text-[#d4c5a8]">深渊之中空无一人</p>
                <p className="text-sm text-[#6b6558] mt-1">此刻只有你在守望这座城市</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {onlineUsers.map((u, idx) => (
                    <button
                      key={`${u.userId}-${idx}`}
                      type="button"
                      onClick={() => setSelectedOnlineUser(u)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#12121a] border border-[#2a2a35] rounded-full hover:border-[#c9a227]/30 hover:bg-[#1a1a24] transition-all"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#0a0a0f] border border-[#2a2a35] flex items-center justify-center text-[10px] text-[#6b6558] overflow-hidden">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.nickname} className="w-full h-full object-cover" />
                        ) : (
                          u.nickname.charAt(0)
                        )}
                      </div>
                      <span className="text-sm text-[#d4c5a8]">{u.nickname}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#2a2a35]/40">
              <span className="text-xs text-[#6b6558]">在线灵魂会在深渊广场上显现</span>
              <Link to="/rooms">
                <CthulhuButton size="sm" icon={<ChevronRight size={14} />}>
                  进入房间广场
                </CthulhuButton>
              </Link>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <UserProfileModal
        user={selectedOnlineUser}
        isOpen={!!selectedOnlineUser}
        onClose={() => setSelectedOnlineUser(null)}
      />
    </div>
  );
}
