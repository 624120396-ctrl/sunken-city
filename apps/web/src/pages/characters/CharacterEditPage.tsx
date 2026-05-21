import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Dice5, Sword, Shield, Save } from 'lucide-react';
import { cn } from '@lib/utils';
import { apiFetch, handleApiResponse } from '@lib/api';
import { calculateDerivedAttributes } from '@lib/coc-data';
import { COC7E_OCCUPATIONS } from '@lib/coc7-data';
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

interface CharacterData {
  id: string;
  name: string;
  occupation: string;
  occupationKey?: string;
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
  skills: Record<string, number>;
  weapons: any[];
  armor: any;
  hp: number;
  mp: number;
  san: number;
  mov: number;
  build: number;
  background?: string;
  backgroundEntries?: { type: string; content: string }[];
  keyConnection?: string;
}

const BACKGROUND_TYPES = [
  '形象描述',
  '思想与信念',
  '重要之人',
  '意义非凡之地',
  '宝贵之物',
  '特质',
];

export function CharacterEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminEdit = location.pathname.startsWith('/admin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [originalData, setOriginalData] = useState<CharacterData | null>(null);

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

  const [skills, setSkills] = useState<Record<string, number>>({});
  const [backgroundEntries, setBackgroundEntries] = useState<{ type: string; content: string }[]>([]);
  const [keyConnection, setKeyConnection] = useState('');

  const [selectedWeapons, setSelectedWeapons] = useState<any[]>([]);
  const [selectedArmor, setSelectedArmor] = useState<any | null>(null);
  const [showWeaponModal, setShowWeaponModal] = useState(false);
  const [showArmorModal, setShowArmorModal] = useState(false);
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchCharacter();
  }, [id]);

  const fetchCharacter = async () => {
    try {
      const endpoint = isAdminEdit ? `/admin/characters/${id}` : `/characters/${id}`;
      const response = await apiFetch(endpoint);
      const data = await handleApiResponse<{ character: CharacterData }>(response);
      const char = data.character;

      const parsedSkills = typeof char.skills === 'string' ? JSON.parse(char.skills || '{}') : (char.skills || {});
      const parsedWeapons = typeof char.weapons === 'string' ? JSON.parse(char.weapons || '[]') : (char.weapons || []);
      const parsedArmor = typeof char.armor === 'string' ? (char.armor ? JSON.parse(char.armor) : null) : char.armor;
      const parsedEntries = Array.isArray(char.backgroundEntries)
        ? char.backgroundEntries
        : (typeof char.backgroundEntries === 'string' ? JSON.parse(char.backgroundEntries || '[]') : []);

      // 补齐默认的 6 项背景条目
      const filledEntries = BACKGROUND_TYPES.map(type => {
        const found = parsedEntries.find((e: any) => e.type === type);
        return found || { type, content: '' };
      });

      setOriginalData({ ...char, skills: parsedSkills, weapons: parsedWeapons, armor: parsedArmor, backgroundEntries: filledEntries });

      const isPreset = COC7E_OCCUPATIONS.some(o => o.key === char.occupationKey);
      const isPresetByName = !isPreset && COC7E_OCCUPATIONS.some(o => o.name === char.occupation);
      setOccupationMode(isPreset || isPresetByName ? 'preset' : 'custom');
      setCustomOccupation(isPreset || isPresetByName ? '' : char.occupation);
      setFormData({
        name: char.name,
        occupation: isPreset ? (char.occupationKey || '') : (isPresetByName ? char.occupation : ''),
        age: char.age,
        gender: char.gender || '',
        background: char.background || '',
      });
      setAttributes({
        str: char.str,
        dex: char.dex,
        con: char.con,
        siz: char.siz,
        app: char.app,
        int: char.int,
        pow: char.pow,
        edu: char.edu,
        luck: char.luck,
      });
      setSkills(parsedSkills);
      setBackgroundEntries(filledEntries);
      setKeyConnection(char.keyConnection || '');
      setSelectedWeapons(parsedWeapons);
      setSelectedArmor(parsedArmor);
    } catch (err: any) {
      setError(err.message || '获取角色数据失败');
    } finally {
      setLoading(false);
    }
  };

  const derived = calculateDerivedAttributes(attributes);

  const handleAttributeChange = (key: keyof AttributeState, value: number) => {
    setAttributes(prev => ({ ...prev, [key]: Math.max(15, Math.min(90, value)) }));
  };

  const rollAttribute = (key: keyof AttributeState) => {
    let roll;
    if (['int', 'pow', 'edu', 'luck'].includes(key)) {
      roll = (Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 + 6) * 5;
    } else {
      roll = (Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1) * 5;
    }
    handleAttributeChange(key, roll);
  };

  const handleBackgroundEntryChange = (type: string, content: string) => {
    setBackgroundEntries(prev => prev.map(e => e.type === type ? { ...e, content } : e));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload: any = {
        name: formData.name,
        age: formData.age,
        gender: formData.gender,
        background: formData.background,
        backgroundEntries: backgroundEntries.filter(e => e.content.trim()),
        keyConnection: keyConnection || undefined,
        ...attributes,
        skills,
        weapons: selectedWeapons.map(w => ({
          id: w.id,
          name: w.name,
          damage: w.damage,
          range: w.range,
          skill: w.skill,
        })),
        armor: selectedArmor ? {
          id: selectedArmor.id,
          name: selectedArmor.name,
          rating: selectedArmor.rating,
        } : null,
      };

      if (occupationMode === 'custom') {
        payload.occupation = customOccupation;
        payload.occupationKey = undefined;
      } else {
        const occ = COC7E_OCCUPATIONS.find(o => o.key === formData.occupation);
        payload.occupation = occ?.name || formData.occupation;
        payload.occupationKey = formData.occupation || undefined;
      }

      await apiFetch(isAdminEdit ? `/admin/characters/${id}` : `/characters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      navigate(isAdminEdit ? '/admin/characters' : `/characters/${id}`);
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const addWeapon = (weapon: typeof COC7_WEAPONS[0]) => {
    if (selectedWeapons.length >= 4) {
      alert('最多只能携带4种武器');
      return;
    }
    if (!selectedWeapons.find(w => w.id === weapon.id)) {
      setSelectedWeapons([...selectedWeapons, weapon]);
    }
    setShowWeaponModal(false);
  };

  const removeWeapon = (weaponId: string) => {
    setSelectedWeapons(selectedWeapons.filter(w => w.id !== weaponId));
  };

  const addArmor = (armor: typeof COC7_ARMOR[0]) => {
    setSelectedArmor(armor);
    setShowArmorModal(false);
  };

  const removeArmor = () => {
    setSelectedArmor(null);
  };

  const weaponTypes = ['all', ...Array.from(new Set(COC7_WEAPONS.map(w => w.type)))];
  const filteredWeapons = weaponTypeFilter === 'all'
    ? COC7_WEAPONS
    : COC7_WEAPONS.filter(w => w.type === weaponTypeFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-coc-accent-red border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(isAdminEdit ? '/admin/characters' : `/characters/${id}`)}
            className="coc-btn-secondary p-2"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-serif font-bold">编辑调查员</h1>
            <p className="text-sm text-coc-text-secondary">{originalData?.name}</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="coc-btn-primary flex items-center gap-2"
        >
          <Save size={18} />
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="coc-card">
          <h2 className="text-lg font-bold mb-4">基本信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-coc-text-secondary mb-1">姓名</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full coc-input"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-coc-text-secondary mb-1">职业</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOccupationMode('preset')}
                    className={`px-3 py-1.5 text-sm rounded border ${occupationMode === 'preset' ? 'bg-coc-accent-red/20 border-coc-accent-red text-coc-accent-red' : 'border-coc-border text-coc-text-secondary'}`}
                  >
                    选择职业
                  </button>
                  <button
                    type="button"
                    onClick={() => setOccupationMode('custom')}
                    className={`px-3 py-1.5 text-sm rounded border ${occupationMode === 'custom' ? 'bg-coc-accent-red/20 border-coc-accent-red text-coc-accent-red' : 'border-coc-border text-coc-text-secondary'}`}
                  >
                    自定义
                  </button>
                </div>
                {occupationMode === 'preset' ? (
                  <select
                    value={formData.occupation}
                    onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                    className="w-full coc-input"
                    required
                  >
                    <option value="">选择职业</option>
                    {COC7E_OCCUPATIONS.map(occ => (
                      <option key={occ.key} value={occ.key}>{occ.name}</option>
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
              <label className="block text-sm text-coc-text-secondary mb-1">年龄</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 25 }))}
                className="w-full coc-input"
                min={15}
                max={90}
              />
            </div>
            <div>
              <label className="block text-sm text-coc-text-secondary mb-1">性别</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full coc-input"
              >
                <option value="">未选择</option>
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="其他">其他</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-coc-text-secondary mb-1">背景故事</label>
              <textarea
                value={formData.background}
                onChange={(e) => setFormData(prev => ({ ...prev, background: e.target.value }))}
                className="w-full coc-input min-h-[120px] resize-y"
                placeholder="描述这位调查员的出身、经历、以及为何踏入神秘世界..."
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* 背景条目 */}
        <div className="coc-card">
          <h2 className="text-lg font-bold mb-4">背景条目</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {backgroundEntries.map((entry) => (
              <div key={entry.type}>
                <label className="block text-sm text-coc-text-secondary mb-1">{entry.type}</label>
                <input
                  type="text"
                  value={entry.content}
                  onChange={(e) => handleBackgroundEntryChange(entry.type, e.target.value)}
                  className="w-full coc-input"
                  placeholder={`输入${entry.type}`}
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm text-coc-text-secondary mb-1">关键背景连接</label>
              <select
                value={keyConnection}
                onChange={(e) => setKeyConnection(e.target.value)}
                className="w-full coc-input"
              >
                <option value="">未选择</option>
                {BACKGROUND_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 属性 */}
        <div className="coc-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">属性</h2>
            <div className="text-sm text-coc-text-secondary">
              HP: {derived.hp} | MP: {derived.mp} | SAN: {derived.san} | MOV: {derived.mov} | Build: {derived.build}
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
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
              <div key={attr.key} className="bg-coc-bg-tertiary p-3 rounded">
                <label className="block text-xs text-coc-text-secondary mb-1">{attr.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={attributes[attr.key as keyof AttributeState]}
                    onChange={(e) => handleAttributeChange(attr.key as keyof AttributeState, parseInt(e.target.value) || 0)}
                    className="w-full coc-input py-1 text-center"
                    min={15}
                    max={90}
                  />
                  <button
                    type="button"
                    onClick={() => rollAttribute(attr.key as keyof AttributeState)}
                    className="p-1 text-coc-accent-gold hover:text-coc-accent-red transition-colors"
                    title="随机掷骰"
                  >
                    <Dice5 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 武器 */}
        <div className="coc-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sword size={20} />
              武器
            </h2>
            <span className="text-sm text-coc-text-secondary">{selectedWeapons.length}/4</span>
          </div>
          <div className="space-y-2">
            {selectedWeapons.map((weapon) => (
              <div key={weapon.id} className="flex items-center justify-between p-3 bg-coc-bg-tertiary rounded">
                <div>
                  <div className="font-medium">{weapon.name}</div>
                  <div className="text-sm text-coc-text-secondary">
                    {weapon.damage} | {weapon.skill} | {weapon.range}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeWeapon(weapon.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  移除
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setShowWeaponModal(true)}
              disabled={selectedWeapons.length >= 4}
              className="w-full py-2 border-2 border-dashed border-coc-border rounded-lg text-coc-text-secondary hover:border-coc-accent-red hover:text-coc-accent-red transition-colors"
            >
              + 添加武器
            </button>
          </div>
        </div>

        {/* 护甲 */}
        <div className="coc-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Shield size={20} />
              护甲
            </h2>
          </div>
          {selectedArmor ? (
            <div className="flex items-center justify-between p-3 bg-coc-bg-tertiary rounded">
              <div>
                <div className="font-medium">{selectedArmor.name}</div>
                <div className="text-sm text-coc-text-secondary">
                  护甲值: {selectedArmor.rating} | {selectedArmor.coverage}
                </div>
              </div>
              <button
                type="button"
                onClick={removeArmor}
                className="text-red-400 hover:text-red-300"
              >
                移除
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowArmorModal(true)}
              className="w-full py-2 border-2 border-dashed border-coc-border rounded-lg text-coc-text-secondary hover:border-coc-accent-red hover:text-coc-accent-red transition-colors"
            >
              + 选择护甲
            </button>
          )}
        </div>
      </form>

      {/* 武器选择弹窗 */}
      <Modal
        isOpen={showWeaponModal}
        onClose={() => setShowWeaponModal(false)}
        title="选择武器"
      >
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {weaponTypes.map((type) => (
              <button
                key={type}
                onClick={() => setWeaponTypeFilter(type)}
                className={cn(
                  'px-3 py-1 text-sm rounded capitalize',
                  weaponTypeFilter === type
                    ? 'bg-coc-accent-red text-white'
                    : 'bg-coc-bg-tertiary text-coc-text-secondary'
                )}
              >
                {type === 'all' ? '全部' : type}
              </button>
            ))}
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {filteredWeapons.map((weapon) => (
              <button
                key={weapon.id}
                onClick={() => addWeapon(weapon)}
                disabled={selectedWeapons.find(w => w.id === weapon.id) !== undefined}
                className="w-full p-3 bg-coc-bg-tertiary rounded text-left hover:bg-coc-accent-red/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-medium">{weapon.name}</div>
                <div className="text-sm text-coc-text-secondary">
                  {weapon.damage} | {weapon.skill} | {weapon.range}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* 护甲选择弹窗 */}
      <Modal
        isOpen={showArmorModal}
        onClose={() => setShowArmorModal(false)}
        title="选择护甲"
      >
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {COC7_ARMOR.map((armor) => (
            <button
              key={armor.id}
              onClick={() => addArmor(armor)}
              className="w-full p-3 bg-coc-bg-tertiary rounded text-left hover:bg-coc-accent-red/20"
            >
              <div className="font-medium">{armor.name}</div>
              <div className="text-sm text-coc-text-secondary">
                护甲值: {armor.rating} | {armor.coverage}
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
