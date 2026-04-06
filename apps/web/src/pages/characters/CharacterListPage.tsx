import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, User, Heart, Brain, Sparkles, TrendingUp, Eye } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';

interface Character {
  id: string;
  name: string;
  occupation: string;
  age: number;
  hp: number;
  mp: number;
  san: number;
  updatedAt: string;
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
        <h1 className="text-2xl font-serif font-bold">调查员名册</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => (
            <div
              key={char.id}
              className="coc-card hover:border-coc-accent-red transition-all group"
            >
              <Link to={`/characters/${char.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-coc-accent-red transition-colors">
                      {char.name}
                    </h3>
                    <p className="text-sm text-coc-text-secondary">{char.occupation}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-coc-bg-tertiary flex items-center justify-center">
                    <User size={20} className="text-coc-text-muted" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center p-2 bg-coc-bg-tertiary rounded">
                    <Heart size={14} className="mx-auto mb-1 text-coc-accent-red" />
                    <span className="font-bold">{char.hp}</span>
                    <span className="text-coc-text-muted text-xs block">HP</span>
                  </div>
                  <div className="text-center p-2 bg-coc-bg-tertiary rounded">
                    <Sparkles size={14} className="mx-auto mb-1 text-coc-accent-cyan" />
                    <span className="font-bold">{char.mp}</span>
                    <span className="text-coc-text-muted text-xs block">MP</span>
                  </div>
                  <div className="text-center p-2 bg-coc-bg-tertiary rounded">
                    <Brain size={14} className="mx-auto mb-1 text-coc-accent-gold" />
                    <span className="font-bold">{char.san}</span>
                    <span className="text-coc-text-muted text-xs block">SAN</span>
                  </div>
                </div>

                <div className="mt-4 text-xs text-coc-text-muted">
                  年龄: {char.age} | 更新于 {new Date(char.updatedAt).toLocaleDateString()}
                </div>
              </Link>

              <div className="mt-4 pt-4 border-t border-coc-border flex gap-2">
                <Link
                  to={`/characters/${char.id}`}
                  className="flex-1 text-center py-2 bg-coc-bg-tertiary rounded text-sm hover:bg-coc-accent-red/20 transition-colors"
                >
                  查看详情
                </Link>
                <Link
                  to={`/characters/${char.id}/growth`}
                  className="flex-1 text-center py-2 bg-coc-bg-tertiary rounded text-sm hover:bg-coc-accent-gold/20 transition-colors flex items-center justify-center gap-1"
                >
                  <TrendingUp size={14} />
                  战后成长
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    handleSetDisplayed(displayedId === char.id ? null : char.id)
                  }
                  disabled={settingId === char.id || settingId === 'null'}
                  className={[
                    'flex-1 text-center py-2 rounded text-sm flex items-center justify-center gap-1 transition-colors',
                    displayedId === char.id
                      ? 'bg-coc-gold/20 text-coc-gold border border-coc-gold/40'
                      : 'bg-coc-bg-tertiary hover:bg-coc-gold/10 text-coc-parchment',
                  ].join(' ')}
                >
                  <Eye size={14} />
                  {displayedId === char.id
                    ? settingId === char.id
                      ? '取消中...'
                      : '展示中'
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