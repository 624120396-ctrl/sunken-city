import { useState, useEffect } from 'react';
import { User, Scroll, Crown, Sword, Eye, UserPlus, UserCheck, UserMinus, Clock, Mail } from 'lucide-react';
import { ExpBar } from './ui/ExpBar';
import { apiFetch, handleApiResponse } from '@lib/api';
import { useAuthStore } from '@stores/auth.store';
import { COC7E_SKILLS } from '@lib/coc7-data';

export interface DisplayedCharacter {
  id: string;
  displayId?: number;
  name: string;
  occupation?: string;
  avatarUrl?: string | null;
  portraitUrl?: string | null;
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
  background?: string | null;
  skills?: string;
  quickSkills?: string;
}

export interface UserProfile {
  id?: string;
  displayId?: number;
  nickname: string;
  avatarUrl?: string | null;
  frameUrl?: string | null;
  rankName?: string;
  rankColor?: string;
  titleName?: string | null;
  titleColor?: string | null;
  exp?: number;
  expToNext?: number;
  nextRankName?: string | null;
  coins?: number;
  stardust?: number;
  displayedCharacter?: DisplayedCharacter | null;
}

function StatusBar({
  label,
  current,
  max,
  color,
}: {
  label: string;
  current: number;
  max: number;
  color: 'red' | 'cyan' | 'gold';
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const colorClass =
    color === 'red'
      ? 'bg-coc-blood'
      : color === 'cyan'
      ? 'bg-cyan-500'
      : 'bg-coc-gold';
  const dimClass =
    color === 'red'
      ? 'text-coc-blood/70'
      : color === 'cyan'
      ? 'text-cyan-400/70'
      : 'text-coc-gold/70';

  return (
    <div className={`profile-user-status profile-user-status--${color}`}>
      <div className="profile-user-status__head flex items-center justify-between text-xs">
        <span className={`font-bold ${dimClass}`}>{label}</span>
        <span className="profile-user-status__value text-coc-text-muted">
          {current}/{max}
        </span>
      </div>
      <div className="profile-user-status__bar h-2 bg-coc-bg-primary rounded-full overflow-hidden border border-coc-border">
        <div
          className={`profile-user-status__fill h-full ${colorClass} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatCell({ label, value, desc }: { label: string; value?: number; desc?: string }) {
  return (
    <div
      className="profile-user-stat-cell text-center p-2 bg-coc-bg-primary/60 border border-coc-border rounded cursor-help hover:bg-coc-bg-primary transition-colors"
      title={desc}
    >
      <div className="text-[10px] text-coc-text-muted tracking-wider">{label}</div>
      <div className="text-sm font-bold text-coc-parchment">{value ?? '-'}</div>
    </div>
  );
}

function AvatarPlaceholder({ name, color }: { name: string; color?: string }) {
  return (
    <div
      className="profile-user-avatar-placeholder w-full h-full rounded-full flex items-center justify-center text-xl font-bold border-2 border-coc-border"
      style={{
        background: color
          ? `linear-gradient(135deg, ${color}33 0%, ${color}11 100%)`
          : undefined,
        color: color || 'inherit',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function UserProfileCard({ user }: { user: UserProfile }) {
  const [tab, setTab] = useState<'character' | 'user'>('character');
  const [charImgError, setCharImgError] = useState(false);
  const [friendStatus, setFriendStatus] = useState<
    'loading' | 'none' | 'friend' | 'pending_sent' | 'pending_received' | 'self' | 'error'
  >('loading');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const dc = user.displayedCharacter;

  const parsedQuickSkills: Array<{ name: string; value: number }> = (() => {
    try {
      const names = JSON.parse(dc?.quickSkills || '[]');
      const skillsObj = JSON.parse(dc?.skills || '{}');
      if (!Array.isArray(names)) return [];
      return names.slice(0, 5).map((n: unknown) => {
        const keyStr = String(n);
        const skillMeta = COC7E_SKILLS.find((s) => s.key === keyStr);
        const displayName = skillMeta?.name || keyStr;
        return { name: displayName, value: Number(skillsObj[keyStr]) || 0 };
      });
    } catch {
      return [];
    }
  })();

  useEffect(() => {
    if (!user.id || !currentUser) {
      setFriendStatus('error');
      return;
    }
    if (user.id === currentUser.id) {
      setFriendStatus('self');
      return;
    }
    let cancelled = false;
    setFriendStatus('loading');
    apiFetch(`/friends/check/${user.id}`)
      .then(async (res) => {
        const json = await handleApiResponse<{ status: string; requestId?: string }>(res);
        if (cancelled) return;
        if (json.status === 'friend') setFriendStatus('friend');
        else if (json.status === 'pending_sent') {
          setFriendStatus('pending_sent');
          if (json.requestId) setRequestId(json.requestId);
        }
        else if (json.status === 'pending_received') {
          setFriendStatus('pending_received');
          if (json.requestId) setRequestId(json.requestId);
        }
        else setFriendStatus('none');
      })
      .catch(() => {
        if (!cancelled) setFriendStatus('error');
      });
    return () => { cancelled = true; };
  }, [user.id, currentUser?.id]);

  const handleAddFriend = async () => {
    if (!user.id) return;
    setActionLoading(true);
    try {
      const res = await apiFetch('/friends/requests', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const json = await handleApiResponse<{ autoAccepted?: boolean; request?: { id: string } }>(res);
      if (json.autoAccepted) {
        setFriendStatus('friend');
      } else if (json.request) {
        setFriendStatus('pending_sent');
        setRequestId(json.request.id);
      }
    } catch (e: any) {
      alert(e?.message || '发送失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!requestId) return;
    setActionLoading(true);
    try {
      await apiFetch(`/friends/requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'accepted' }),
      });
      setFriendStatus('friend');
    } catch (e: any) {
      alert(e?.message || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteFriend = async () => {
    if (!user.id) return;
    if (!confirm('确定要删除这位好友吗？')) return;
    setActionLoading(true);
    try {
      await apiFetch(`/friends/${user.id}`, { method: 'DELETE' });
      setFriendStatus('none');
    } catch (e: any) {
      alert(e?.message || '删除失败');
    } finally {
      setActionLoading(false);
    }
  };

  const renderFriendButton = () => {
    if (friendStatus === 'loading') {
      return (
        <button disabled className="w-full coc-btn-secondary opacity-50">
          加载中...
        </button>
      );
    }
    if (friendStatus === 'self') {
      return (
        <button disabled className="w-full coc-btn-secondary opacity-50">
          这是你本人
        </button>
      );
    }
    if (friendStatus === 'friend') {
      return (
        <div className="flex gap-2">
          <button disabled className="flex-1 coc-btn-primary opacity-80 flex items-center justify-center gap-2">
            <UserCheck size={16} /> 已是好友
          </button>
          <button
            onClick={handleDeleteFriend}
            disabled={actionLoading}
            className="px-3 py-2 text-red-400 hover:bg-red-400/10 rounded border border-coc-border text-sm"
            title="删除好友"
          >
            <UserMinus size={16} />
          </button>
        </div>
      );
    }
    if (friendStatus === 'pending_sent') {
      return (
        <button disabled className="w-full coc-btn-secondary opacity-70 flex items-center justify-center gap-2">
          <Clock size={16} /> 已发送请求
        </button>
      );
    }
    if (friendStatus === 'pending_received') {
      return (
        <button
          onClick={handleAccept}
          disabled={actionLoading}
          className="w-full coc-btn-primary flex items-center justify-center gap-2"
        >
          <Mail size={16} /> 接受好友请求
        </button>
      );
    }
    return (
      <button
        onClick={handleAddFriend}
        disabled={actionLoading}
        className="w-full coc-btn-primary flex items-center justify-center gap-2"
      >
        <UserPlus size={16} /> 加为好友
      </button>
    );
  };

  return (
    <div className="profile-user-card bg-coc-bg-tertiary rounded-xl border border-coc-border overflow-hidden max-w-md w-full">
      <div className="h-1.5" style={{ backgroundColor: user.rankColor || '#6b6558' }} />

      {/* Tab 切换 */}
      <div className="profile-user-card__tabs flex border-b border-coc-border">
        <button
          type="button"
          onClick={() => setTab('character')}
          className={`profile-user-card__tab flex-1 pb-3 pt-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            tab === 'character'
              ? 'text-coc-accent-gold border-b-2 border-coc-accent-gold'
              : 'text-coc-text-muted hover:text-coc-text-primary'
          }`}
        >
          <Scroll size={14} />
          调查员档案
        </button>
        <button
          type="button"
          onClick={() => setTab('user')}
          className={`profile-user-card__tab flex-1 pb-3 pt-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            tab === 'user'
              ? 'text-coc-accent-gold border-b-2 border-coc-accent-gold'
              : 'text-coc-text-muted hover:text-coc-text-primary'
          }`}
        >
          <Crown size={14} />
          用户身份
        </button>
      </div>

      {tab === 'character' && (
        <div className="p-5 space-y-5">
          {dc ? (
            <>
              {/* 角色头部 */}
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  {(dc.portraitUrl || dc.avatarUrl) && !charImgError ? (
                    <img
                      src={dc.portraitUrl || dc.avatarUrl || ''}
                      onError={() => setCharImgError(true)}
                      className="w-20 h-20 rounded-full object-cover border-2 border-coc-border bg-coc-bg-secondary"
                      alt=""
                    />
                  ) : (
                    <AvatarPlaceholder name={dc.name} color={user.rankColor} />
                  )}
                  {user.frameUrl && (
                    <img
                      src={user.frameUrl}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ transform: 'scale(1.35)' }}
                      alt=""
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-ritual font-bold text-coc-parchment truncate">{dc.name}</div>
                  <div className="text-sm text-coc-text-muted flex items-center gap-1.5 mt-1">
                    <Eye size={12} />
                    <span className="truncate">{dc.occupation || '未知职业'}</span>
                  </div>
                  {dc.displayId != null && (
                    <div className="mt-1 font-mono text-[10px] text-coc-gold">#{String(dc.displayId).padStart(8, '0')}</div>
                  )}
                </div>
              </div>

              {/* 状态条 */}
              <div className="space-y-3 bg-coc-bg-primary/40 p-4 rounded-lg border border-coc-border">
                <StatusBar label="生命力 HP" current={dc.hp} max={dc.maxHp} color="red" />
                <StatusBar label="魔力 MP" current={dc.mp} max={dc.maxMp} color="cyan" />
                <StatusBar label="理智 SAN" current={dc.san} max={dc.maxSan} color="gold" />
              </div>

              {/* 属性矩阵 */}
              <div className="grid grid-cols-3 gap-2">
                <StatCell label="STR" value={dc.str} desc="力量：物理强度、携带能力、近战伤害" />
                <StatCell label="CON" value={dc.con} desc="体质：生命值、耐力、抵抗毒素/疾病" />
                <StatCell label="SIZ" value={dc.siz} desc="体型：身高体重、坚韧度、伤害加值(DB)" />
                <StatCell label="DEX" value={dc.dex} desc="敏捷：反应速度、先攻、闪避" />
                <StatCell label="APP" value={dc.app} desc="外貌：外表吸引力、第一印象" />
                <StatCell label="INT" value={dc.int} desc="智力：推理能力、学习能力、灵感检定" />
                <StatCell label="POW" value={dc.pow} desc="意志：精神强度、魔法值、抵抗精神攻击" />
                <StatCell label="EDU" value={dc.edu} desc="教育：知识水平、专业技能、信息回忆" />
                <StatCell label="LUCK" value={dc.luck} desc="幸运：随机机会、概率事件" />
              </div>

              {/* MOV / BUILD */}
              <div className="flex gap-3">
                <div className="flex-1 p-3 bg-coc-bg-primary/40 border border-coc-border rounded text-center">
                  <div className="text-[10px] text-coc-text-muted">移动力 MOV</div>
                  <div className="text-base font-bold text-coc-parchment">{dc.mov ?? 8}</div>
                </div>
                <div className="flex-1 p-3 bg-coc-bg-primary/40 border border-coc-border rounded text-center">
                  <div className="text-[10px] text-coc-text-muted">体格 BUILD</div>
                  <div className="text-base font-bold text-coc-parchment">{dc.build ?? 0}</div>
                </div>
              </div>

              {/* 技能摘要 */}
              {parsedQuickSkills.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-coc-text-muted flex items-center gap-1.5">
                    <Sword size={12} /> 擅长技能
                  </div>
                  <div className="space-y-2">
                    {parsedQuickSkills.map((s) => (
                      <div key={s.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-coc-parchment">{s.name}</span>
                          <span className="text-coc-text-muted">{s.value}%</span>
                        </div>
                        <div className="h-1.5 bg-coc-bg-primary rounded-full overflow-hidden border border-coc-border">
                          <div
                            className="h-full bg-coc-gold/70"
                            style={{ width: `${Math.min(100, s.value)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 角色背景 */}
              {dc.background && (
                <div className="p-4 bg-coc-bg-primary/30 border border-coc-border rounded-lg">
                  <div className="text-xs text-coc-text-muted mb-2 flex items-center gap-1.5">
                    <Scroll size={12} /> 人物背景
                  </div>
                  <p className="text-sm text-coc-parchment-dim leading-relaxed whitespace-pre-wrap">{dc.background}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-coc-text-muted">
              <div className="text-3xl mb-3 opacity-30">🌑</div>
              <p className="font-ritual">该调查员尚未设定展示角色</p>
              <p className="text-sm mt-1">在深渊中，有些人 prefers 隐藏自己的真实身份</p>
            </div>
          )}
        </div>
      )}

      {tab === 'user' && (
        <div className="p-5 space-y-5">
          {/* 头像与用户基本信息 */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  className="w-16 h-16 rounded-full object-cover border border-coc-bg-primary bg-coc-bg-secondary"
                  alt=""
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-coc-bg-primary border border-coc-border flex items-center justify-center">
                  <User size={24} className="text-coc-text-muted" />
                </div>
              )}
              {user.frameUrl && (
                <img
                  src={user.frameUrl}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transform: 'scale(1.35)' }}
                  alt=""
                />
              )}
            </div>
            <div>
              <div className="font-bold text-coc-text-primary text-lg">{user.nickname}</div>
              <div className="text-xs text-coc-text-muted">调查员 · 深渊广场居民</div>
              {user.displayId != null && (
                <div className="mt-0.5 font-mono text-[10px] text-coc-gold">#{String(user.displayId).padStart(8, '0')}</div>
              )}
            </div>
          </div>

          {/* 位阶与印记 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-coc-bg-primary rounded-lg border border-coc-border">
              <div className="text-xs text-coc-text-muted w-12">位阶</div>
              <div className="text-sm font-medium text-coc-accent-gold">{user.rankName || '未知位阶'}</div>
            </div>
            {user.titleName && (
              <div className="flex items-center gap-2 p-3 bg-coc-bg-primary rounded-lg border border-coc-border">
                <div className="text-xs text-coc-text-muted w-12">印记</div>
                <div className="text-sm font-medium" style={{ color: user.titleColor || '#a69b85' }}>
                  {user.titleName}
                </div>
              </div>
            )}
          </div>

          {typeof user.exp === 'number' && typeof user.expToNext === 'number' && (
            <div className="space-y-2 p-4 bg-coc-bg-primary/40 rounded-lg border border-coc-border">
              <ExpBar current={user.exp} max={user.exp + user.expToNext} color={user.rankColor || '#c9a227'} showPercentage />
              {user.nextRankName && (
                <div className="text-xs text-coc-text-muted text-right">
                  距 {user.nextRankName} 还需 {user.expToNext} SP
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-coc-bg-primary rounded-lg border border-coc-border text-center">
              <div className="text-xs text-coc-text-muted">锈蚀硬币</div>
              <div className="text-lg font-bold text-coc-parchment">{user.coins ?? 0}</div>
            </div>
            <div className="p-3 bg-coc-bg-primary rounded-lg border border-coc-border text-center">
              <div className="text-xs text-coc-text-muted">虚银</div>
              <div className="text-lg font-bold text-coc-parchment">{user.stardust ?? 0}</div>
            </div>
          </div>

          {/* 好友操作 */}
          {renderFriendButton()}
        </div>
      )}
    </div>
  );
}
