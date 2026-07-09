import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Check, X, BookOpen, ScrollText, TrendingUp, User } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { COC7E_SKILLS } from '@lib/coc7-data';
import { rollSkillGrowth } from '@lib/combat-data';
import { Button, PageShell, Surface } from '@components/system';
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
      title="战后成长"
      eyebrow="SKILL GROWTH"
      description="余烬尚温，命运在旧伤旁留下细小裂纹，等待下一次潮声。"
      actions={
        <Button variant="secondary" onClick={() => navigate(`/characters/${id}`)} icon={<ArrowLeft size={18} />}>
          返回档案
        </Button>
      }
      aside={
        <div className="character-growth-aside">
          <Surface variant="panel" material="archive" padding="md" className="character-growth-aside-card">
            <div className="character-growth-aside-card__heading">
              <User size={14} />
              调查员
            </div>
            <div className="character-growth-aside-card__body">
              <strong>{character.name}</strong>
              <span>{character.occupation || '职业未登记'} · #{String(character.displayId ?? 0).padStart(8, '0')}</span>
            </div>
          </Surface>

          <Surface variant="panel" material="archive" padding="md" className="character-growth-aside-card">
            <div className="character-growth-aside-card__heading">
              <TrendingUp size={14} />
              成长账本
            </div>
            <div className="character-growth-aside-grid">
              <div className="coc-archive-subcard character-growth-aside-entry">
                <span>已选技能</span>
                <strong>{selectedSkills.size}</strong>
              </div>
              <div className="coc-archive-subcard character-growth-aside-entry">
                <span>检定结果</span>
                <strong>{growthResults.length}</strong>
              </div>
            </div>
          </Surface>

          <Surface variant="panel" material="archive" padding="md" className="character-growth-aside-card">
            <div className="character-growth-aside-card__heading">
              <BookOpen size={14} />
              规则摘录
            </div>
            <div className="character-growth-aside-card__body">
              <span>成长检定掷出大于当前技能值时成功，成功后提升 1D10 点。</span>
            </div>
          </Surface>
        </div>
      }
    >

      <Surface variant="panel" material="archive" padding="md" className="character-growth-rules">
        <div className="character-growth-section-title">
          <ScrollText size={16} />
          <span>成长规则</span>
        </div>
        <div className="character-growth-rules__body">
          <p>1. 选择本局游戏中<strong>成功使用过</strong>的技能</p>
          <p>2. 每个选中技能可以进行一次成长检定</p>
          <p>3. COC7成长规则：掷1D100，结果<strong>大于</strong>当前技能值则成长成功</p>
          <p>4. 成长成功时，技能提升1D10点</p>
        </div>
      </Surface>

      <div className="character-growth-grid">
        {/* 技能选择 */}
        <Surface variant="panel" material="archive" padding="md" className="character-growth-panel character-growth-skill-panel">
          <div className="character-growth-section-title">
            <TrendingUp size={16} />
            <span>选择成长技能</span>
            <b>{selectedSkills.size}</b>
          </div>
          <div className="character-growth-skill-list">
            {(() => {
              const groups = COC7E_SKILLS.reduce((acc, skill) => {
                acc[skill.category] = acc[skill.category] || [];
                acc[skill.category].push(skill);
                return acc;
              }, {} as Record<string, typeof COC7E_SKILLS>);
              return Object.entries(groups).map(([category, skills]) => (
                <section key={category} className="character-growth-skill-group">
                  <h4>{category}</h4>
                  <div className="character-growth-skill-group__grid">
                    {skills.map(skill => {
                      const currentValue = character.skills?.[skill.key] ?? skill.baseValue;
                      const isSelected = selectedSkills.has(skill.key);
                      const hasResult = growthResults.find(r => r.skillKey === skill.key);

                      return (
                        <button
                          key={skill.key}
                          onClick={() => !hasResult && toggleSkill(skill.key)}
                          disabled={!!hasResult}
                          className={`character-growth-skill-row ${
                            hasResult
                              ? hasResult.success
                                ? 'is-success'
                                : 'is-failed'
                              : isSelected
                              ? 'is-selected'
                              : ''
                          }`}
                        >
                          <div className="character-growth-skill-row__top">
                            <span>{skill.name}</span>
                            <b>{currentValue}%</b>
                          </div>
                          {hasResult && (
                            <div className="character-growth-skill-row__result">
                              {hasResult.success ? (
                                <span data-tone="success">
                                  ↑ {hasResult.newValue}% (+{hasResult.newValue - hasResult.oldValue})
                                </span>
                              ) : (
                                <span data-tone="failed">未成长 ({hasResult.rollResult})</span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ));
            })()}
          </div>
        </Surface>

        {/* 成长结果 */}
        <div className="character-growth-side-stack">
          <Surface variant="panel" material="archive" padding="md" className="character-growth-panel">
            <div className="character-growth-section-title">
              <ScrollText size={16} />
              <span>检定操作</span>
            </div>
            <div className="character-growth-actions">
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
              <div className="character-growth-summary">
                <div className="character-growth-section-title character-growth-section-title--small">
                  <span>成长统计</span>
                </div>
                <div className="character-growth-summary__grid">
                  {growthSummary.map((item) => (
                    <div
                      key={item.key}
                      className="coc-archive-subcard character-growth-summary-card"
                      data-tone={item.tone}
                      data-wide={item.key === 'gained' ? 'true' : 'false'}
                    >
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Surface>

          {/* 详细结果 */}
          {growthResults.length > 0 && (
            <Surface variant="panel" material="archive" padding="md" className="character-growth-panel">
              <div className="character-growth-section-title">
                <BookOpen size={16} />
                <span>详细结果</span>
              </div>
              <div className="character-growth-result-list">
                {growthResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="coc-archive-subcard character-growth-result-row"
                    data-result={result.success ? 'success' : 'failed'}
                  >
                    <div>
                      <div className="character-growth-result-row__name">{result.skillName}</div>
                      <div className="character-growth-result-row__meta">
                        检定: {result.rollResult} vs {result.oldValue}%
                      </div>
                    </div>
                    <div className="character-growth-result-row__value">
                      {result.success ? (
                        <>
                          <strong>+{result.newValue - result.oldValue}</strong>
                          <span>{result.oldValue}% → {result.newValue}%</span>
                        </>
                      ) : (
                        <strong>未成长</strong>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Surface>
          )}
        </div>
      </div>
    </PageShell>
  );
}
