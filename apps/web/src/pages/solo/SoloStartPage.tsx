import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2 } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';

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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-amber-500">Phantom Scripts · 单人剧本</h1>
          <p className="text-slate-400 mt-1">选择一个调查员，进入只属于你一个人的故事。</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">选择剧本</h2>
          <div className="grid gap-3">
            {scenarios.length === 0 && (
              <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400">
                暂无可用剧本
              </div>
            )}
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedScenarioId(s.id)}
                className={`w-full text-left p-4 rounded-lg border transition ${
                  selectedScenarioId === s.id
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="font-medium">{s.title}</div>
                {s.description && (
                  <div className="text-sm text-slate-400 mt-1">{s.description}</div>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">选择角色卡</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {characters.length === 0 && (
              <div className="col-span-full p-4 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400">
                还没有调查员，请先创建角色卡
              </div>
            )}
            {characters.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCharacterId(c.id)}
                className={`text-left p-4 rounded-lg border transition ${
                  selectedCharacterId === c.id
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  {c.portraitUrl ? (
                    <img src={c.portraitUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-700" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-700" />
                  )}
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-slate-400">
                      {c.occupation} · HP {c.hp}/{c.maxHp} · SAN {c.san}/{c.maxSan}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <div className="pt-4">
          <button
            disabled={!selectedCharacterId || !selectedScenarioId || starting}
            onClick={handleStart}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            开始调查
          </button>
        </div>
      </div>
    </div>
  );
}
