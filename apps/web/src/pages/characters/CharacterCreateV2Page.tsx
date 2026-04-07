import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dice5, ChevronRight, ChevronLeft, User, Sparkles, RefreshCw } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { COC7E_SKILLS, getDefaultSkills, resolveDynamicBases, getOccupationInfo, COC7E_OCCUPATIONS } from '@lib/coc7-data';
import { calculateDerivedAttributes } from '@lib/coc-data';

const ATTRIBUTE_LABELS: Record<string, string> = {
  str: '力量 STR', con: '体质 CON', siz: '体型 SIZ', dex: '敏捷 DEX',
  app: '外貌 APP', int: '智力 INT', pow: '意志 POW', edu: '教育 EDU',
};

const BACKGROUND_TYPES = [
  { key: '形象描述', label: '形象描述', placeholder: '身高、体重、发色、眼睛等外表特征' },
  { key: '思想信念', label: '思想信念', placeholder: '信仰、价值观、世界观' },
  { key: '重要之人', label: '重要之人', placeholder: '对调查员有意义的人' },
  { key: '意义非凡之地', label: '意义非凡之地', placeholder: '对调查员有特殊意义的地点' },
  { key: '宝贵之物', label: '宝贵之物', placeholder: '调查员珍视的物品' },
  { key: '特质', label: '特质', placeholder: '性格特点、怪癖、习惯' },
];

export function CharacterCreateV2Page() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Wizard state
  const [method, setMethod] = useState<'roll' | 'pointbuy' | null>(null);
  const [rawAttrs, setRawAttrs] = useState<Record<string, number>>({
    str: 50, con: 50, siz: 50, dex: 50, app: 50, int: 50, pow: 50, edu: 50,
  });
  const [finalAttrs, setFinalAttrs] = useState<Record<string, number>>({
    str: 50, con: 50, siz: 50, dex: 50, app: 50, int: 50, pow: 50, edu: 50,
  });
  const [age, setAge] = useState(25);
  const [luck, setLuck] = useState(50);
  const [eduEnhancements, setEduEnhancements] = useState<any[]>([]);
  const [ageApplied, setAgeApplied] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [occupationKey, setOccupationKey] = useState('');
  const [skillPointsAvailable, setSkillPointsAvailable] = useState({ occupation: 0, interest: 0 });
  const [creditRating, setCreditRating] = useState(0);
  const [baseSkills] = useState<Record<string, number>>(() => getDefaultSkills());
  const [skillAdds, setSkillAdds] = useState<Record<string, { occ: number; int: number }>>({});
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [backgroundEntries, setBackgroundEntries] = useState<Record<string, string>>({});
  const [keyConnection, setKeyConnection] = useState('');

  // Derived values
  const currentSkills = useMemo(() => {
    const dynamic = resolveDynamicBases({ dex: finalAttrs.dex, edu: finalAttrs.edu });
    const result: Record<string, number> = { ...baseSkills, ...dynamic };
    for (const key of Object.keys(skillAdds)) {
      const add = skillAdds[key];
      if (add) result[key] = (result[key] || 0) + add.occ + add.int;
    }
    // Credit rating override with allocated points
    const crAdd = skillAdds['credit_rating']?.occ || 0;
    result['credit_rating'] = crAdd;
    return result;
  }, [baseSkills, skillAdds, finalAttrs.dex, finalAttrs.edu]);

  const usedPoints = useMemo(() => {
    let occ = 0;
    let interest = 0;
    for (const k of Object.keys(skillAdds)) {
      occ += skillAdds[k]?.occ || 0;
      interest += skillAdds[k]?.int || 0;
    }
    return { occ, interest };
  }, [skillAdds]);

  const selectedOccupation = useMemo(() => getOccupationInfo(occupationKey), [occupationKey]);

  // ========== API helpers ==========
  async function apiGenerateAttributesRoll() {
    const res = await apiFetch('/characters/generate/attributes/roll', { method: 'POST' });
    return handleApiResponse<{ attrs: Record<string, number> }>(res);
  }

  async function apiGenerateAgeAdjustment(age: number, rawAttrsArg: Record<string, number>) {
    const res = await apiFetch('/characters/generate/age-adjustment', {
      method: 'POST',
      body: JSON.stringify({ age, rawAttrs: rawAttrsArg }),
    });
    return handleApiResponse<any>(res);
  }

  async function apiGenerateSkillPoints(occupationKeyArg: string, finalAttrsArg: Record<string, number>) {
    const res = await apiFetch('/characters/generate/skill-points', {
      method: 'POST',
      body: JSON.stringify({ occupationKey: occupationKeyArg, finalAttrs: finalAttrsArg }),
    });
    return handleApiResponse<any>(res);
  }

  // ========== Step handlers ==========
  const handleRollAttributes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGenerateAttributesRoll();
      setRawAttrs(data.attrs);
      // Auto apply age with default 25
      const adj = await apiGenerateAgeAdjustment(age, data.attrs);
      setFinalAttrs(adj.finalAttrs);
      setLuck(adj.luck);
      setEduEnhancements(adj.eduEnhancements);
      setHasRolled(true);
      setAgeApplied(true);
    } catch (e: any) {
      setError(e.message || '生成属性失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAge = async () => {
    setLoading(true);
    setError('');
    try {
      const adj = await apiGenerateAgeAdjustment(age, rawAttrs);
      setFinalAttrs(adj.finalAttrs);
      setLuck(adj.luck);
      setEduEnhancements(adj.eduEnhancements);
      setAgeApplied(true);
    } catch (e: any) {
      setError(e.message || '年龄调整失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOccupation = async (key: string) => {
    setOccupationKey(key);
    setLoading(true);
    try {
      const data = await apiGenerateSkillPoints(key, finalAttrs);
      setSkillPointsAvailable({ occupation: data.occupationPoints, interest: data.interestPoints });
      const occ = getOccupationInfo(key);
      if (occ) {
        const initCr = Math.max(occ.creditRatingMin, Math.min(occ.creditRatingMax, occ.creditRatingMin));
        setCreditRating(initCr);
        setSkillAdds({ 'credit_rating': { occ: initCr, int: 0 } });
      } else {
        setCreditRating(0);
        setSkillAdds({});
      }
    } catch (e: any) {
      setError(e.message || '计算技能点失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      if (usedPoints.occ > skillPointsAvailable.occupation || usedPoints.interest > skillPointsAvailable.interest) {
        setError('技能点分配超出限制，请重新调整');
        setLoading(false);
        return;
      }
      const entries = Object.entries(backgroundEntries)
        .filter(([_, v]) => v.trim())
        .map(([type, content]) => ({ type, content }));
      const body = {
        name,
        occupationKey,
        age,
        gender,
        rawAttrs,
        finalAttrs,
        luck,
        creditRating,
        skills: currentSkills,
        skillPointsJson: {
          occupationPoints: skillPointsAvailable.occupation,
          interestPoints: skillPointsAvailable.interest,
          usedOccupation: usedPoints.occ,
          usedInterest: usedPoints.interest,
        },
        backgroundEntries: entries,
        keyConnection,
        weapons: [],
        armor: null,
      };
      const res = await apiFetch('/characters', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await handleApiResponse(res);
      navigate('/characters');
    } catch (e: any) {
      setError(e.message || '创建失败');
      setLoading(false);
    }
  };

  // ========== Skill helpers ==========
  const isCoreSkill = (skillKey: string) => {
    if (!selectedOccupation) return false;
    const core = selectedOccupation.coreSkills || [];
    // Exact match
    if (core.includes(skillKey)) return true;
    // Prefix match with wildcard, e.g. "art_craft:任一"
    const [prefix] = skillKey.split(':');
    if (core.includes(`${prefix}:任一`)) return true;
    // 格斗:任一 射击:任一 等前缀匹配
    for (const c of core) {
      if (c.startsWith(prefix + ':')) return true;
    }
    return false;
  };

  const isElectiveSkill = (skillKey: string) => {
    if (!selectedOccupation?.electivePool) return false;
    const pool = selectedOccupation.electivePool;
    if (pool.includes(skillKey)) return true;
    const [prefix] = skillKey.split(':');
    return pool.some(p => p.startsWith(prefix + ':'));
  };

  const canAddOccupationPoint = (skillKey: string) => {
    if (skillKey === 'credit_rating') return true;
    if (isCoreSkill(skillKey)) return true;
    if (isElectiveSkill(skillKey)) return true;
    // 若 electivePool 为空但存在选修数量，则允许将本职点投入任意技能（除克苏鲁神话外）
    if ((selectedOccupation?.electiveCount || 0) > 0 && (!selectedOccupation?.electivePool || selectedOccupation.electivePool.length === 0)) {
      return skillKey !== 'cthulhu_mythos';
    }
    return false;
  };

  const canAddInterestPoint = (skillKey: string) => {
    return skillKey !== 'credit_rating' && skillKey !== 'cthulhu_mythos';
  };

  const adjustSkill = (skillKey: string, deltaOcc: number, deltaInt: number) => {
    setSkillAdds(prev => {
      const current = prev[skillKey] || { occ: 0, int: 0 };
      let nextOcc = current.occ + deltaOcc;
      let nextInt = current.int + deltaInt;
      if (nextOcc < 0) nextOcc = 0;
      if (nextInt < 0) nextInt = 0;

      // 硬上限：不能超过可用点数
      const totalOcc = Object.values(prev).reduce((sum, s) => sum + (s?.occ || 0), 0);
      const totalInt = Object.values(prev).reduce((sum, s) => sum + (s?.int || 0), 0);
      const maxOcc = skillPointsAvailable.occupation - (totalOcc - current.occ);
      const maxInt = skillPointsAvailable.interest - (totalInt - current.int);
      if (nextOcc > maxOcc) nextOcc = maxOcc;
      if (nextInt > maxInt) nextInt = maxInt;

      const newState = { ...prev, [skillKey]: { occ: nextOcc, int: nextInt } };
      if (newState[skillKey].occ === 0 && newState[skillKey].int === 0) {
        delete (newState as any)[skillKey];
      }
      return newState;
    });
  };

  // ========== UI ==========
  const totalSteps = 7;

  const nextStep = () => {
    setError('');
    if (step === 1 && !method) { setError('请选择创建方式'); return; }
    if (step === 2 && method === 'roll' && !hasRolled) { setError('请先生成属性'); return; }
    if (step === 2 && method === 'pointbuy') {
      const used = Object.values(rawAttrs).reduce((a, b) => a + b, 0);
      if (used > 460) { setError('购点超出限制，请重新分配'); return; }
    }
    if (step === 3 && !ageApplied) { setError('请先应用年龄调整'); return; }
    if (step === 4 && !occupationKey) { setError('请选择职业'); return; }
    if (step === 5) {
      if (usedPoints.occ > skillPointsAvailable.occupation) { setError('本职技能点超出限制'); return; }
      if (usedPoints.interest > skillPointsAvailable.interest) { setError('兴趣技能点超出限制'); return; }
    }
    if (step === 6) {
      if (!name.trim()) { setError('请输入调查员姓名'); return; }
      if (!keyConnection) { setError('请选择关键背景连接'); return; }
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => { if (step > 1) setStep(step - 1); };

  return (
    <div className="min-h-screen bg-coc-bg-primary text-coc-text-primary font-body pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-coc-bg-primary/95 backdrop-blur border-b border-coc-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/characters')} className="flex items-center gap-1 text-coc-text-secondary hover:text-coc-accent-red transition-colors">
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <h1 className="font-ritual text-lg tracking-wide">创建调查员</h1>
          <div className="text-sm text-coc-text-muted">步骤 {step}/{totalSteps}</div>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-coc-bg-tertiary">
          <div className="h-full bg-coc-accent-red transition-all" style={{ width: `${(step / totalSteps) * 100}%` }} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        {error && (
          <div className="mb-4 p-3 rounded bg-coc-blood.dark/30 border border-coc-blood text-coc-blood.glow text-sm">{error}</div>
        )}

        {/* Step 1: Method */}
        {step === 1 && (
          <div className="coc-card p-6">
            <h2 className="font-ritual text-xl mb-6 text-center">选择创建方式</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setMethod('roll');
                  setRawAttrs({ str: 50, con: 50, siz: 50, dex: 50, app: 50, int: 50, pow: 50, edu: 50 });
                  setFinalAttrs({ str: 50, con: 50, siz: 50, dex: 50, app: 50, int: 50, pow: 50, edu: 50 });
                  setHasRolled(false);
                  setAgeApplied(false);
                  setEduEnhancements([]);
                }}
                className={`p-6 rounded-xl border text-left transition-all ${method === 'roll' ? 'border-coc-accent-red bg-coc-accent-red/10' : 'border-coc-border hover:border-coc-text-muted'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Dice5 className="text-coc-accent-red" />
                  <span className="font-bold text-lg">投骰生成</span>
                </div>
                <p className="text-sm text-coc-text-secondary">经典的 COC7e 体验。通过掷骰决定八项属性，感受命运的无常。</p>
              </button>

              <button
                onClick={() => {
                  setMethod('pointbuy');
                  setRawAttrs({ str: 50, con: 50, siz: 50, dex: 50, app: 50, int: 50, pow: 50, edu: 50 });
                  setFinalAttrs({ str: 50, con: 50, siz: 50, dex: 50, app: 50, int: 50, pow: 50, edu: 50 });
                  setHasRolled(false);
                  setAgeApplied(false);
                  setEduEnhancements([]);
                }}
                className={`p-6 rounded-xl border text-left transition-all ${method === 'pointbuy' ? 'border-coc-accent-red bg-coc-accent-red/10' : 'border-coc-border hover:border-coc-text-muted'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="text-coc-accent-red" />
                  <span className="font-bold text-lg">购点制</span>
                </div>
                <p className="text-sm text-coc-text-secondary">在 460 点自由分配池中，精准构建你心目中的调查员。</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Attributes */}
        {step === 2 && (
          <div className="coc-card p-6">
            <h2 className="font-ritual text-xl mb-4">{method === 'roll' ? '投骰生成属性' : '购点分配属性'}</h2>

            {method === 'roll' ? (
              <div className="text-center">
                <button
                  onClick={handleRollAttributes}
                  disabled={loading}
                  className="coc-btn-primary inline-flex items-center gap-2 px-6 py-3"
                >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <Dice5 size={18} />}
                  掷骰生成
                </button>
                {rawAttrs.str && rawAttrs.str !== 50 && (
                  <div className="mt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => (
                        <div key={key} className="p-3 rounded bg-coc-bg-tertiary text-center">
                          <div className="text-xs text-coc-text-muted">{label}</div>
                          <div className="text-xl font-mono text-coc-accent-red">{rawAttrs[key]}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <span className="text-sm text-coc-text-secondary">总点数</span>
                      <span className="ml-2 text-2xl font-mono text-coc-accent-red">
                        {Object.values(rawAttrs).reduce((a, b) => a + b, 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <PointBuyPanel rawAttrs={rawAttrs} setRawAttrs={setRawAttrs} />
            )}
          </div>
        )}

        {/* Step 3: Age */}
        {step === 3 && (
          <div className="coc-card p-6">
            <h2 className="font-ritual text-xl mb-4">决定年龄</h2>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-coc-text-secondary">年龄</span>
              <input
                type="range"
                min={15}
                max={89}
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value))}
                className="flex-1 accent-coc-accent-red"
              />
              <span className="font-mono text-lg w-12 text-right">{age}</span>
              <button onClick={handleApplyAge} disabled={loading} className="coc-btn-primary px-4 py-2 text-sm">应用调整</button>
            </div>

            {eduEnhancements.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => (
                    <div key={key} className="p-3 rounded bg-coc-bg-tertiary text-center">
                      <div className="text-xs text-coc-text-muted">{label}</div>
                      <div className="flex justify-center items-center gap-2">
                        <span className="text-sm text-coc-text-muted">{rawAttrs[key]}</span>
                        <span className="text-coc-text-muted">→</span>
                        <span className="text-xl font-mono text-coc-accent-red">{finalAttrs[key]}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <span className="text-sm text-coc-text-secondary">总点数</span>
                  <span className="mx-2 text-sm text-coc-text-muted">{Object.values(rawAttrs).reduce((a, b) => a + b, 0)}</span>
                  <span className="text-coc-text-muted">→</span>
                  <span className="ml-2 text-2xl font-mono text-coc-accent-red">{Object.values(finalAttrs).reduce((a, b) => a + b, 0)}</span>
                </div>

                <div className="p-3 rounded bg-coc-bg-tertiary">
                  <div className="text-sm text-coc-text-secondary mb-2">EDU 增强检定</div>
                  <div className="flex flex-wrap gap-2">
                    {eduEnhancements.map((e, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-coc-bg-secondary text-xs">
                        第{i+1}次: 投出 {e.roll}, {e.gained > 0 ? `+${e.gained} → ${e.newEdu}` : '未提升'}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded bg-coc-bg-tertiary">
                  <div className="text-sm text-coc-text-secondary">幸运: <span className="text-coc-parchment font-mono">{luck}</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Occupation */}
        {step === 4 && (
          <div className="coc-card p-6">
            <h2 className="font-ritual text-xl mb-4">选择职业</h2>
            <div className="grid md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {COC7E_OCCUPATIONS.map((occ) => (
                <button
                  key={occ.key}
                  onClick={() => handleSelectOccupation(occ.key)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    occupationKey === occ.key
                      ? 'border-coc-accent-red bg-coc-accent-red/10'
                      : 'border-coc-border hover:border-coc-text-muted bg-coc-bg-tertiary/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-bold">{occ.name}</div>
                    <div className="text-xs text-coc-text-muted">{occ.skillPointFormula}</div>
                  </div>
                  <div className="text-xs text-coc-text-secondary mt-1">信用 {occ.creditRatingMin}-{occ.creditRatingMax} · {occ.electiveDescription || '无自选'}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Skills */}
        {step === 5 && selectedOccupation && (
          <div className="coc-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-ritual text-xl">分配技能点</h2>
              <div className="flex gap-3 text-sm">
                <div className="px-3 py-1 rounded bg-coc-bg-tertiary">
                  本职: <span className={`font-mono ${usedPoints.occ > skillPointsAvailable.occupation ? 'text-coc-blood.glow' : 'text-coc-accent-red'}`}>{usedPoints.occ}</span>
                  <span className="text-coc-text-muted">/{skillPointsAvailable.occupation}</span>
                </div>
                <div className="px-3 py-1 rounded bg-coc-bg-tertiary">
                  兴趣: <span className={`font-mono ${usedPoints.interest > skillPointsAvailable.interest ? 'text-coc-blood.glow' : 'text-coc-accent-red'}`}>{usedPoints.interest}</span>
                  <span className="text-coc-text-muted">/{skillPointsAvailable.interest}</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm text-coc-text-secondary">信用评级 ({selectedOccupation.creditRatingMin}-{selectedOccupation.creditRatingMax})</label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min={selectedOccupation.creditRatingMin}
                  max={selectedOccupation.creditRatingMax}
                  value={creditRating}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const otherOcc = usedPoints.occ - (skillAdds['credit_rating']?.occ || 0);
                    const remainingOcc = skillPointsAvailable.occupation - otherOcc;
                    const maxCr = Math.min(selectedOccupation.creditRatingMax, remainingOcc);
                    const clamped = Math.max(selectedOccupation.creditRatingMin, Math.min(maxCr, val));
                    setCreditRating(clamped);
                    const diff = clamped - (skillAdds['credit_rating']?.occ || 0);
                    if (diff !== 0) adjustSkill('credit_rating', diff, 0);
                  }}
                  className="flex-1 accent-coc-accent-red"
                />
                <span className="font-mono w-10">{creditRating}</span>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2">
              {COC7E_SKILLS.map((skill) => {
                const key = skill.key;
                const add = skillAdds[key] || { occ: 0, int: 0 };
                const current = currentSkills[key] || skill.baseValue;
                const isCore = isCoreSkill(key);
                const isElective = isElectiveSkill(key);
                const canOcc = canAddOccupationPoint(key);
                const canInt = canAddInterestPoint(key);
                const occDisabled = !canOcc || usedPoints.occ >= skillPointsAvailable.occupation;
                const intDisabled = !canInt || usedPoints.interest >= skillPointsAvailable.interest;
                return (
                  <div key={key} className={`flex items-center justify-between p-2 rounded ${isCore ? 'bg-coc-accent-red/10 border border-coc-accent-red/30' : 'bg-coc-bg-tertiary/50'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{skill.name}</span>
                      {isCore && <span className="text-[10px] px-1 rounded bg-coc-accent-red text-white">本职</span>}
                      {isElective && <span className="text-[10px] px-1 rounded bg-coc-madness.DEFAULT text-white">选修</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-coc-text-muted w-8 text-right">{current}</div>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={occDisabled && add.occ === 0}
                          onClick={() => adjustSkill(key, -1, 0)}
                          className="w-6 h-6 rounded bg-coc-bg-tertiary text-coc-text-secondary disabled:opacity-30">-</button>
                        <div className="w-6 text-center text-xs">{add.occ}</div>
                        <button
                          disabled={occDisabled}
                          onClick={() => adjustSkill(key, 1, 0)}
                          className="w-6 h-6 rounded bg-coc-bg-tertiary text-coc-text-secondary disabled:opacity-30"
>+</button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={intDisabled && add.int === 0}
                          onClick={() => adjustSkill(key, 0, -1)}
                          className="w-6 h-6 rounded bg-coc-bg-tertiary text-coc-text-secondary disabled:opacity-30">-</button>
                        <div className="w-6 text-center text-xs">{add.int}</div>
                        <button
                          disabled={intDisabled}
                          onClick={() => adjustSkill(key, 0, 1)}
                          className="w-6 h-6 rounded bg-coc-bg-tertiary text-coc-text-secondary disabled:opacity-30">+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 6: Background */}
        {step === 6 && (
          <div className="coc-card p-6">
            <h2 className="font-ritual text-xl mb-4">背景与基础信息</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-coc-text-secondary">姓名 *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded bg-coc-bg-tertiary border border-coc-border text-coc-text-primary focus:border-coc-accent-red focus:outline-none"
                  placeholder="调查员姓名"
                />
              </div>
              <div>
                <label className="text-sm text-coc-text-secondary">性别</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded bg-coc-bg-tertiary border border-coc-border text-coc-text-primary focus:border-coc-accent-red focus:outline-none"
                >
                  <option value="">请选择</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                  <option value="其他">其他</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {BACKGROUND_TYPES.map((t) => (
                <div key={t.key}>
                  <label className="text-sm text-coc-text-secondary">{t.label}</label>
                  <textarea
                    value={backgroundEntries[t.key] || ''}
                    onChange={(e) => setBackgroundEntries((prev) => ({ ...prev, [t.key]: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded bg-coc-bg-tertiary border border-coc-border text-coc-text-primary focus:border-coc-accent-red focus:outline-none resize-none"
                    rows={2}
                    placeholder={t.placeholder}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="text-sm text-coc-text-secondary">关键背景连接 *</label>
              <select
                value={keyConnection}
                onChange={(e) => setKeyConnection(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded bg-coc-bg-tertiary border border-coc-border text-coc-text-primary focus:border-coc-accent-red focus:outline-none"
              >
                <option value="">请选择最重要的背景条目</option>
                {BACKGROUND_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 7: Preview */}
        {step === 7 && (
          <div className="coc-card p-6">
            <h2 className="font-ritual text-xl mb-4">最终确认</h2>
            <div className="space-y-4">
              <div className="p-4 rounded bg-coc-bg-tertiary">
                <div className="flex items-center gap-3 mb-2">
                  <User className="text-coc-accent-red" />
                  <div className="font-bold text-lg">{name}</div>
                  <div className="text-sm text-coc-text-secondary">{selectedOccupation?.name} · {gender}</div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>STR {finalAttrs.str}</div><div>CON {finalAttrs.con}</div><div>SIZ {finalAttrs.siz}</div><div>DEX {finalAttrs.dex}</div>
                  <div>APP {finalAttrs.app}</div><div>INT {finalAttrs.int}</div><div>POW {finalAttrs.pow}</div><div>EDU {finalAttrs.edu}</div>
                </div>
              </div>

              {(() => {
                const previewDerived = calculateDerivedAttributes(finalAttrs);
                return (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded bg-coc-bg-tertiary">
                        <div className="text-sm text-coc-text-secondary mb-2">战斗数值</div>
                        <div className="text-sm">HP {previewDerived.hp} · MP {previewDerived.mp} · SAN {previewDerived.san} · MOV {previewDerived.mov} · DB {previewDerived.db}</div>
                      </div>
                      <div className="p-4 rounded bg-coc-bg-tertiary">
                        <div className="text-sm text-coc-text-secondary mb-2">资产</div>
                        <div className="text-sm">信用评级 {creditRating} · 现金/资产由后端计算</div>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="p-4 rounded bg-coc-bg-tertiary max-h-40 overflow-y-auto">
                <div className="text-sm text-coc-text-secondary mb-2">已分配技能 (显示值 {'>'} 0)</div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {Object.entries(currentSkills)
                    .filter(([_, v]) => v > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 20)
                    .map(([k, v]) => {
                      const def = COC7E_SKILLS.find(s => s.key === k);
                      return (
                        <span key={k} className="px-2 py-0.5 rounded bg-coc-bg-secondary">
                          {def?.name || k} {v}
                        </span>
                      );
                    })}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full mt-6 coc-btn-primary py-3 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              确认创建调查员
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="px-4 py-2 rounded border border-coc-border text-coc-text-secondary hover:border-coc-text-muted disabled:opacity-30 flex items-center gap-1"
          >
            <ChevronLeft size={18} /> 上一步
          </button>

          {step < totalSteps && (
            <button
              onClick={nextStep}
              className="px-4 py-2 rounded bg-coc-accent-red text-white hover:bg-coc-blood.glow flex items-center gap-1"
            >
              下一步 <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Sub-components ==========

function PointBuyPanel({ rawAttrs, setRawAttrs }: { rawAttrs: Record<string, number>; setRawAttrs: (v: Record<string, number>) => void }) {
  const TOTAL_POINTS = 460;
  const attrsList = ['str', 'con', 'siz', 'dex', 'app', 'int', 'pow', 'edu'] as const;
  const used = attrsList.reduce((sum, k) => sum + (rawAttrs[k] || 50), 0);
  const remaining = TOTAL_POINTS - used;

  const setAttr = (key: string, val: number) => {
    const clamped = Math.max(15, Math.min(90, val));
    setRawAttrs({ ...rawAttrs, [key]: clamped });
  };

  return (
    <div>
      <div className={`text-center mb-4 font-mono text-lg ${remaining < 0 ? 'text-coc-blood.glow' : 'text-coc-accent-red'}`}>
        剩余点数: {remaining} / {TOTAL_POINTS}
      </div>
      <div className="text-center mb-4">
        <span className="text-sm text-coc-text-secondary">总点数</span>
        <span className="ml-2 text-xl font-mono text-coc-accent-red">{used}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {attrsList.map((key) => (
          <div key={key} className="p-3 rounded bg-coc-bg-tertiary">
            <div className="flex justify-between text-sm text-coc-text-secondary mb-1">
              <span>{ATTRIBUTE_LABELS[key]}</span>
              <span className="font-mono">{rawAttrs[key] || 50}</span>
            </div>
            <input
              type="range"
              min={15}
              max={90}
              value={rawAttrs[key] || 50}
              onChange={(e) => setAttr(key, parseInt(e.target.value))}
              className="w-full accent-coc-accent-red"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
