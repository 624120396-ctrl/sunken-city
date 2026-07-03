import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Heart, Brain, Zap, TrendingUp, Eye, User } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { cn } from '@lib/utils';
import { FlipCard } from '@components/ui/FlipCard';
import { Button, PageShell, Surface } from '@components/system';
import {
  getCharacterArchiveSummary,
  getCharacterCondition,
  getCharacterVitals,
} from '@components/characters/characterArchiveMeta';

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

  const archiveSummary = getCharacterArchiveSummary({ characters, displayedId });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#a63848] border-t-transparent" />
      </div>
    );
  }

  return (
    <PageShell
      className="character-archive-page"
      title="调查员名册"
      eyebrow="investigator archive"
      description="每一张卡都是一段不可删除的命运。名册优先展示状态、展示位与可行动入口。"
      actions={
        <Button variant="primary" onClick={() => navigate('/characters/new')} icon={<Plus size={18} />}>
          记录命运
        </Button>
      }
    >
      <div className="character-archive-summary">
        {archiveSummary.map((item) => (
          <Surface key={item.key} variant="panel" tone={item.tone} padding="sm" className="character-archive-summary__item">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </Surface>
        ))}
      </div>

      {characters.length === 0 ? (
        <Surface variant="solid" tone="gold" padding="lg" className="character-archive-empty">
          <User size={44} />
          <p>暂无调查员</p>
          <span>创建你的第一个调查员，登记进入雾港档案馆。</span>
          <Button
            onClick={() => navigate('/characters/new')}
            variant="primary"
            className="mt-4"
          >
            创建调查员
          </Button>
        </Surface>
      ) : (
        <div className="character-archive-grid">
          {characters.map((char) => {
            const vitals = getCharacterVitals(char);
            const condition = getCharacterCondition(char);
            const isDisplayed = displayedId === char.id;

            return (
              <FlipCard
                key={char.id}
                width="100%"
                height="100%"
                className="character-archive-card"
                front={
                  <div className="character-archive-card__face">
                    <div className="character-archive-card__portrait">
                      {char.portraitUrl ? (
                        <img src={char.portraitUrl} alt={char.name} />
                      ) : (
                        <div className="character-archive-card__placeholder">
                          <User size={48} />
                          <span>暂无形象</span>
                        </div>
                      )}
                    </div>

                    <div className="character-archive-card__topline">
                      <span className="character-archive-card__id">#{String(char.displayId).padStart(8, '0')}</span>
                      <span className="character-condition-badge" data-tone={condition.tone}>{condition.label}</span>
                    </div>

                    {isDisplayed && (
                      <div className="character-display-ribbon">
                        <Eye size={12} /> 展示中
                      </div>
                    )}

                    <div className="character-archive-card__footer">
                      <h3>{char.name}</h3>
                      <p>{char.occupation} · {char.age}岁</p>
                      <div className="character-vital-strip">
                        {vitals.map((vital) => (
                          <div key={vital.key} className="character-vital-chip" data-tone={vital.tone}>
                            {vital.key === 'hp' ? <Heart size={11} /> : vital.key === 'mp' ? <Zap size={11} /> : <Brain size={11} />}
                            <span>{vital.label}</span>
                            <strong>{vital.value}</strong>
                            <small>/{vital.max}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                }
                back={
                  <div className="character-archive-card__back">
                    <div>
                      <span className="character-archive-card__seal">INVESTIGATOR DOSSIER</span>
                      <h3>{char.name}</h3>
                      <p>{char.occupation} · {char.age}岁</p>
                    </div>

                    <div className="character-back-vitals">
                      {vitals.map((vital) => (
                        <div key={vital.key} data-tone={vital.tone}>
                          <span>{vital.label}</span>
                          <strong>{vital.value}</strong>
                          <small>{vital.max}</small>
                        </div>
                      ))}
                    </div>

                    <div className="character-card-actions">
                      <Link to={`/characters/${char.id}`}>查看详情</Link>
                      <Link to={`/characters/${char.id}/growth`}>
                        <TrendingUp size={12} />
                        战后成长
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSetDisplayed(isDisplayed ? null : char.id);
                        }}
                        disabled={settingId === char.id || settingId === 'null'}
                        className={cn(isDisplayed && 'is-active')}
                      >
                        <Eye size={12} />
                        {isDisplayed
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
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
