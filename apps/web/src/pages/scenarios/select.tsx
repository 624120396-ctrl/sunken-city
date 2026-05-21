import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@lib/api';
import { useSoloStore } from '@stores/solo.store';

interface Scenario {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  difficulty: string;
  estimatedDuration: number;
  tags?: string;
}

/**
 * 剧本选择页面 - 联调测试入口
 */
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
      // 初始化会话
      await initSession(scenarioId);
      // 跳转到游戏页面
      navigate(`/solo/${scenarioId}`);
    } catch (err) {
      alert(`启动失败: ${(err as Error).message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载剧本列表...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">错误: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <h1 className="text-3xl font-bold text-white mb-8">选择剧本</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="bg-slate-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
            onClick={() => startScenario(scenario.id)}
          >
            {/* 封面 */}
            <div className="h-48 bg-slate-700 flex items-center justify-center">
              {scenario.coverImage ? (
                <img
                  src={scenario.coverImage}
                  alt={scenario.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-slate-500 text-6xl">📖</div>
              )}
            </div>
            
            {/* 信息 */}
            <div className="p-4">
              <h3 className="text-xl font-semibold text-white mb-2">
                {scenario.title}
              </h3>
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                {scenario.description}
              </p>
              
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="px-2 py-1 bg-slate-700 rounded">
                  {scenario.difficulty}
                </span>
                <span>⏱ {scenario.estimatedDuration}分钟</span>
              </div>
              
              {scenario.tags && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {scenario.tags.split(',').map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {scenarios.length === 0 && (
        <div className="text-center text-slate-500 mt-20">
          <p className="text-xl mb-4">暂无可用剧本</p>
          <p>请先创建或导入剧本</p>
        </div>
      )}
    </div>
  );
}
