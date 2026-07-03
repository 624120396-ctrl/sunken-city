import { DoubleBezelCard } from '@components/ui/DoubleBezelCard';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Check, X } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { COC7E_SKILLS } from '@lib/coc7-data';
import { rollSkillGrowth } from '@lib/combat-data';
import { Button, DataCard, PageShell, ReadablePanel } from '@components/system';
import { getCharacterGrowthSummary } from '@components/characters/characterArchiveMeta';

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

  useEffect(() => {
    const loadCharacter = async () => {
      try {
        const response = await apiFetch(`/characters/${id}`);
        const data = await handleApiResponse<{ character: any }>(response);
        setCharacter(data.character);
      } catch (error) {
        console.error('获取角色失败:', error);
      }
    };

    void loadCharacter();
  }, [id]);

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

  const growthSummary = getCharacterGrowthSummary(growthResults);

  if (!character) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#a63848] border-t-transparent" />
      </div>
    );
  }

  return (
    <PageShell
      className="character-growth-page"
      title={`战后技能成长 - ${character.name}`}
      eyebrow="skill growth"
      description="选择本局成功使用过的技能，执行 COC7 成长检定并保存结果。"
      actions={
        <Button variant="secondary" onClick={() => navigate(`/characters/${id}`)} icon={<ArrowLeft size={18} />}>
          返回档案
        </Button>
      }
    >

      <ReadablePanel title="使用说明" eyebrow="growth rules" className="character-growth-rules mb-6">
        <div className="space-y-2">
          <p>1. 选择本局游戏中<strong>成功使用过</strong>的技能</p>
          <p>2. 每个选中技能可以进行一次成长检定</p>
          <p>3. COC7成长规则：掷1D100，结果<strong>大于</strong>当前技能值则成长成功</p>
          <p>4. 成长成功时，技能提升1D10点</p>
        </div>
      </ReadablePanel>

      <div className="character-growth-grid">
        {/* 技能选择 */}
        <DoubleBezelCard variant="gold" runeCorners className="character-growth-panel" innerClassName="p-4">
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
                  <h4 className="text-sm font-bold text-[#c9a227] mb-2 capitalize">{category}</h4>
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
                              ? 'bg-[#a63848]/30 border border-[#a63848]'
                              : 'bg-black/20 hover:bg-black/20/80'
                          }`}
                        >
                          <div className="flex justify-between">
                            <span>{skill.name}</span>
                            <span className="text-[#6b6558]">{currentValue}%</span>
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
        </DoubleBezelCard>

        {/* 成长结果 */}
        <div className="space-y-4">
          <DoubleBezelCard variant="gold" runeCorners className="character-growth-panel" innerClassName="p-4">
            <h3 className="font-bold mb-4">操作</h3>
            <div className="space-y-3">
              <Button
                onClick={rollAllGrowth}
                disabled={selectedSkills.size === 0 || loading}
                variant="primary"
                className="w-full"
                icon={<RefreshCw size={18} />}
              >
                执行成长检定
              </Button>
              
              {growthResults.length > 0 && (
                <Button
                  onClick={saveGrowth}
                  disabled={loading || saved}
                  variant="secondary"
                  className="w-full"
                  icon={saved ? <Check size={18} /> : <X size={18} />}
                >
                  {saved ? '已保存' : '保存成长结果'}
                </Button>
              )}
            </div>

            {growthResults.length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold mb-3">成长统计</h4>
                <div className="grid grid-cols-2 gap-3">
                  {growthSummary.map((item) => (
                    <DataCard
                      key={item.key}
                      className={item.key === 'gained' ? 'col-span-2' : undefined}
                      label={item.label}
                      value={item.value}
                      tone={item.tone}
                    />
                  ))}
                </div>
              </div>
            )}
          </DoubleBezelCard>

          {/* 详细结果 */}
          {growthResults.length > 0 && (
            <DoubleBezelCard variant="gold" runeCorners className="character-growth-panel" innerClassName="p-4">
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
                      <div className="text-xs text-[#8b8375]">
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
            </DoubleBezelCard>
          )}
        </div>
      </div>
    </PageShell>
  );
}
