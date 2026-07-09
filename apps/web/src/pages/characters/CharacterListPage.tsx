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
  const displayedCharacter = characters.find((char) => char.id === displayedId) ?? null;
  const dangerCount = archiveSummary.find((item) => item.key === 'endangered')?.value ?? 0;
  const latestCharacter = [...characters].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null;

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
      eyebrow="INVESTIGATOR ARCHIVE"
      description="每一张卡都像被潮水带回的姓名，未曾沉寂，也不肯安睡。"
      actions={
        <Button variant="primary" onClick={() => navigate('/characters/new')} icon={<Plus size={18} />}>
          记录命运
        </Button>
      }
      aside={
        <div className="character-archive-aside">
          <Surface variant="panel" material="archive" padding="md" className="character-archive-aside-card">
            <div className="character-archive-aside-card__heading">
              <Eye size={14} />
              展示档案
            </div>
            <div className="character-archive-aside-card__body">
              <strong>{displayedCharacter ? displayedCharacter.name : '尚未指定'}</strong>
              <span>{displayedCharacter ? `${displayedCharacter.occupation} · ${displayedCharacter.age}岁` : '选定一名调查员后，将在个人档案中公开展示。'}</span>
            </div>
          </Surface>

          <Surface variant="panel" material="archive" padding="md" className="character-archive-aside-card">
            <div className="character-archive-aside-card__heading">
              <User size={14} />
              名册状态
            </div>
            <div className="character-archive-aside-list">
              <div className="coc-archive-subcard character-archive-aside-entry">
                <span>登记调查员</span>
                <strong>{characters.length}</strong>
              </div>
              <div className="coc-archive-subcard character-archive-aside-entry">
                <span>危险状态</span>
                <strong>{dangerCount}</strong>
              </div>
            </div>
          </Surface>

          <Surface variant="panel" material="archive" padding="md" className="character-archive-aside-card">
            <div className="character-archive-aside-card__heading">
              <TrendingUp size={14} />
              最近封存
            </div>
            <div className="character-archive-aside-card__body">
              <strong>{latestCharacter ? latestCharacter.name : '暂无记录'}</strong>
              <span>{latestCharacter ? '最近一次被档案馆翻阅的调查员。' : '创建第一份调查员档案后，这里会留下索引。'}</span>
            </div>
          </Surface>
        </div>
      }
    >
      <div className="character-archive-summary">
        {archiveSummary.map((item) => (
          <Surface
            key={item.key}
            variant="panel"
            tone={item.tone}
            material="archive"
            padding="sm"
            className="character-archive-summary__item"
            data-summary={item.key}
          >
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
                  <div className="character-archive-card__face" data-has-portrait={char.portraitUrl ? 'true' : 'false'}>
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
