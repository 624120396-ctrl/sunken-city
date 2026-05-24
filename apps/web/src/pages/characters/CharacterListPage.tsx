import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Heart, Brain, Zap, TrendingUp, Eye, User } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { cn } from '@lib/utils';
import { FlipCard } from '@components/ui/FlipCard';

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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#a63848] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-ritual font-bold" style={{ color: '#1a1a1a' }}>调查员名册</h1>
            <p className="text-sm mt-1" style={{ color: '#6b6558' }}>每一张卡都是一段不可删除的命运</p>
          </div>
          <div className="w-16 h-px" style={{ background: 'linear-gradient(90deg, rgba(201,162,39,0.4) 0%, transparent 100%)' }} />
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
        <div className="card-layer-2 text-center py-16 rounded-lg relative corner-ornament">
          <div className="text-4xl mb-4">🎭</div>
          <p className="font-ritual" style={{ color: '#FFFEFC' }}>暂无调查员</p>
          <p className="text-sm mt-2" style={{ color: '#8b8375' }}>创建你的第一个调查员开始冒险</p>
          <button
            onClick={() => navigate('/characters/new')}
            className="mt-4 hover:underline"
            style={{ color: '#a63848' }}
          >
            创建调查员
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {characters.map((char) => (
            <FlipCard
              key={char.id}
              width="100%"
              height="100%"
              className="aspect-[3/4]"
              front={
                <div className="relative w-full h-full">
                  {/* 形象大图 */}
                  {char.portraitUrl ? (
                    <img
                      src={char.portraitUrl}
                      alt={char.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#0a0a0f] flex flex-col items-center justify-center text-[#6b6558]">
                      <User size={56} className="mb-3 opacity-30" />
                      <span className="text-xs tracking-widest opacity-60">暂无形象</span>
                    </div>
                  )}

                  {/* 顶部徽章 */}
                  {displayedId === char.id && (
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-coc-gold/90 text-coc-abyss text-[10px] font-bold tracking-wide z-10">
                      <Eye size={10} /> 展示中
                    </div>
                  )}

                  {/* 右上角编号 */}
                  <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-[#0a0a0f]/80 border border-coc-void text-[#c9a227] text-[10px] font-mono truncate max-w-[45%] z-10">
                    #{String(char.displayId).padStart(8, '0')}
                  </div>

                  {/* 底部信息浮层 */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-coc-abyss via-coc-abyss/80 to-transparent pt-8 pb-2 px-2 z-10">
                    <div className="space-y-1">
                      <h3 className="font-ritual font-bold text-base text-[#e8d4a0] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate">{char.name}</h3>
                      <p className="text-xs text-coc-parchment-dim truncate">{char.occupation} · {char.age}岁</p>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[10px]">
                        <Heart size={10} className="text-[#a63848]" />
                        <span className="text-[#e8d4a0]">{char.hp}</span>
                        <span className="text-[#6b6558]">/{char.maxHp}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <Zap size={10} className="text-[#4db8b8]" />
                        <span className="text-[#e8d4a0]">{char.mp}</span>
                        <span className="text-[#6b6558]">/{char.maxMp}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <Brain size={10} className="text-[#c9a227]" />
                        <span className="text-[#e8d4a0]">{char.san}</span>
                        <span className="text-[#6b6558]">/{char.maxSan}</span>
                      </div>
                    </div>
                  </div>
                </div>
              }
              back={
                <div className="flex flex-col items-center gap-3 w-full px-3">
                  {/* 背面标题 */}
                  <h3 className="font-ritual font-bold text-[#c9a227] text-sm truncate w-full text-center">{char.name}</h3>
                  
                  {/* 属性网格 */}
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <div className="flex flex-col items-center gap-1 p-2 rounded bg-coc-surface/60 border border-coc-void">
                      <Heart size={14} className="text-[#a63848]" />
                      <span className="text-xs text-[#e8d4a0] font-bold">{char.hp}</span>
                      <span className="text-[9px] text-[#6b6558]">HP</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 rounded bg-coc-surface/60 border border-coc-void">
                      <Zap size={14} className="text-[#4db8b8]" />
                      <span className="text-xs text-[#e8d4a0] font-bold">{char.mp}</span>
                      <span className="text-[9px] text-[#6b6558]">MP</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 rounded bg-coc-surface/60 border border-coc-void">
                      <Brain size={14} className="text-[#c9a227]" />
                      <span className="text-xs text-[#e8d4a0] font-bold">{char.san}</span>
                      <span className="text-[9px] text-[#6b6558]">SAN</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex flex-col gap-1.5 w-full mt-1">
                    <Link
                      to={`/characters/${char.id}`}
                      className="w-full text-center py-1.5 bg-coc-gold text-coc-abyss rounded text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      查看详情
                    </Link>
                    <Link
                      to={`/characters/${char.id}/growth`}
                      className="w-full text-center py-1.5 bg-coc-surface border border-coc-void text-[#e8d4a0] rounded text-xs hover:border-coc-rift transition-colors flex items-center justify-center gap-1"
                    >
                      <TrendingUp size={12} />
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
                        'w-full text-center py-1.5 rounded text-xs flex items-center justify-center gap-1 transition-colors border',
                        displayedId === char.id
                          ? 'bg-coc-gold/20 text-[#c9a227] border-coc-gold/50'
                          : 'bg-coc-surface text-coc-parchment-dim border-coc-void hover:border-coc-rift hover:text-[#e8d4a0]'
                      )}
                    >
                      <Eye size={12} />
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
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
