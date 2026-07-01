import { DoubleBezelCard } from '@components/ui/DoubleBezelCard';
import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Heart, Brain, Sparkles, Zap, Shield, Download, Wand2, X } from 'lucide-react';
import { COC7E_SKILLS, SKILL_CATEGORIES } from '@lib/coc7-data';
import { apiFetch } from '@lib/api';
import { cn } from '@lib/utils';
import { useAuthStore } from '@stores/auth.store';
import { PageShell, Surface } from '@components/system';

interface Character {
  id: string;
  displayId: number;
  userId: string;
  name: string;
  occupation: string;
  age: number;
  gender: string;
  str: number;
  dex: number;
  con: number;
  siz: number;
  app: number;
  int: number;
  pow: number;
  edu: number;
  luck: number;
  hp: number;
  mp: number;
  san: number;
  mov: number;
  build: number;
  portraitUrl?: string;
  skills: Record<string, number>;
  weapons: any[];
  armor: any;
  appearance?: string;
  beliefs?: string;
  significantPeople?: string;
  meaningfulLocations?: string;
  treasuredPossessions?: string;
  traits?: string;
  woundsAndScars?: string;
  phobiasAndMania?: string;
  background?: string;
  backgroundEntries?: { type: string; content: string }[];
  keyConnection?: string;
}

interface PortraitQuota {
  maxCount: number;
  generatedCount: number;
  remainingCount: number;
  inCooldown: boolean;
  nextAvailableAt: string | null;
}

export function CharacterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attributes');

  // 形象生成
  const [showPortraitModal, setShowPortraitModal] = useState(false);
  const [portraitLoading, setPortraitLoading] = useState(false);
  const [portraitPreviewUrl, setPortraitPreviewUrl] = useState<string | null>(null);
  const [portraitCustomDesc, setPortraitCustomDesc] = useState('');
  const [portraitQuota, setPortraitQuota] = useState<PortraitQuota | null>(null);

  const isOwner = character?.userId === user?.id;
  const isAdmin = user?.isAdmin === true;
  const canManagePortrait = isOwner || isAdmin;

  useEffect(() => {
    fetchCharacter();
  }, [id]);

  useEffect(() => {
    if (character && canManagePortrait) {
      fetchPortraitQuota();
    }
  }, [character, canManagePortrait]);

  const fetchCharacter = async () => {
    try {
      const response = await apiFetch(`/characters/${id}`);
      const data = await response.json();
      if (data.success) {
        const char = data.data.character;

        let parsedSkills: Record<string, number> = {};
        try {
          parsedSkills = typeof char.skills === 'string'
            ? JSON.parse(char.skills || '{}')
            : (char.skills || {});
          if (typeof parsedSkills !== 'object' || parsedSkills === null) {
            parsedSkills = {};
          }
        } catch {
          console.error('skills JSON 解析失败:', char.skills);
          parsedSkills = {};
        }

        let parsedWeapons: any[] = [];
        try {
          parsedWeapons = typeof char.weapons === 'string'
            ? JSON.parse(char.weapons || '[]')
            : (char.weapons || []);
          if (!Array.isArray(parsedWeapons)) parsedWeapons = [];
        } catch {
          console.error('weapons JSON 解析失败:', char.weapons);
          parsedWeapons = [];
        }

        let parsedArmor = null;
        try {
          parsedArmor = typeof char.armor === 'string'
            ? (char.armor ? JSON.parse(char.armor) : null)
            : char.armor;
          if (parsedArmor !== null && typeof parsedArmor !== 'object') parsedArmor = null;
        } catch {
          console.error('armor JSON 解析失败:', char.armor);
          parsedArmor = null;
        }

        let parsedBackgroundEntries: { type: string; content: string }[] = [];
        try {
          parsedBackgroundEntries = Array.isArray(char.backgroundEntries)
            ? char.backgroundEntries
            : (typeof char.backgroundEntries === 'string'
                ? JSON.parse(char.backgroundEntries || '[]')
                : []);
          if (!Array.isArray(parsedBackgroundEntries)) parsedBackgroundEntries = [];
        } catch {
          console.error('backgroundEntries JSON 解析失败:', char.backgroundEntries);
          parsedBackgroundEntries = [];
        }

        setCharacter({
          ...char,
          skills: parsedSkills,
          weapons: parsedWeapons,
          armor: parsedArmor,
          backgroundEntries: parsedBackgroundEntries,
          keyConnection: char.keyConnection,
        });
      }
    } catch (error) {
      console.error('获取角色卡失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPortraitQuota = async () => {
    try {
      const res = await apiFetch(`/characters/${id}/portrait/quota`);
      const data = await res.json();
      if (data.success) setPortraitQuota(data.data);
    } catch (err) {
      console.error('获取形象配额失败:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个调查员吗？此操作不可撤销。')) return;
    try {
      const response = await fetch(`/api/characters/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) navigate('/characters');
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleExport = () => {
    if (!character) return;
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      character: {
        ...character,
        skills: character.skills,
        weapons: character.weapons,
        armor: character.armor,
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name}_调查员卡.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePortraitGenerate = async () => {
    if (!character) return;
    try {
      setPortraitLoading(true);
      const res = await apiFetch(`/characters/${character.id}/portrait/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDesc: portraitCustomDesc.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || '生成失败');
      }
      setPortraitPreviewUrl(data.data.previewUrl);
      setPortraitQuota((prev) =>
        prev
          ? { ...prev, remainingCount: data.data.remainingCount, generatedCount: prev.generatedCount + 1 }
          : prev
      );
    } catch (err: any) {
      alert('形象生成失败：' + err.message);
    } finally {
      setPortraitLoading(false);
    }
  };

  const handlePortraitConfirm = async () => {
    if (!character || !portraitPreviewUrl) return;
    try {
      const res = await apiFetch(`/characters/${character.id}/portrait/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: portraitPreviewUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || '保存失败');
      }
      setCharacter((prev) => (prev ? { ...prev, portraitUrl: portraitPreviewUrl } : prev));
      setShowPortraitModal(false);
      setPortraitPreviewUrl(null);
      setPortraitCustomDesc('');
    } catch (err: any) {
      alert('形象保存失败：' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#a63848] border-t-transparent" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="text-center py-16">
        <p className="text-[#8b8375]">调查员不存在</p>
        <Link to="/characters" className="text-[#a63848] hover:underline mt-2 inline-block">
          返回名册
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'attributes', label: '属性', icon: Zap },
    { id: 'skills', label: '技能', icon: Shield },
    { id: 'combat', label: '战斗', icon: Shield },
    { id: 'background', label: '背景', icon: Sparkles },
  ];

  const cooldownText = portraitQuota?.inCooldown && portraitQuota.nextAvailableAt
    ? new Date(portraitQuota.nextAvailableAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const statItems = [
    { key: 'hp', maxKey: 'maxHp', label: 'HP', icon: Heart, color: 'text-coc-accent-red' },
    { key: 'mp', maxKey: 'maxMp', label: 'MP', icon: Sparkles, color: 'text-coc-accent-cyan' },
    { key: 'san', maxKey: 'maxSan', label: 'SAN', icon: Brain, color: 'text-coc-accent-gold' },
    { key: 'mov', label: 'MOV', icon: Zap, color: 'text-coc-text-secondary' },
    { key: 'build', label: '体格', icon: Shield, color: 'text-coc-text-secondary' },
  ];

  return (
    <PageShell
      title="调查员档案"
      eyebrow="investigator dossier"
      description="查看属性、技能、战斗配置和背景档案。保留原有角色数据解析、导出、删除和形象生成流程。"
    >
      {/* ===== 焦点图顶部：角色卡 Hero ===== */}
      <Surface variant="page" tone="gold" padding="md">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* 左侧：形象立绘 */}
          <div className="w-full md:w-40 lg:w-44 flex-shrink-0">
            <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-coc-void bg-[#0a0a0f]">
              {character.portraitUrl ? (
                <img
                  src={character.portraitUrl}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#6b6558]">
                  <svg className="w-14 h-14 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs tracking-widest">暂无形象</span>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：信息与属性 */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
                  <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Link to="/characters" className="rounded border border-[#3a3a3a] transition-colors p-1 rounded-md">
                      <ArrowLeft size={16} />
                    </Link>
                    <h1 className="text-xl md:text-2xl font-ritual font-bold text-[#e8d4a0]">{character.name}</h1>
                  </div>
                  <p className="text-sm text-[#8b8375]">
                    {character.occupation} · {character.age}岁 · {character.gender}
                  </p>
                  <div className="mt-1.5 font-mono text-xs text-[#c9a227]">#{String(character.displayId).padStart(8, '0')}</div>
                </div>
              </div>

              {character.appearance && (
                <p className="mt-3 text-sm text-coc-parchment-dim line-clamp-3">{character.appearance}</p>
              )}
            </div>

            {/* 中部：派生属性 */}
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {statItems.map((s) => {
                  const Icon = s.icon;
                  const val = (character as any)[s.key];
                  const maxVal = s.maxKey ? (character as any)[s.maxKey] : null;
                  return (
                    <div key={s.key} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#0a0a0f] border border-coc-void transition-colors hover:border-coc-rift">
                      <Icon size={14} className={cn(s.color)} />
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-[#e8d4a0]">{val}</span>
                        <span className="text-[10px] text-[#6b6558]">{s.label}{maxVal ? `/${maxVal}` : ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 下部：操作按钮 */}
            <div className="mt-4 flex flex-wrap gap-2">
              {canManagePortrait && (
                <button
                  onClick={() => { setShowPortraitModal(true); setPortraitPreviewUrl(null); setPortraitCustomDesc(''); }}
                  className="coc-btn-gold flex items-center gap-1.5 px-3 py-1.5 text-xs"
                >
                  <Wand2 size={14} />
                  塑造形象
                </button>
              )}
              <button
                onClick={handleExport}
                className="coc-btn-void flex items-center gap-1.5 px-3 py-1.5 text-xs"
              >
                <Download size={14} />
                导出
              </button>
              <button
                onClick={handleDelete}
                className="coc-btn-void text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 text-xs"
              >
                <Trash2 size={14} />
                删除
              </button>
            </div>
          </div>
        </div>
      </Surface>

      {/* ===== 标签页 ===== */}
      <Surface variant="panel" padding="none" className="overflow-x-auto">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-3 flex items-center gap-2 border-b-2 transition-colors text-sm md:text-base',
                  activeTab === tab.id
                    ? 'border-[#a63848] text-coc-accent-red'
                    : 'border-transparent text-[#8b8375] hover:text-[#d4c5a8]'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Surface>

      {/* ===== 内容区域 ===== */}
      <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
        {activeTab === 'attributes' && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { key: 'str', label: '力量 STR' },
              { key: 'dex', label: '敏捷 DEX' },
              { key: 'con', label: '体质 CON' },
              { key: 'siz', label: '体型 SIZ' },
              { key: 'app', label: '外貌 APP' },
              { key: 'int', label: '智力 INT' },
              { key: 'pow', label: '意志 POW' },
              { key: 'edu', label: '教育 EDU' },
              { key: 'luck', label: '幸运 LUCK' },
            ].map((attr) => (
              <div key={attr.key} className="text-center p-4 bg-black/20 rounded">
                <div className="text-xs text-[#6b6558] mb-1">{attr.label}</div>
                <div className="text-2xl font-bold">{(character as any)[attr.key]}</div>
                <div className="text-xs text-[#6b6558] mt-1">
                  ½:{Math.floor((character as any)[attr.key] / 2)} ⅕:{Math.floor((character as any)[attr.key] / 5)}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-6">
            {(() => {
              const groups = COC7E_SKILLS.reduce((acc, skill) => {
                acc[skill.category] = acc[skill.category] || [];
                acc[skill.category].push(skill);
                return acc;
              }, {} as Record<string, typeof COC7E_SKILLS>);
              return Object.entries(groups).map(([category, skills]) => (
                <div key={category}>
                  <h3 className="font-bold mb-3 text-[#c9a227] capitalize">{SKILL_CATEGORIES[category] || category}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {skills.map((skill) => {
                      const value = character.skills[skill.key] ?? skill.baseValue;
                      return (
                        <div key={skill.key} className="flex justify-between items-center p-2 bg-black/20 rounded">
                          <span className="text-sm">{skill.name}</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[#4db8b8]">{value}%</span>
                            <span className="text-[#6b6558]">½{Math.floor(value/2)}</span>
                            <span className="text-[#6b6558]">⅕{Math.floor(value/5)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
            {Object.entries(character.skills || {}).filter(([name]) =>
              !COC7E_SKILLS.some(s => s.key === name)
            ).length > 0 && (
              <div>
                <h3 className="font-bold mb-3 text-[#c9a227]">自定义技能</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(character.skills || {}).filter(([name]) =>
                    !COC7E_SKILLS.some(s => s.key === name)
                  ).map(([name, value]) => (
                    <div key={name} className="flex justify-between items-center p-2 bg-black/20 rounded">
                      <span className="text-sm">{name}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[#4db8b8]">{value}%</span>
                        <span className="text-[#6b6558]">½{Math.floor((value as number)/2)}</span>
                        <span className="text-[#6b6558]">⅕{Math.floor((value as number)/5)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'combat' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold mb-3">武器</h3>
              {character.weapons.length > 0 ? (
                <div className="space-y-2">
                  {character.weapons.map((weapon: any, idx: number) => (
                    <div key={idx} className="p-3 bg-black/20 rounded">
                      <div className="font-medium">{weapon.name}</div>
                      <div className="text-sm text-[#8b8375]">
                        伤害: {weapon.damage} | 射程: {weapon.range} | 贯穿: {weapon.impale ? '是' : '否'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={EmptyIcons.Combat}
                  title="暂无武器"
                  description="调查员尚未装备任何武器。"
                  size="sm"
                  animate={false}
                />
              )}
            </div>

            <div>
              <h3 className="font-bold mb-3">护甲</h3>
              {character.armor ? (
                <div className="p-3 bg-black/20 rounded">
                  <div className="font-medium">{character.armor.name}</div>
                  <div className="text-sm text-[#8b8375]">
                    护甲值: {character.armor.rating} | 覆盖: {character.armor.coverage}
                  </div>
                </div>
              ) : (
                <p className="text-[#6b6558]">无护甲</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'background' && (
          <div className="space-y-4">
            {character.background ? (
              <div>
                <h4 className="text-sm font-bold text-[#8b8375] mb-2">背景故事</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {character.background}
                </p>
              </div>
            ) : null}

            {character.backgroundEntries && character.backgroundEntries.length > 0 ? (
              <>
                {character.backgroundEntries.map((entry) => (
                  <div key={entry.type}>
                    <h4 className="text-sm font-bold text-[#8b8375] mb-1">{entry.type}</h4>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                  </div>
                ))}
                {character.keyConnection ? (
                  <div className="pt-2 border-t border-coc-void">
                    <h4 className="text-sm font-bold text-[#c9a227] mb-1">关键背景连接</h4>
                    <p className="text-sm">{character.keyConnection}</p>
                  </div>
                ) : null}
              </>
            ) : (
              !character.background && <p className="text-[#6b6558]">未填写背景信息</p>
            )}
          </div>
        )}
      </DoubleBezelCard>

      {/* ===== 形象铸造弹窗 ===== */}
      {showPortraitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Surface variant="elevated" padding="lg" className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-ritual font-bold text-[#e8d4a0]">塑造调查员形象</h3>
              <button onClick={() => setShowPortraitModal(false)} className="text-[#6b6558] hover:text-[#e8d4a0]">
                <X size={20} />
              </button>
            </div>

            {portraitQuota && (
              <div className="text-sm text-[#8b8375] flex items-center justify-between">
                <span>剩余次数：<span className="text-[#c9a227]">{portraitQuota.remainingCount}</span> / {portraitQuota.maxCount}</span>
                {cooldownText && <span className="text-xs">下次可生成：{cooldownText}</span>}
              </div>
            )}

            {character.portraitUrl && !portraitPreviewUrl && (
              <div className="flex items-center gap-3">
                <img src={character.portraitUrl} alt="当前形象" className="w-16 h-16 rounded object-cover border border-coc-void" />
                <span className="text-sm text-[#6b6558]">当前形象</span>
              </div>
            )}

            {portraitPreviewUrl ? (
              <div className="space-y-3">
                <img src={portraitPreviewUrl} alt="预览" className="w-full rounded border border-coc-void" />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePortraitConfirm}
                    className="flex-1 px-4 py-2 bg-coc-accent-gold text-coc-abyss rounded font-medium hover:opacity-90"
                  >
                    采用此形象
                  </button>
                  <button
                    onClick={() => setPortraitPreviewUrl(null)}
                    className="flex-1 px-4 py-2 bg-black/20 border border-coc-void rounded hover:bg-coc-void"
                  >
                    重新生成
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-sm text-[#6b6558] space-y-1">
                  <p>系统将基于角色信息自动生成英文提示词。您可以在下方补充自定义描述（如服装、神态、背景等）。</p>
                </div>
                <textarea
                  value={portraitCustomDesc}
                  onChange={(e) => setPortraitCustomDesc(e.target.value)}
                  placeholder="例如：戴着单片眼镜，左手有伤疤，背景是雨夜码头"
                  className="w-full px-3 py-2 bg-[#0a0a0f] border border-coc-void rounded text-[#e8d4a0] focus:border-coc-gold focus:outline-none min-h-[80px]"
                  maxLength={200}
                />
                <button
                  onClick={handlePortraitGenerate}
                  disabled={portraitLoading || (portraitQuota !== null && portraitQuota.remainingCount <= 0) || !!cooldownText}
                  className="w-full px-4 py-2 bg-coc-accent-gold text-coc-abyss rounded font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {portraitLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-coc-abyss border-t-transparent rounded-full animate-spin" />
                      铸造中...
                    </>
                  ) : (
                    <>
                      <Wand2 size={18} />
                      开始铸造
                    </>
                  )}
                </button>
              </>
            )}
          </Surface>
        </div>
      )}
    </PageShell>
  );
}
