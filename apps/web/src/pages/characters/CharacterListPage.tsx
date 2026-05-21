import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Heart, Brain, Zap, TrendingUp, Eye, User } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { cn } from '@lib/utils';

interface Character {
  id: string;
  displayId: number;
  name: string;
  occupation: string;
  age: number;
  hp: number;
  mp: number;
  san: number;
  maxHp: number;
  maxMp: number;
  maxSan: number;
  updatedAt: string;
  portraitUrl?: string | null;
}

export function CharacterListPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayedId, setDisplayedId] = useState<string | null>(null);
  const [settingId, setSettingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCharacters();
    fetchDisplayedCharacter();
  }, []);

  const fetchCharacters = async () => {
    try {
      const response = await apiFetch('/characters');
      const data = await handleApiResponse<{ characters: Character[] }>(response);
      setCharacters(data.characters);
    } catch (error) {
      console.error('获取角色卡失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisplayedCharacter = async () => {
    try {
      const res = await apiFetch('/auth/me');
      const data = await handleApiResponse<{ user: { displayedCharacterId?: string | null } }>(res);
      setDisplayedId(data.user.displayedCharacterId || null);
    } catch (error) {
      console.error('获取展示角色失败:', error);
    }
  };

  const handleSetDisplayed = async (characterId: string | null) => {
    try {
      setSettingId(characterId || 'null');
      const res = await apiFetch('/auth/me/displayed-character', {
        method: 'PUT',
        body: JSON.stringify({ characterId }),
      });
      await handleApiResponse(res);
      setDisplayedId(characterId);
    } catch (error) {
      console.error('设置展示角色失败:', error);
      alert('设置失败');
    } finally {
      setSettingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-coc-accent-red border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-ritual font-bold text-coc-parchment">调查员名册</h1>
          <p className="text-sm text-coc-text-muted mt-1">每一张卡都是一段不可删除的命运</p>
        </div>
        <button
          onClick={() => navigate('/characters/new')}
          className="coc-btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          记录命运
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="coc-card text-center py-16">
          <div className="text-4xl mb-4">🎭</div>
          <p className="text-coc-text-secondary">暂无调查员</p>
          <p className="text-sm text-coc-text-muted mt-2">创建你的第一个调查员开始冒险</p>
          <button
            onClick={() => navigate('/characters/new')}
            className="mt-4 text-coc-accent-red hover:underline"
          >
            创建调查员
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {characters.map((char) => (
            <div
              key={char.id}
              className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-coc-void bg-coc-surface transition-all duration-300 hover:border-coc-rift hover:shadow-[0_0_24px_rgba(139,38,53,0.18)] hover:-translate-y-1"
            >
              {/* 形象大图区 */}
              <Link to={`/characters/${char.id}`} className="block w-full h-full">
                <div className="relative w-full h-full">
                  {char.portraitUrl ? (
                    <img
                      src={char.portraitUrl}
                      alt={char.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-coc-abyss flex flex-col items-center justify-center text-coc-text-muted">
                      <User size={56} className="mb-3 opacity-30" />
                      <span className="text-xs tracking-widest opacity-60">暂无形象</span>
                    </div>
                  )}
                </div>
              </Link>

              {/* 顶部徽章：是否为当前展示角色 */}
              {displayedId === char.id && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-coc-gold/90 text-coc-abyss text-[10px] font-bold tracking-wide">
                  <Eye size={10} /> 展示中
                </div>
              )}
              
              {/* 右上角：角色编号 */}
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-coc-abyss/80 border border-coc-void text-coc-gold text-[10px] font-mono truncate max-w-[45%]">
                #{String(char.displayId).padStart(8, '0')}
              </div>

              {/* 底部常驻信息浮层 */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-coc-abyss via-coc-abyss/80 to-transparent pt-8 pb-2 px-2">
                <div className="space-y-1">
                  <h3 className="font-ritual font-bold text-base text-coc-parchment drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate">{char.name}</h3>
                  <p className="text-xs text-coc-parchment-dim truncate">{char.occupation} · {char.age}岁</p>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px]">
                      <Heart size={10} className="text-coc-accent-red" />
                      <span className="text-coc-parchment">{char.hp}</span>
                      <span className="text-coc-text-muted">/{char.maxHp}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <Zap size={10} className="text-coc-accent-cyan" />
                      <span className="text-coc-parchment">{char.mp}</span>
                      <span className="text-coc-text-muted">/{char.maxMp}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <Brain size={10} className="text-coc-accent-gold" />
                      <span className="text-coc-parchment">{char.san}</span>
                      <span className="text-coc-text-muted">/{char.maxSan}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-coc-text-muted">
                    {new Date(char.updatedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Hover 操作层 */}
              <div className="absolute inset-0 bg-coc-abyss/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 p-2 pointer-events-none group-hover:pointer-events-auto">
                <Link
                  to={`/characters/${char.id}`}
                  className="w-full max-w-[5rem] text-center py-1.5 bg-coc-gold text-coc-abyss rounded text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  查看详情
                </Link>
                <Link
                  to={`/characters/${char.id}/growth`}
                  className="w-full max-w-[5rem] text-center py-1.5 bg-coc-surface border border-coc-void text-coc-parchment rounded text-xs hover:border-coc-rift transition-colors flex items-center justify-center gap-1"
                >
                  <TrendingUp size={14} />
                  战后成长
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSetDisplayed(displayedId === char.id ? null : char.id);
                  }}
                  disabled={settingId === char.id || settingId === 'null'}
                  className={cn(
                    'w-full max-w-[5rem] text-center py-1.5 rounded text-xs flex items-center justify-center gap-1 transition-colors border',
                    displayedId === char.id
                      ? 'bg-coc-gold/20 text-coc-gold border-coc-gold/50 hover:bg-coc-gold/30'
                      : 'bg-coc-surface text-coc-parchment-dim border-coc-void hover:border-coc-rift hover:text-coc-parchment'
                  )}
                >
                  <Eye size={14} />
                  {displayedId === char.id
                    ? settingId === char.id
                      ? '取消中...'
                      : '取消展示'
                    : settingId === char.id
                    ? '设置中...'
                    : '设为展示'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
