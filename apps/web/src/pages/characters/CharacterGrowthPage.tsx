import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Check, X } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { COC7E_SKILLS } from '@lib/coc7-data';
import { rollSkillGrowth } from '@lib/combat-data';

interface SkillGrowth {
  skillKey: string;
  skillName: string;
  oldValue: number;
  rollResult: number;
  success: boolean;
  newValue: number;
}

export function CharacterGrowthPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<any>(null);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [growthResults, setGrowthResults] = useState<SkillGrowth[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // 模拟从API获取角色数据
  const loadCharacter = async () => {
    try {
      const response = await apiFetch(`/characters/${id}`);
      const data = await handleApiResponse<{ character: any }>(response);
      setCharacter(data.character);
    } catch (error) {
      console.error('获取角色失败:', error);
    }
  };

  const toggleSkill = (skillKey: string) => {
    const newSet = new Set(selectedSkills);
    if (newSet.has(skillKey)) {
      newSet.delete(skillKey);
    } else {
      newSet.add(skillKey);
    }
    setSelectedSkills(newSet);
  };

  const rollAllGrowth = () => {
    const results: SkillGrowth[] = [];

    selectedSkills.forEach((skillKey: string) => {
      const def = COC7E_SKILLS.find(s => s.key === skillKey);
      const currentValue = character?.skills?.[skillKey] ?? def?.baseValue ?? 0;

      const { roll, success, newValue } = rollSkillGrowth(currentValue);
      results.push({
        skillKey,
        skillName: def?.name || skillKey,
        oldValue: currentValue,
        rollResult: roll,
        success,
        newValue,
      });
    });

    setGrowthResults(results);
    setSaved(false);
  };

  const saveGrowth = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/characters/${id}/growth`, {
        method: 'POST',
        body: JSON.stringify({
          growths: growthResults.map(r => ({ skillName: r.skillKey, newValue: r.newValue })),
        }),
      });
      await handleApiResponse(response);
      setSaved(true);
    } catch (error) {
      console.error('保存成长失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!character) {
    loadCharacter();
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-coc-accent-red border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/characters/${id}`)}
          className="coc-btn-secondary p-2"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-serif font-bold">战后技能成长 - {character.name}</h1>
      </div>

      <div className="coc-card mb-6">
        <h2 className="font-bold mb-4">使用说明</h2>
        <div className="text-sm text-coc-text-secondary space-y-2">
          <p>1. 选择本局游戏中<strong>成功使用过</strong>的技能</p>
          <p>2. 每个选中技能可以进行一次成长检定</p>
          <p>3. COC7成长规则：掷1D100，结果<strong>大于</strong>当前技能值则成长成功</p>
          <p>4. 成长成功时，技能提升1D10点</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 技能选择 */}
        <div className="coc-card">
          <h3 className="font-bold mb-4">选择成长技能 ({selectedSkills.size})</h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {(() => {
              const groups = COC7E_SKILLS.reduce((acc, skill) => {
                acc[skill.category] = acc[skill.category] || [];
                acc[skill.category].push(skill);
                return acc;
              }, {} as Record<string, typeof COC7E_SKILLS>);
              return Object.entries(groups).map(([category, skills]) => (
                <div key={category}>
                  <h4 className="text-sm font-bold text-coc-accent-gold mb-2 capitalize">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {skills.map(skill => {
                      const currentValue = character.skills?.[skill.key] ?? skill.baseValue;
                      const isSelected = selectedSkills.has(skill.key);
                      const hasResult = growthResults.find(r => r.skillKey === skill.key);

                      return (
                        <button
                          key={skill.key}
                          onClick={() => !hasResult && toggleSkill(skill.key)}
                          disabled={!!hasResult}
                          className={`p-2 rounded text-left text-sm transition-colors ${
                            hasResult
                              ? hasResult.success
                                ? 'bg-green-900/30 border border-green-500/50'
                                : 'bg-red-900/30 border border-red-500/50'
                              : isSelected
                              ? 'bg-coc-accent-red/30 border border-coc-accent-red'
                              : 'bg-coc-bg-tertiary hover:bg-coc-bg-tertiary/80'
                          }`}
                        >
                          <div className="flex justify-between">
                            <span>{skill.name}</span>
                            <span className="text-coc-text-muted">{currentValue}%</span>
                          </div>
                          {hasResult && (
                            <div className="text-xs mt-1">
                              {hasResult.success ? (
                                <span className="text-green-400">
                                  ↑ {hasResult.newValue}% (+{hasResult.newValue - hasResult.oldValue})
                                </span>
                              ) : (
                                <span className="text-red-400">未成长 ({hasResult.rollResult})</span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* 成长结果 */}
        <div className="space-y-4">
          <div className="coc-card">
            <h3 className="font-bold mb-4">操作</h3>
            <div className="space-y-3">
              <button
                onClick={rollAllGrowth}
                disabled={selectedSkills.size === 0 || loading}
                className="w-full coc-btn-primary flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                执行成长检定
              </button>
              
              {growthResults.length > 0 && (
                <button
                  onClick={saveGrowth}
                  disabled={loading || saved}
                  className="w-full coc-btn-secondary flex items-center justify-center gap-2"
                >
                  {saved ? <Check size={18} /> : <X size={18} />}
                  {saved ? '已保存' : '保存成长结果'}
                </button>
              )}
            </div>

            {growthResults.length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold mb-3">成长统计</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-coc-bg-tertiary rounded text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {growthResults.filter(r => r.success).length}
                    </div>
                    <div className="text-xs text-coc-text-secondary">成长成功</div>
                  </div>
                  <div className="p-3 bg-coc-bg-tertiary rounded text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {growthResults.filter(r => !r.success).length}
                    </div>
                    <div className="text-xs text-coc-text-secondary">成长失败</div>
                  </div>
                  <div className="p-3 bg-coc-bg-tertiary rounded text-center col-span-2">
                    <div className="text-2xl font-bold text-coc-accent-gold">
                      {growthResults.filter(r => r.success).reduce((sum, r) => sum + (r.newValue - r.oldValue), 0)}
                    </div>
                    <div className="text-xs text-coc-text-secondary">总成长点数</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 详细结果 */}
          {growthResults.length > 0 && (
            <div className="coc-card">
              <h4 className="font-bold mb-3">详细结果</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {growthResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded flex items-center justify-between ${
                      result.success ? 'bg-green-900/20' : 'bg-red-900/20'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{result.skillName}</div>
                      <div className="text-xs text-coc-text-secondary">
                        检定: {result.rollResult} vs {result.oldValue}%
                      </div>
                    </div>
                    <div className="text-right">
                      {result.success ? (
                        <>
                          <div className="text-green-400 font-bold">+{result.newValue - result.oldValue}</div>
                          <div className="text-xs">{result.oldValue}% → {result.newValue}%</div>
                        </>
                      ) : (
                        <div className="text-red-400">未成长</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}