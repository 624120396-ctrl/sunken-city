import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { User, Scroll, Sparkles, Crown, Award, Star, Megaphone, Coins, Gift, CheckCircle2, Loader2, Users, Ghost } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@stores/auth.store';
import { apiFetch } from '@lib/api';
import { RuneBorder, RuneSymbol } from '@components/ui/RuneBorder';
import { SkeletonCard } from '@components/ui/EldritchLoader';
import { getMyRankTitle, UserRankInfo } from '@services/rank-title.service';
import { getAnnouncements, type Announcement } from '@services/announcement.service';
import { dailyCheckin, getOnlineUsers } from '@services/shop.service';
import { ExpBar } from '@components/ui/ExpBar';
import { UserProfileModal } from '@components/UserProfileModal';
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
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('已签到')) {
        setCheckedInToday(true);
      }
      alert('签到失败：' + msg);
    } finally {
      setCheckingIn(false);
    }
  };

  const rank = rankInfo?.rank;

  return (
    <div className="space-y-8 pb-8">
      {/* 公告区域 */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`p-4 rounded border ${
                ann.isPinned
                  ? 'border-coc-gold/40 bg-coc-gold/5'
                  : 'border-coc-void bg-coc-abyss/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <Megaphone className={`w-5 h-5 shrink-0 mt-0.5 ${ann.isPinned ? 'text-coc-gold' : 'text-coc-parchment-dim'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-ritual font-bold text-coc-parchment">{ann.title}</span>
                    {ann.isPinned && (
                      <span className="text-xs px-2 py-0.5 bg-coc-gold/20 text-coc-gold rounded">置顶</span>
                    )}
                  </div>
                  <p className="text-sm text-coc-parchment-dim whitespace-pre-line">{ann.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 欢迎区域 - 方案 D 独立铭牌卡片 */}
      <div className="bg-coc-bg-tertiary border border-coc-border rounded-lg overflow-hidden">
        {/* 位阶色条 */}
        <div
          className="h-1.5"
          style={{ backgroundColor: rank?.color || '#6b6558' }}
        />

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            {/* 左侧：头像 + 位阶 */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-coc-gold/20 to-coc-blood/20 border-2 border-coc-gold/40 flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-coc-gold" />
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
                <div className="text-xs text-coc-text-muted mb-0.5">
                  欢迎从深渊归来，调查员
                </div>
                <h1 className="text-2xl font-ritual font-bold text-coc-parchment tracking-wide">
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
            <div className="text-right space-y-2 flex-shrink-0">
              <div className="flex items-center justify-end gap-4 text-sm">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-coc-parchment">
                    <Coins size={14} className="text-coc-gold" />
                    <span className="font-bold">{user?.coins ?? 0}</span>
                  </div>
                  <span className="text-[10px] text-coc-text-muted">锈蚀硬币</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-coc-parchment">
                    <Sparkles size={14} className="text-purple-400" />
                    <span className="font-bold">{user?.stardust ?? 0}</span>
                  </div>
                  <span className="text-[10px] text-coc-text-muted">虚银</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <button
                  onClick={handleCheckin}
                  disabled={checkingIn || checkedInToday}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all',
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
                  <div className="text-xs text-coc-gold animate-in fade-in slide-in-from-top-1 duration-500">
                    获得 +{checkinReward.coins} 锈蚀硬币
                    {checkinReward.stardust ? ` · +${checkinReward.stardust} 虚银` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 底部：全宽大经验条 */}
          {!rankLoading && rankInfo && rankInfo.nextRank && (
            <div className="mt-5 pt-4 border-t border-coc-border/50">
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
      </div>

      {/* 快速操作 - v1.1 符文卡片 */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <RuneSymbol symbol="gate" size={20} className="text-coc-gold" />
          <h2 className="text-xl font-ritual font-bold text-coc-parchment tracking-wider">
            开启仪式
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            to="/characters/new" 
            className="group"
          >
            <RuneBorder 
              variant="blood" 
              intensity="subtle"
              className="coc-card-hover"
            >
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-coc-blood/10 border border-coc-blood/20 
                                  flex items-center justify-center 
                                  group-hover:bg-coc-blood/20 group-hover:scale-110
                                  transition-all duration-300">
                    <User className="text-coc-blood" size={28} />
                  </div>
                  <div>
                    <h3 className="font-ritual font-bold text-lg text-coc-parchment group-hover:text-coc-blood-glow transition-colors">
                      记录命运
                    </h3>
                    <p className="text-sm text-coc-parchment-dim">
                      创建新的调查员
                    </p>
                  </div>
                </div>
              </div>
            </RuneBorder>
          </Link>

          <Link 
            to="/rooms" 
            className="group"
          >
            <RuneBorder 
              variant="gold" 
              intensity="subtle"
              className="coc-card-hover"
            >
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-coc-gold/10 border border-coc-gold/20 
                                  flex items-center justify-center 
                                  group-hover:bg-coc-gold/20 group-hover:scale-110
                                  transition-all duration-300">
                    <Scroll className="text-coc-gold" size={28} />
                  </div>
                  <div>
                    <h3 className="font-ritual font-bold text-lg text-coc-parchment group-hover:text-coc-gold-glow transition-colors">
                      开启故事
                    </h3>
                    <p className="text-sm text-coc-parchment-dim">
                      创建新的跑团房间
                    </p>
                  </div>
                </div>
              </div>
            </RuneBorder>
          </Link>

          <Link 
            to="/rooms" 
            className="group"
          >
            <RuneBorder 
              variant="madness" 
              intensity="subtle"
              className="coc-card-hover"
            >
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-coc-madness/10 border border-coc-madness/20 
                                  flex items-center justify-center 
                                  group-hover:bg-coc-madness/20 group-hover:scale-110
                                  transition-all duration-300">
                    <Sparkles className="text-coc-madness-glow" size={28} />
                  </div>
                  <div>
                    <h3 className="font-ritual font-bold text-lg text-coc-parchment group-hover:text-coc-madness-glow transition-colors">
                      进入深渊
                    </h3>
                    <p className="text-sm text-coc-parchment-dim">
                      加入已有的跑团
                    </p>
                  </div>
                </div>
              </div>
            </RuneBorder>
          </Link>

          <Link 
            to="/solo" 
            className="group"
          >
            <RuneBorder 
              variant="blood" 
              intensity="subtle"
              className="coc-card-hover"
            >
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-coc-blood/10 border border-coc-blood/20 
                                  flex items-center justify-center 
                                  group-hover:bg-coc-blood/20 group-hover:scale-110
                                  transition-all duration-300">
                    <Ghost className="text-coc-blood" size={28} />
                  </div>
                  <div>
                    <h3 className="font-ritual font-bold text-lg text-coc-parchment group-hover:text-coc-blood-glow transition-colors">
                      幻影脚本
                    </h3>
                    <p className="text-sm text-coc-parchment-dim">
                      进入单人剧本模式
                    </p>
                  </div>
                </div>
              </div>
            </RuneBorder>
          </Link>
        </div>
      </div>

      {/* 位阶与印记 - v1.1 */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <RuneSymbol symbol="star" size={20} className="text-coc-gold" />
          <h2 className="text-xl font-ritual font-bold text-coc-parchment tracking-wider">
            成长之路
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/ranks" className="group">
            <RuneBorder variant="gold" intensity="subtle" className="coc-card-hover">
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-coc-gold/10 border border-coc-gold/20 
                                  flex items-center justify-center 
                                  group-hover:bg-coc-gold/20 group-hover:scale-110
                                  transition-all duration-300">
                    <Crown className="text-coc-gold" size={28} />
                  </div>
                  <div>
                    <h3 className="font-ritual font-bold text-lg text-coc-parchment group-hover:text-coc-gold-glow transition-colors">
                      位阶天梯
                    </h3>
                    <p className="text-sm text-coc-parchment-dim">
                      查看位阶体系与灵魂碎片来源
                    </p>
                  </div>
                </div>
              </div>
            </RuneBorder>
          </Link>

          <Link to="/titles" className="group">
            <RuneBorder variant="madness" intensity="subtle" className="coc-card-hover">
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-coc-madness/10 border border-coc-madness/20 
                                  flex items-center justify-center 
                                  group-hover:bg-coc-madness/20 group-hover:scale-110
                                  transition-all duration-300">
                    <Award className="text-coc-madness-glow" size={28} />
                  </div>
                  <div>
                    <h3 className="font-ritual font-bold text-lg text-coc-parchment group-hover:text-coc-madness-glow transition-colors">
                      印记图鉴
                    </h3>
                    <p className="text-sm text-coc-parchment-dim">
                      探索可收集的称号与成就
                    </p>
                  </div>
                </div>
              </div>
            </RuneBorder>
          </Link>
        </div>
      </div>

      {/* 我的调查员 - v1.1 符文风格 */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <RuneSymbol symbol="eye" size={20} className="text-coc-blood" />
            <h2 className="text-xl font-ritual font-bold text-coc-parchment tracking-wider">
              我的调查员
            </h2>
          </div>
          
          <Link 
            to="/characters" 
            className="text-sm font-rune text-coc-gold hover:text-coc-gold-glow transition-colors tracking-wider"
          >
            查看全部 →
          </Link>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : characters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {characters.map((char) => (
              <Link
                key={char.id}
                to={`/characters/${char.id}`}
                className="group"
              >
                <RuneBorder 
                  variant={char.san < 30 ? 'madness' : 'default'}
                  intensity="subtle"
                  className="coc-card-hover"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-ritual font-bold text-xl text-coc-parchment group-hover:text-coc-gold transition-colors">
                          {char.name}
                        </h3>
                        <p className="text-sm font-rune text-coc-parchment-dim tracking-wider">
                          {char.occupation}
                        </p>
                      </div>
                      
                      {/* 状态指示 */}
                      {char.san < 30 && (
                        <span className="px-2 py-0.5 bg-coc-madness/20 border border-coc-madness/40 
                                         text-coc-madness-glow text-xs font-rune rounded">
                          疯狂边缘
                        </span>
                      )}
                      {char.hp < char.maxHp * 0.3 && char.san >= 30 && (
                        <span className="px-2 py-0.5 bg-coc-blood/20 border border-coc-blood/40 
                                         text-coc-blood-glow text-xs font-rune rounded">
                          重伤
                        </span>
                      )}
                    </div>
                    
                    {/* 状态条 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-rune text-coc-parchment-faded w-8">HP</span>
                        <div className="flex-1 h-1.5 bg-coc-abyss rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              char.hp < char.maxHp * 0.3 
                                ? 'bg-coc-blood' 
                                : 'bg-coc-parchment-dim'
                            }`}
                            style={{ width: `${(char.hp / char.maxHp) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs font-rune ${
                          char.hp < char.maxHp * 0.3 ? 'text-coc-blood' : 'text-coc-parchment-dim'
                        }`}>
                          {char.hp}/{char.maxHp}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-rune text-coc-parchment-faded w-8">SAN</span>
                        <div className="flex-1 h-1.5 bg-coc-abyss rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              char.san < 30 
                                ? 'bg-coc-madness' 
                                : 'bg-coc-gold-dim'
                            }`}
                            style={{ width: `${(char.san / char.maxSan) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs font-rune ${
                          char.san < 30 ? 'text-coc-madness-glow' : 'text-coc-parchment-dim'
                        }`}>
                          {char.san}/{char.maxSan}
                        </span>
                      </div>
                    </div>
                  </div>
                </RuneBorder>
              </Link>
            ))}
          </div>
        ) : (
          <RuneBorder variant="default" intensity="subtle">
            <div className="p-12 text-center">
              <div className="text-4xl mb-4 opacity-30">🌑</div>
              <p className="text-coc-parchment-dim font-ritual mb-2">
                暂无调查员记录在案
              </p>
              <p className="text-sm text-coc-parchment-faded mb-6">
                每一位伟大的调查员都有一个开始
              </p>
              <Link 
                to="/characters/new" 
                className="inline-flex items-center gap-2 px-6 py-3 coc-btn-blood"
              >
                <User size={18} />
                创建第一个调查员
              </Link>
            </div>
          </RuneBorder>
        )}
      </div>
      {/* 深渊广场 - 在线调查员 */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Users size={20} className="text-coc-gold" />
          <h2 className="text-xl font-ritual font-bold text-coc-parchment tracking-wider">
            深渊广场
          </h2>
          {!onlineLoading && (
            <span className="px-2 py-0.5 bg-coc-gold/10 border border-coc-gold/30 text-coc-gold text-xs rounded">
              {onlineCount} 人在线
            </span>
          )}
        </div>

        <div className="bg-coc-bg-tertiary border border-coc-border rounded-lg p-6">
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
              <div className="flex flex-wrap gap-3">
                {onlineUsers.map((u, idx) => (
                  <button
                    key={`${u.userId}-${idx}`}
                    type="button"
                    onClick={() => setSelectedOnlineUser(u)}
                    className="flex items-center gap-2 px-3 py-2 bg-coc-bg-primary border border-coc-border rounded-full hover:border-coc-gold/50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-coc-bg-secondary border border-coc-border flex items-center justify-center text-xs text-coc-text-muted overflow-hidden">
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
              <div className="flex items-center justify-between pt-4 border-t border-coc-border/50">
                <span className="text-xs text-coc-text-muted">
                  在线灵魂会在深渊广场上显现，也许你可以呼唤他们一起踏入未知的房间
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
      </div>
      <UserProfileModal
        user={selectedOnlineUser}
        isOpen={!!selectedOnlineUser}
        onClose={() => setSelectedOnlineUser(null)}
      />
    </div>
  );
}
