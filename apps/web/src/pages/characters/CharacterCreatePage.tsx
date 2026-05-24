import { DoubleBezelCard } from '@components/ui/DoubleBezelCard';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dice5, Sword, Shield } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { OCCUPATIONS, calculateDerivedAttributes } from '@lib/coc-data';
import { COC7_WEAPONS, COC7_ARMOR } from '@lib/combat-data';
import { Modal } from '@components/ui/Modal';

interface AttributeState {
  str: number;
  dex: number;
  con: number;
  siz: number;
  app: number;
  int: number;
  pow: number;
  edu: number;
  luck: number;
}

export function CharacterCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    occupation: '',
    age: 25,
    gender: '',
    background: '',
  });
  
  const [occupationMode, setOccupationMode] = useState<'preset' | 'custom'>('preset');
  const [customOccupation, setCustomOccupation] = useState('');
  
  const [attributes, setAttributes] = useState<AttributeState>({
    str: 50,
    dex: 50,
    con: 50,
    siz: 50,
    app: 50,
    int: 50,
    pow: 50,
    edu: 50,
    luck: 50,
  });

  const [selectedWeapons, setSelectedWeapons] = useState<typeof COC7_WEAPONS>([]);
  const [selectedArmor, setSelectedArmor] = useState<typeof COC7_ARMOR[0] | null>(null);
  const [showWeaponModal, setShowWeaponModal] = useState(false);
  const [showArmorModal, setShowArmorModal] = useState(false);
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<string>('all');

  const derived = calculateDerivedAttributes(attributes);

  const handleAttributeChange = (key: keyof AttributeState, value: number) => {
    setAttributes(prev => ({ ...prev, [key]: Math.max(15, Math.min(90, value)) }));
  };

  const rollAttribute = (key: keyof AttributeState) => {
    // 3D6 * 5 或 2D6+6 * 5
    let roll;
    if (['int', 'pow', 'edu', 'luck'].includes(key)) {
      // (2D6+6) * 5 = 40-100
      roll = (Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 + 6) * 5;
    } else {
      // (3D6) * 5 = 15-90
      roll = (Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1) * 5;
    }
    handleAttributeChange(key, roll);
  };

  const rollAllAttributes = () => {
    const keys: (keyof AttributeState)[] = ['str', 'dex', 'con', 'siz', 'app', 'int', 'pow', 'edu', 'luck'];
    keys.forEach(key => rollAttribute(key));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/characters', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          occupation: occupationMode === 'custom' ? customOccupation : formData.occupation,
          ...attributes,
          skills: {},
          weapons: selectedWeapons.map(w => ({ id: w.id, name: w.name, damage: w.damage, range: w.range, skill: w.skill })),
          armor: selectedArmor ? { id: selectedArmor.id, name: selectedArmor.name, rating: selectedArmor.rating } : null,
        }),
      });

      const data = await handleApiResponse<{ character: { id: string }; unlockedTitle?: { id: string } }>(response);
      if (data.unlockedTitle?.id) {
        alert('获得新印记：初次迈步！');
      }
      navigate(`/characters/${data.character.id}`);
    } catch (err: any) {
      setError(err.message || '网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const attributeLabels: Record<string, string> = {
    str: '力量 STR',
    dex: '敏捷 DEX',
    con: '体质 CON',
    siz: '体型 SIZ',
    app: '外貌 APP',
    int: '智力 INT',
    pow: '意志 POW',
    edu: '教育 EDU',
    luck: '幸运 LUCK',
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/characters')}
          className="rounded border border-[#3a3a3a] transition-colors p-2"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-serif font-bold">记录命运</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>📋</span> 基本信息
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#8b8375] mb-1">姓名 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full coc-input"
                placeholder="调查员姓名"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[#8b8375] mb-1">职业 *</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOccupationMode('preset')}
                    className={`px-3 py-1.5 text-sm rounded border ${occupationMode === 'preset' ? 'bg-[#a63848]/20 border-[#a63848] text-coc-accent-red' : 'border-[#3a3a3a]/40 text-coc-text-secondary'}`}
                  >
                    选择职业
                  </button>
                  <button
                    type="button"
                    onClick={() => setOccupationMode('custom')}
                    className={`px-3 py-1.5 text-sm rounded border ${occupationMode === 'custom' ? 'bg-[#a63848]/20 border-[#a63848] text-coc-accent-red' : 'border-[#3a3a3a]/40 text-coc-text-secondary'}`}
                  >
                    自定义
                  </button>
                </div>
                {occupationMode === 'preset' ? (
                  <select
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full coc-input"
                    required
                  >
                    <option value="">选择职业</option>
                    {OCCUPATIONS.map((occ) => (
                      <option key={occ.name} value={occ.name}>{occ.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customOccupation}
                    onChange={(e) => setCustomOccupation(e.target.value)}
                    className="w-full coc-input"
                    placeholder="输入自定义职业"
                    required
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#8b8375] mb-1">年龄</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 25 })}
                className="w-full coc-input"
                min={15}
                max={90}
              />
            </div>

            <div>
              <label className="block text-sm text-[#8b8375] mb-1">性别</label>
              <input
                type="text"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full coc-input"
                placeholder="男/女/其他"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-[#8b8375] mb-1">背景故事</label>
              <textarea
                value={formData.background}
                onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                className="w-full coc-input min-h-[120px] resize-y"
                placeholder="描述这位调查员的出身、经历、以及为何踏入神秘世界..."
                rows={4}
              />
            </div>
          </div>
        </DoubleBezelCard>

        {/* 属性 */}
        <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>🎲</span> 属性
            </h2>
            <button
              type="button"
              onClick={rollAllAttributes}
              className="rounded border border-[#3a3a3a] transition-colors text-sm flex items-center gap-1"
            >
              <Dice5 size={14} />
              随机生成全部
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(attributeLabels).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label className="block text-xs text-[#8b8375]">{label}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={attributes[key as keyof AttributeState]}
                    onChange={(e) => handleAttributeChange(key as keyof AttributeState, parseInt(e.target.value) || 0)}
                    className="flex-1 coc-input text-center"
                    min={15}
                    max={90}
                  />
                  <button
                    type="button"
                    onClick={() => rollAttribute(key as keyof AttributeState)}
                    className="rounded border border-[#3a3a3a] transition-colors px-2"
                    title="随机生成"
                  >
                    <Dice5 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 派生属性 */}
          <div className="mt-6 pt-4 border-t border-[#3a3a3a]/40">
            <h3 className="text-sm font-bold mb-3 text-[#8b8375]">派生属性</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-black/20 rounded">
                <div className="text-2xl font-bold text-[#a63848]">{derived.hp}</div>
                <div className="text-xs text-[#6b6558]">HP</div>
              </div>
              <div className="text-center p-3 bg-black/20 rounded">
                <div className="text-2xl font-bold text-[#4db8b8]">{derived.mp}</div>
                <div className="text-xs text-[#6b6558]">MP</div>
              </div>
              <div className="text-center p-3 bg-black/20 rounded">
                <div className="text-2xl font-bold text-[#c9a227]">{derived.san}</div>
                <div className="text-xs text-[#6b6558]">SAN</div>
              </div>
              <div className="text-center p-3 bg-black/20 rounded">
                <div className="text-2xl font-bold">{derived.mov}</div>
                <div className="text-xs text-[#6b6558]">MOV</div>
              </div>
            </div>
          </div>
          {/* 武器配置 */}
          <div className="mt-6 pt-4 border-t border-[#3a3a3a]/40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#8b8375] flex items-center gap-2">
                <Sword size={16} /> 武器
              </h3>
              <button
                type="button"
                onClick={() => setShowWeaponModal(true)}
                className="text-xs text-[#a63848] hover:underline"
              >
                + 添加武器
              </button>
            </div>
            {selectedWeapons.length > 0 ? (
              <div className="space-y-2">
                {selectedWeapons.map((weapon, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-black/20 rounded text-sm">
                    <div>
                      <span className="font-medium">{weapon.name}</span>
                      <span className="text-[#6b6558] ml-2">{weapon.damage} | {weapon.skill}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedWeapons(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#6b6558]">未选择武器（默认徒手）</p>
            )}
          </div>

          {/* 护甲配置 */}
          <div className="mt-4 pt-4 border-t border-[#3a3a3a]/40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#8b8375] flex items-center gap-2">
                <Shield size={16} /> 护甲
              </h3>
              <button
                type="button"
                onClick={() => setShowArmorModal(true)}
                className="text-xs text-[#a63848] hover:underline"
              >
                {selectedArmor ? '更换' : '+ 添加'}
              </button>
            </div>
            {selectedArmor ? (
              <div className="flex items-center justify-between p-2 bg-black/20 rounded text-sm">
                <div>
                  <span className="font-medium">{selectedArmor.name}</span>
                  <span className="text-[#6b6558] ml-2">护甲值: {selectedArmor.rating}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedArmor(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#6b6558]">未装备护甲</p>
            )}
          </div>
        </DoubleBezelCard>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/characters')}
            className="rounded border border-[#3a3a3a] transition-colors flex-1"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading || !formData.name || !formData.occupation}
            className="coc-btn-primary flex-1"
          >
            {loading ? '创建中...' : '创建调查员'}
          </button>
        </div>
      </form>

      {/* 武器选择弹窗 */}
      <Modal isOpen={showWeaponModal} onClose={() => setShowWeaponModal(false)} title="选择武器">
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setWeaponTypeFilter('all')}
              className={`px-3 py-1 rounded text-sm ${weaponTypeFilter === 'all' ? 'bg-[#a63848]' : 'bg-black/20'}`}
            >
              全部
            </button>
            {['melee', 'pistol', 'rifle', 'shotgun', 'smg', 'special'].map(type => (
              <button
                key={type}
                onClick={() => setWeaponTypeFilter(type)}
                className={`px-3 py-1 rounded text-sm ${weaponTypeFilter === type ? 'bg-[#a63848]' : 'bg-black/20'}`}
              >
                {type === 'melee' && '近战'}
                {type === 'pistol' && '手枪'}
                {type === 'rifle' && '步枪'}
                {type === 'shotgun' && '霰弹'}
                {type === 'smg' && '冲锋枪'}
                {type === 'special' && '特殊'}
              </button>
            ))}
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {COC7_WEAPONS
              .filter(w => weaponTypeFilter === 'all' || w.type === weaponTypeFilter)
              .map(weapon => (
                <button
                  key={weapon.id}
                  onClick={() => {
                    if (selectedWeapons.length < 4) {
                      setSelectedWeapons(prev => [...prev, weapon]);
                      setShowWeaponModal(false);
                    }
                  }}
                  disabled={selectedWeapons.some(w => w.id === weapon.id) || selectedWeapons.length >= 4}
                  className="w-full p-3 bg-black/20 rounded text-left hover:bg-[#a63848]/15 transition-colors disabled:opacity-50"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{weapon.name}</span>
                    <span className="text-[#c9a227]">{weapon.damage}</span>
                  </div>
                  <div className="text-xs text-[#8b8375]">
                    {weapon.skill} | {weapon.range} {weapon.impale && '| 贯穿'}
                  </div>
                </button>
              ))}
          </div>
        </div>
      </Modal>

      {/* 护甲选择弹窗 */}
      <Modal isOpen={showArmorModal} onClose={() => setShowArmorModal(false)} title="选择护甲">
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {COC7_ARMOR.map(armor => (
            <button
              key={armor.id}
              onClick={() => {
                setSelectedArmor(armor);
                setShowArmorModal(false);
              }}
              className="w-full p-3 bg-black/20 rounded text-left hover:bg-[#a63848]/15 transition-colors"
            >
              <div className="flex justify-between">
                <span className="font-medium">{armor.name}</span>
                <span className="text-[#c9a227]">护甲 {armor.rating}</span>
              </div>
              <div className="text-xs text-[#8b8375]">
                {armor.coverage}
                {armor.movPenalty !== 0 && ` | MOV ${armor.movPenalty > 0 ? '-' : '+'}${Math.abs(armor.movPenalty)}`}
                {armor.dexPenalty > 0 && ` | DEX -${armor.dexPenalty}`}
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}