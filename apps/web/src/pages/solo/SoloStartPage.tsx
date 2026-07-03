import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, Play, UserRound } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { PageShell, Surface } from '@components/system';
import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { getScenarioCardMeta, getSoloLaunchState } from '@components/story/storyEntryMeta';

interface CharacterSummary {
  id: string;
  name: string;
  occupation: string;
  portraitUrl?: string;
  hp: number;
  maxHp: number;
  san: number;
  maxSan: number;
}

interface ScenarioSummary {
  id: string;
  title: string;
  description?: string;
}

export function SoloStartPage() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    apiFetch('/characters')
      .then(handleApiResponse<{ characters: CharacterSummary[] }>)
      .then((d) => setCharacters(d.characters))
      .catch(() => {});
    apiFetch('/scenarios?mode=solo')
      .then(handleApiResponse<ScenarioSummary[]>)
      .then(setScenarios)
      .catch(() => {});
  }, []);

  const handleStart = async () => {
    if (!selectedCharacterId || !selectedScenarioId) return;
    setStarting(true);
    try {
      const res = await apiFetch(`/scenarios/${selectedScenarioId}/solo/start`, {
        method: 'POST',
        body: JSON.stringify({ characterId: selectedCharacterId }),
      });
      const data = await handleApiResponse<{ sessionId: string }>(res);
      navigate(`/solo/session/${data.sessionId}`);
    } catch (e: any) {
      alert(e.message || '启动失败');
    } finally {
      setStarting(false);
    }
  };

  const launchState = getSoloLaunchState({
    hasScenario: Boolean(selectedScenarioId),
    hasCharacter: Boolean(selectedCharacterId),
    starting,
  });
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId);
  const selectedCharacter = characters.find((character) => character.id === selectedCharacterId);

  return (
    <PageShell
      className="story-entry-page solo-entry-page"
      eyebrow="phantom scripts"
      title="单人剧本"
      description="选择剧本与调查员，进入只属于你的离线叙事分支。"
    >
      <div className="story-entry-layout">
        <section className="story-entry-section">
          <div className="story-entry-section__heading">
            <BookOpen size={18} />
            <h2>选择剧本</h2>
          </div>

          {scenarios.length === 0 ? (
            <Surface variant="panel" padding="md" className="story-entry-empty">
              <EmptyState
                icon={EmptyIcons.Void}
                title="暂无可用剧本"
                description="等待新的故事被封存入档。"
                size="sm"
                animate={false}
              />
            </Surface>
          ) : (
            <div className="story-entry-list">
              {scenarios.map((scenario) => {
                const meta = getScenarioCardMeta({});
                return (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedScenarioId(scenario.id)}
                    className="story-entry-scenario"
                    data-selected={selectedScenarioId === scenario.id ? 'true' : 'false'}
                    data-tone={meta.tone}
                  >
                    <span>{meta.durationLabel}</span>
                    <strong>{scenario.title}</strong>
                    {scenario.description && <p>{scenario.description}</p>}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="story-entry-section">
          <div className="story-entry-section__heading">
            <UserRound size={18} />
            <h2>选择调查员</h2>
          </div>

          {characters.length === 0 ? (
            <Surface variant="panel" padding="md" className="story-entry-empty">
              <EmptyState
                icon={EmptyIcons.Investigator}
                title="还没有调查员"
                description="请先创建角色卡，再进入单人剧本。"
                size="sm"
                animate={false}
              />
            </Surface>
          ) : (
            <div className="story-character-grid">
              {characters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => setSelectedCharacterId(character.id)}
                  className="story-character-card"
                  data-selected={selectedCharacterId === character.id ? 'true' : 'false'}
                >
                  {character.portraitUrl ? (
                    <img src={character.portraitUrl} alt="" />
                  ) : (
                    <span>{character.name.slice(0, 1)}</span>
                  )}
                  <div>
                    <strong>{character.name}</strong>
                    <small>{character.occupation || '调查员'}</small>
                    <em>HP {character.hp}/{character.maxHp} · SAN {character.san}/{character.maxSan}</em>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <Surface variant="solid" tone="gold" padding="lg" className="story-launch-panel">
          <span className="story-launch-panel__eyebrow">dispatch dossier</span>
          <h2>调查准备</h2>
          <dl>
            <div>
              <dt>剧本</dt>
              <dd>{selectedScenario?.title || '未选择'}</dd>
            </div>
            <div>
              <dt>调查员</dt>
              <dd>{selectedCharacter?.name || '未选择'}</dd>
            </div>
          </dl>
          <button
            disabled={launchState.disabled}
            onClick={handleStart}
            className="story-launch-button"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {launchState.label}
          </button>
        </Surface>
      </div>
    </PageShell>
  );
}
