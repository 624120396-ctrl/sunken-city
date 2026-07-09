import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Loader2, Play, Tag } from 'lucide-react';
import { apiFetch } from '@lib/api';
import { useSoloStore } from '@stores/solo.store';
import { PageShell, Surface } from '@components/system';
import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { getScenarioCardMeta } from '@components/story/storyEntryMeta';

interface Scenario {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  difficulty: string;
  estimatedDuration: number;
  tags?: string;
}

export default function ScenarioSelectPage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initSession = useSoloStore((s) => s.initSession);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/scenarios');
      const data = await res.json();
      
      if (data.success) {
        setScenarios(data.data || []);
      } else {
        setError(data.error?.message || '加载失败');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startScenario = async (scenarioId: string) => {
    try {
      await initSession(scenarioId);
      navigate(`/solo/${scenarioId}`);
    } catch (err) {
      alert(`启动失败: ${(err as Error).message}`);
    }
  };

  if (loading) {
    return (
      <div className="story-entry-loading">
        <Loader2 className="animate-spin" size={28} />
        <span>加载剧本列表...</span>
      </div>
    );
  }

  if (error) {
    return (
      <PageShell
        className="story-entry-page scenario-library-page"
        eyebrow="scenario library"
        title="选择剧本"
        description="档案柜在潮湿黑暗中拒绝开启，纸页背后传来迟缓的敲击。"
      >
        <Surface variant="panel" padding="lg" className="story-entry-empty">
          <EmptyState
            icon={EmptyIcons.Void}
            title="剧本档案无法打开"
            description={error}
            size="sm"
            animate={false}
          />
        </Surface>
      </PageShell>
    );
  }

  return (
    <PageShell
      className="story-entry-page scenario-library-page"
      eyebrow="scenario library"
      title={
        <span className="flex items-center gap-3">
          <BookOpen className="text-[var(--coc-accent-gold)]" size={26} />
          选择剧本
        </span>
      }
      description="封蜡下的故事仍在呼吸，暗门之后有人替你留下了脚印。"
    >
      {scenarios.length === 0 ? (
        <Surface variant="panel" padding="lg" className="story-entry-empty">
          <EmptyState
            icon={EmptyIcons.Void}
            title="暂无可用剧本"
            description="请先创建或导入剧本。"
            size="sm"
            animate={false}
          />
        </Surface>
      ) : (
        <div className="scenario-library-grid">
          {scenarios.map((scenario) => {
            const meta = getScenarioCardMeta({
              difficulty: scenario.difficulty,
              estimatedDuration: scenario.estimatedDuration,
              tags: scenario.tags,
            });

            return (
              <button
                key={scenario.id}
                className="scenario-library-card"
                data-tone={meta.tone}
                onClick={() => startScenario(scenario.id)}
              >
                <div className="scenario-library-card__cover">
                  {scenario.coverImage ? (
                    <img
                      src={scenario.coverImage}
                      alt={scenario.title}
                    />
                  ) : (
                    <BookOpen size={42} />
                  )}
                </div>

                <div className="scenario-library-card__body">
                  <span>{meta.difficultyLabel}</span>
                  <h2>{scenario.title}</h2>
                  <p>{scenario.description}</p>

                  <div className="scenario-library-card__meta">
                    <span><Clock size={14} />{meta.durationLabel}</span>
                    <span><Play size={14} />开始</span>
                  </div>

                  {meta.tags.length > 0 && (
                    <div className="scenario-library-card__tags">
                      {meta.tags.map((tag) => (
                        <span key={tag}><Tag size={12} />{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
