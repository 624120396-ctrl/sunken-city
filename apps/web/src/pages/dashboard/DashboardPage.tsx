import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { io } from 'socket.io-client';
import { User, Scroll, Sparkles, Star, Megaphone, Coins, Gift, CheckCircle2, Loader2, Users, Ghost, Clock, Crown, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@stores/auth.store';
import { apiFetch } from '@lib/api';
import { RuneSymbol } from '@components/ui/RuneBorder';
import { SkeletonCard } from '@components/ui/EldritchLoader';
import { getMyRankTitle, UserRankInfo } from '@services/rank-title.service';
import { getAnnouncements, type Announcement } from '@services/announcement.service';
import { dailyCheckin, getOnlineUsers } from '@services/shop.service';
import { ExpBar } from '@components/ui/ExpBar';
import { useToast } from '@components/ui/Toast';
import { UserProfileModal } from '@components/UserProfileModal';
import { FeatureCard } from '@components/ui/FeatureCard';
import type { UserProfile } from '@components/UserProfileCard';

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
}

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

  // Socket 在线状态上报（ Dashboard 也需要让自己出现在深渊广场）
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
      // 同步到全局 auth store
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

  // 快捷入口数据
  const quickActions = [
    { to: '/characters/new', icon: User, title: '记录命运', subtitle: '创建调查员', gradient: 'subtle' as const },
    { to: '/rooms', icon: Scroll, title: '开启故事', subtitle: '创建跑团房间', gradient: 'default' as const },
    { to: '/rooms', icon: Sparkles, title: '进入深渊', subtitle: '加入已有跑团', gradient: 'warm' as const },
    { to: '/solo', icon: Ghost, title: '幻影脚本', subtitle: '单人剧本模式', gradient: 'default' as const },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Layer 1: 欢迎铭牌 — 第一眼，大字号 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="coc-card-important-v2 rounded-lg overflow-hidden relative corner-ornament corner-ornament-bottom"
      >
        <div
          className="h-1"
          style={{ backgroundColor: rank?.color || '#6b6558' }}
        />
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* 左侧：头像 + 身份 */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-coc-gold/20 to-coc-blood/20 border-2 border-coc-gold/40 flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 md:w-10 md:h-10 text-coc-gold" />
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
              </div>
              <div>
                <div className="text-xs text-coc-text-muted mb-1">
                  欢迎从深渊归来
                </div>
                <h1 className="text-3xl md:text-4xl font-ritual font-bold text-coc-parchment tracking-wide">
                  {user?.nickname}
                </h1>
                <Link
                  to="/ranks"
                  className="inline-flex items-center gap-1.5 mt-1 text-sm text-coc-gold hover:text-coc-gold-glow transition-colors"
                >
                  <Star size={14} />
                  <span className="font-rune">{rank?.name}</span>
                  <span className="text-coc-text-muted">· Lv.{rank?.level}</span>
                </Link>
              </div>
            </div>

            {/* 右侧：货币 + 签到 */}
            <div className="md:ml-auto flex flex-col md:items-end gap-3">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex flex-col md:items-end">
                  <div className="flex items-center gap-1.5 text-coc-parchment">
                    <Coins size={14} className="text-coc-gold" />
                    <span className="text-xl font-bold">{user?.coins ?? 0}</span>
                  </div>
                  <span className="text-[10px] text-coc-text-muted">锈蚀硬币</span>
                </div>
                <div className="flex flex-col md:items-end">
                  <div className="flex items-center gap-1.5 text-coc-parchment">
                    <Sparkles size={14} className="text-purple-400" />
                    <span className="text-xl font-bold">{user?.stardust ?? 0}</span>
                  </div>
                  <span className="text-[10px] text-coc-text-muted">虚银</span>
                </div>
              </div>
              <button
                onClick={handleCheckin}
                disabled={checkingIn || checkedInToday}
                className={[
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm transition-all',
                  checkedInToday
                    ? 'bg-coc-text-muted/10 border border-coc-text-muted/30 text-coc-text-muted cursor-default'
                    : 'bg-coc-gold/10 border border-coc-gold/40 text-coc-gold hover:bg-coc-gold/20',
                ].join(' ')}
              >
                {checkingIn ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : checkedInToday ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Gift size={14} />
                )}
                {checkedInToday ? '已签到' : checkingIn ? '签到中...' : '每日签到'}
              </button>
              {checkedInToday && checkinReward && (
                <div className="text-xs text-coc-gold">
                  已获得 +{checkinReward.coins} 锈蚀硬币
                  {checkinReward.stardust ? ` · +${checkinReward.stardust} 虚银` : ''}
                </div>
              )}
            </div>
          </div>

          {/* 经验条 */}
          {!rankLoading && rankInfo && rankInfo.nextRank && (
            <div className="mt-6 pt-4 border-t border-coc-border/50">
              <ExpBar
                current={rankInfo.exp}
                max={rankInfo.exp + rankInfo.expToNext}
                color={rank?.color || '#c9a227'}
                showPercentage
              />
              <div className="mt-2 flex justify-between text-xs text-coc-text-muted">
                <span>当前: {rankInfo.exp} SP</span>
                {rankInfo.nextRank && (
                  <span>
                    升级需: {rankInfo.expToNext} SP · 下一级: {rankInfo.nextRank.name}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Layer 2: 双栏 — 快捷入口 + 最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左侧：快捷入口 2x2 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2 space-y-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <RuneSymbol symbol="gate" size={18} className="text-coc-gold" />
              <h2 className="text-lg font-ritual font-bold tracking-wider" style={{ color: '#FFFEFC' }}>
                开启仪式
              </h2>
            </div>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(201,162,39,0.3) 0%, transparent 100%)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.to + action.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 + i * 0.05 }}
              >
                <FeatureCard
                  href={action.to}
                  icon={action.icon}
                  title={action.title}
                  subtitle={action.subtitle}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 右侧：最近活动 / 公告 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-3 space-y-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-coc-gold" />
              <h2 className="text-lg font-ritual font-bold tracking-wider" style={{ color: '#FFFEFC' }}>
                旧日低语
              </h2>
            </div>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(201,162,39,0.3) 0%, transparent 100%)' }} />
          </div>
          {/* 旧日低语容器 */}
          <div
            className="relative overflow-hidden rounded-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            {/* 牛皮纸背景 */}
            <div
              className="absolute inset-0 bg-center"
              style={{
                backgroundImage: `url(/images/card-bg-parchment.jpg)`,
                backgroundSize: '100% 100%',
              }}
            />

            {/* 磨砂玻璃内容层 */}
            <div className="relative m-2 rounded-lg bg-white/[0.03] backdrop-blur-[3px] border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)] p-5">
            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.slice(0, 3).map((ann) => (
                  <div key={ann.id} className="flex items-start gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${ann.isPinned ? 'bg-coc-gold' : 'bg-coc-text-muted'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-ritual text-sm text-coc-parchment">{ann.title}</span>
                        {ann.isPinned && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-coc-gold/20 text-coc-gold rounded">置顶</span>
                        )}
                      </div>
                      <p className="text-xs text-coc-text-muted mt-1 line-clamp-2">{ann.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-coc-text-muted">
                <Clock size={20} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无新公告</p>
              </div>
            )}
            </div>

            {/* 悬停边框微光 */}
            <div className="absolute inset-0 rounded-xl border border-coc-gold/0 hover:border-coc-gold/15 transition-colors duration-500 pointer-events-none" />
          </div>
        </motion.div>
      </div>

      {/* Layer 2: 成长之路 — 位阶 + 印记 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <RuneSymbol symbol="star" size={18} className="text-coc-gold" />
            <h2 className="text-lg font-ritual font-bold tracking-wider" style={{ color: '#FFFEFC' }}>
              成长之路
            </h2>
          </div>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(201,162,39,0.3) 0%, transparent 100%)' }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/ranks" className="group block">
            <div className="card-layer-2 p-5 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-coc-gold/10 border border-coc-gold/20 flex items-center justify-center group-hover:bg-coc-gold/20 group-hover:scale-110 transition-all duration-300">
                  <Crown className="text-coc-gold" size={22} />
                </div>
                <div>
                  <h3 className="font-ritual font-bold text-sm text-coc-parchment group-hover:text-coc-gold transition-colors">
                    位阶天梯
                  </h3>
                  <p className="text-xs text-coc-text-muted mt-1">查看位阶体系与灵魂碎片来源</p>
                </div>
              </div>
            </div>
          </Link>
          <Link to="/titles" className="group block">
            <div className="card-layer-2 p-5 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-coc-blood/10 border border-coc-blood/20 flex items-center justify-center group-hover:bg-coc-blood/20 group-hover:scale-110 transition-all duration-300">
                  <Award className="text-coc-blood-glow" size={22} />
                </div>
                <div>
                  <h3 className="font-ritual font-bold text-sm text-coc-parchment group-hover:text-coc-blood-glow transition-colors">
                    印记图鉴
                  </h3>
                  <p className="text-xs text-coc-text-muted mt-1">探索可收集的称号与成就</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Layer 2: 调查员 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RuneSymbol symbol="eye" size={18} className="text-coc-blood" />
            <h2 className="text-lg font-ritual font-bold tracking-wider" style={{ color: '#FFFEFC' }}>
              我的调查员
            </h2>
          </div>
          <Link
            to="/characters"
            className="text-sm font-rune hover:opacity-80 transition-opacity tracking-wider"
            style={{ color: '#c9a227' }}
          >
            查看全部 →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : characters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {characters.map((char, i) => (
              <motion.div
                key={char.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.3 + i * 0.05 }}
              >
                <Link to={`/characters/${char.id}`} className="group block">
                  <div className="card-layer-2 rounded-lg p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-ritual font-bold text-lg text-coc-parchment group-hover:text-coc-gold transition-colors">
                          {char.name}
                        </h3>
                        <p className="text-xs font-rune text-coc-text-muted tracking-wider">
                          {char.occupation}
                        </p>
                      </div>
                      {char.san < 30 && (
                        <span className="px-2 py-0.5 bg-coc-blood/20 border border-coc-blood/40 text-coc-blood-glow text-[10px] font-rune rounded">
                          疯狂边缘
                        </span>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-rune text-coc-text-muted w-6">HP</span>
                        <div className="flex-1 h-1 bg-coc-abyss rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${char.hp < char.maxHp * 0.3 ? 'bg-coc-blood' : 'bg-coc-parchment-dim'}`}
                            style={{ width: `${(char.hp / char.maxHp) * 100}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-rune ${char.hp < char.maxHp * 0.3 ? 'text-coc-blood' : 'text-coc-text-muted'}`}>
                          {char.hp}/{char.maxHp}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-rune text-coc-text-muted w-6">SAN</span>
                        <div className="flex-1 h-1 bg-coc-abyss rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${char.san < 30 ? 'bg-coc-blood' : 'bg-coc-gold-dim'}`}
                            style={{ width: `${(char.san / char.maxSan) * 100}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-rune ${char.san < 30 ? 'text-coc-blood' : 'text-coc-text-muted'}`}>
                          {char.san}/{char.maxSan}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="card-layer-2 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4 opacity-30">🌑</div>
            <p className="text-coc-text-muted font-ritual mb-2">暂无调查员记录在案</p>
            <p className="text-sm text-coc-text-muted mb-6">每一位伟大的调查员都有一个开始</p>
            <Link to="/characters/new" className="inline-flex items-center gap-2 px-6 py-3 btn-v2 bg-coc-blood text-coc-parchment rounded">
              <User size={18} />
              创建第一个调查员
            </Link>
          </div>
        )}
      </motion.div>

      {/* Layer 2: 深渊广场 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Users size={18} className="text-coc-gold" />
          <h2 className="text-lg font-ritual font-bold text-coc-parchment tracking-wider">
            深渊广场
          </h2>
          {!onlineLoading && (
            <span className="px-2 py-0.5 bg-coc-gold/10 border border-coc-gold/30 text-coc-gold text-xs rounded">
              {onlineCount} 人在线
            </span>
          )}
        </div>

        <div className="card-layer-2 rounded-lg p-5">
          {onlineLoading ? (
            <div className="flex items-center gap-2 text-coc-text-muted text-sm">
              <Loader2 size={16} className="animate-spin" />
              正在感应深渊中的灵魂...
            </div>
          ) : onlineUsers.length === 0 ? (
            <div className="text-center py-8 text-coc-text-muted">
              <div className="text-3xl mb-3 opacity-30">🌑</div>
              <p className="font-ritual">深渊之中空无一人</p>
              <p className="text-sm text-coc-text-muted mt-1">此刻只有你在守望这座城市</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {onlineUsers.map((u, idx) => (
                  <button
                    key={`${u.userId}-${idx}`}
                    type="button"
                    onClick={() => setSelectedOnlineUser(u)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-coc-bg-primary border border-coc-border rounded-full hover:border-coc-gold/50 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-coc-bg-secondary border border-coc-border flex items-center justify-center text-[10px] text-coc-text-muted overflow-hidden">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.nickname} className="w-full h-full object-cover" />
                      ) : (
                        u.nickname.charAt(0)
                      )}
                    </div>
                    <span className="text-sm text-coc-parchment">{u.nickname}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-coc-border/50">
                <span className="text-xs text-coc-text-muted">
                  在线灵魂会在深渊广场上显现
                </span>
                <Link
                  to="/rooms"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-coc-gold/10 border border-coc-gold/40 text-coc-gold rounded text-sm hover:bg-coc-gold/20 transition-colors"
                >
                  进入房间广场 →
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <UserProfileModal
        user={selectedOnlineUser}
        isOpen={!!selectedOnlineUser}
        onClose={() => setSelectedOnlineUser(null)}
      />
    </div>
  );
}
