import { useState, useEffect } from 'react';
import {
  Users,
  UserCircle,
  BookOpen,
  Dice5,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { AdminCardGridSkeleton } from '@components/admin/AdminTableSkeleton';
import { Skeleton } from '@components/ui/Skeleton';

interface DashboardStats {
  users: {
    total: number;
    today: number;
    thisWeek: number;
  };
  characters: {
    total: number;
    today: number;
  };
  rooms: {
    total: number;
    active: number;
    today: number;
  };
  diceRolls: {
    total: number;
    today: number;
  };
}

interface RecentUser {
  id: string;
  nickname: string;
  email: string;
  level: number;
  isAdmin: boolean;
  createdAt: string;
  _count: {
    characters: number;
  };
}

interface ActiveUser {
  id: string;
  nickname: string;
  _count: {
    diceRolls: number;
  };
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await apiFetch('/admin/dashboard');
      const data = await handleApiResponse<{ 
        stats: DashboardStats;
        recentUsers: RecentUser[];
        activeUsers: ActiveUser[];
      }>(response);
      setStats(data.stats);
      setRecentUsers(data.recentUsers);
      setActiveUsers(data.activeUsers);
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <AdminCardGridSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="coc-card space-y-4">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton circle className="h-8 w-8" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2 w-20" />
                </div>
              </div>
            ))}
          </div>
          <div className="coc-card space-y-4">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton circle className="h-8 w-8" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: '注册用户',
      value: stats?.users.total || 0,
      change: `+${stats?.users.today || 0} 今日`,
      icon: Users,
      color: 'text-coc-accent-cyan',
      bgColor: 'bg-coc-accent-cyan/10',
    },
    {
      title: '角色卡',
      value: stats?.characters.total || 0,
      change: `+${stats?.characters.today || 0} 今日`,
      icon: UserCircle,
      color: 'text-coc-accent-gold',
      bgColor: 'bg-coc-accent-gold/10',
    },
    {
      title: '房间总数',
      value: stats?.rooms.total || 0,
      change: `${stats?.rooms.active || 0} 活跃中`,
      icon: BookOpen,
      color: 'text-coc-accent-red',
      bgColor: 'bg-coc-accent-red/10',
    },
    {
      title: '投骰次数',
      value: stats?.diceRolls.total || 0,
      change: `+${stats?.diceRolls.today || 0} 今日`,
      icon: Dice5,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold mb-6">仪表盘</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="coc-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-coc-text-secondary">{card.title}</p>
                  <p className="text-3xl font-bold mt-2">{card.value}</p>
                  <p className="text-sm text-coc-text-muted mt-1">{card.change}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={card.color} size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 两列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近注册 */}
        <div className="coc-card">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-coc-accent-cyan" />
            <h2 className="font-bold">最近注册用户</h2>
          </div>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-coc-bg-tertiary rounded">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-coc-accent-red/20 flex items-center justify-center text-coc-accent-red font-bold">
                    {user.nickname[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.nickname}</span>
                      {user.isAdmin && (
                        <span className="text-xs px-2 py-0.5 bg-coc-accent-gold/20 text-coc-accent-gold rounded">
                          管理员
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-coc-text-muted">
                      {user.email} · 位阶 {user.level} · {user._count.characters} 个角色卡
                    </div>
                  </div>
                </div>
                <div className="text-xs text-coc-text-muted">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 活跃用户 */}
        <div className="coc-card">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-coc-accent-red" />
            <h2 className="font-bold">最活跃用户 (按投骰)</h2>
          </div>
          <div className="space-y-3">
            {activeUsers.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-coc-bg-tertiary rounded">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                    index === 1 ? 'bg-gray-400/20 text-gray-400' :
                    index === 2 ? 'bg-orange-600/20 text-orange-600' :
                    'bg-coc-bg-primary text-coc-text-secondary'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-medium">{user.nickname}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Dice5 size={14} className="text-coc-text-muted" />
                  <span className="font-bold text-coc-accent-gold">{user._count.diceRolls}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 周增长趋势 */}
      <div className="coc-card mt-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-green-400" />
          <h2 className="font-bold">本周增长</h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-coc-bg-tertiary rounded">
            <div className="text-2xl font-bold text-coc-accent-cyan">+{stats?.users.thisWeek || 0}</div>
            <div className="text-sm text-coc-text-muted">新用户</div>
          </div>
          <div className="text-center p-4 bg-coc-bg-tertiary rounded">
            <div className="text-2xl font-bold text-coc-accent-gold">{stats?.rooms.today || 0}</div>
            <div className="text-sm text-coc-text-muted">今日房间</div>
          </div>
          <div className="text-center p-4 bg-coc-bg-tertiary rounded">
            <div className="text-2xl font-bold text-purple-400">{stats?.diceRolls.today || 0}</div>
            <div className="text-sm text-coc-text-muted">今日投骰</div>
          </div>
          <div className="text-center p-4 bg-coc-bg-tertiary rounded">
            <div className="text-2xl font-bold text-green-400">{stats?.rooms.active || 0}</div>
            <div className="text-sm text-coc-text-muted">活跃房间</div>
          </div>
        </div>
      </div>
    </div>
  );
}
