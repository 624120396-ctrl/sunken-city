import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Heart, Brain, Sparkles, Zap, Shield, Save, X, Plus, Download, Upload } from 'lucide-react';
import { COC7_SKILLS } from '@lib/coc-data';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Modal } from '@components/ui/Modal';
import { cn } from '@lib/utils';

interface Character {
  id: string;
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
}

export function CharacterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attributes');

  useEffect(() => {
    fetchCharacter();
  }, [id]);

  const fetchCharacter = async () => {
    try {
      const response = await apiFetch(`/characters/${id}`);
      const data = await response.json();
      if (data.success) {
        const char = data.data.character;
        setCharacter({
          ...char,
          // 处理可能是字符串或对象的 skills
          skills: typeof char.skills === 'string' ? JSON.parse(char.skills || '{}') : (char.skills || {}),
          // 处理可能是字符串或数组的 weapons  
          weapons: typeof char.weapons === 'string' ? JSON.parse(char.weapons || '[]') : (char.weapons || []),
          // 处理 armor
          armor: typeof char.armor === 'string' ? (char.armor ? JSON.parse(char.armor) : null) : char.armor,
        });
      }
    } catch (error) {
      console.error('获取角色卡失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个调查员吗？此操作不可撤销。')) return;
    
    try {
      const response = await fetch(`/api/characters/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        navigate('/characters');
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const [editingSkill, setEditingSkill] = useState<string | null>(null);
  const [editSkillValue, setEditSkillValue] = useState<number>(0);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillValue, setNewSkillValue] = useState(0);

  const handleEditSkill = (skillName: string, currentValue: number) => {
    setEditingSkill(skillName);
    setEditSkillValue(currentValue);
  };

  const handleSaveSkill = async () => {
    if (!editingSkill || !character) return;

    const updatedSkills = {
      ...character.skills,
      [editingSkill]: editSkillValue,
    };

    try {
      const response = await apiFetch(`/characters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ skills: updatedSkills }),
      });
      await handleApiResponse(response);
      setCharacter({ ...character, skills: updatedSkills });
      setEditingSkill(null);
    } catch (error) {
      console.error('保存技能失败:', error);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkillName || !character) return;

    const updatedSkills = {
      ...character.skills,
      [newSkillName]: newSkillValue,
    };

    try {
      const response = await apiFetch(`/characters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ skills: updatedSkills }),
      });
      await handleApiResponse(response);
      setCharacter({ ...character, skills: updatedSkills });
      setShowAddSkillModal(false);
      setNewSkillName('');
      setNewSkillValue(0);
    } catch (error) {
      console.error('添加技能失败:', error);
    }
  };

  const handleDeleteSkill = async (skillName: string) => {
    if (!confirm(`确定要删除技能 "${skillName}" 吗？`)) return;
    if (!character) return;

    const updatedSkills = { ...character.skills };
    delete updatedSkills[skillName];

    try {
      const response = await apiFetch(`/characters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ skills: updatedSkills }),
      });
      await handleApiResponse(response);
      setCharacter({ ...character, skills: updatedSkills });
    } catch (error) {
      console.error('删除技能失败:', error);
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

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.character) {
          const imported = data.character;
          // 更新角色数据
          const updateData = {
            skills: imported.skills,
            weapons: imported.weapons,
            armor: imported.armor,
          };
          const response = await apiFetch(`/characters/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updateData),
          });
          await handleApiResponse(response);
          // 刷新角色数据
          fetchCharacter();
          alert('导入成功');
        }
      } catch (error) {
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-coc-accent-red border-t-transparent" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="text-center py-16">
        <p className="text-coc-text-secondary">调查员不存在</p>
        <Link to="/characters" className="text-coc-accent-red hover:underline mt-2 inline-block">
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

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/characters" className="coc-btn-secondary p-2">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold">{character.name}</h1>
            <p className="text-coc-text-secondary">{character.occupation} | {character.age}岁 {character.gender}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="coc-btn-secondary flex items-center gap-1"
          >
            <Download size={16} />
            导出
          </button>
          <label className="coc-btn-secondary flex items-center gap-1 cursor-pointer"
          >
            <Upload size={16} />
            导入
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <Link 
            to={`/characters/${id}/edit`}
            className="coc-btn-secondary flex items-center gap-1"
          >
            <Edit2 size={16} />
            编辑
          </Link>
          <button 
            onClick={handleDelete}
            className="coc-btn-secondary text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <Trash2 size={16} />
            删除
          </button>
        </div>
      </div>

      {/* 派生属性卡片 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="coc-card text-center">
          <Heart size={20} className="mx-auto mb-2 text-coc-accent-red" />
          <div className="text-2xl font-bold">{character.hp}</div>
          <div className="text-xs text-coc-text-muted">HP</div>
        </div>
        <div className="coc-card text-center">
          <Sparkles size={20} className="mx-auto mb-2 text-coc-accent-cyan" />
          <div className="text-2xl font-bold">{character.mp}</div>
          <div className="text-xs text-coc-text-muted">MP</div>
        </div>
        <div className="coc-card text-center">
          <Brain size={20} className="mx-auto mb-2 text-coc-accent-gold" />
          <div className="text-2xl font-bold">{character.san}</div>
          <div className="text-xs text-coc-text-muted">SAN</div>
        </div>
        <div className="coc-card text-center">
          <Zap size={20} className="mx-auto mb-2 text-coc-text-secondary" />
          <div className="text-2xl font-bold">{character.mov}</div>
          <div className="text-xs text-coc-text-muted">MOV</div>
        </div>
        <div className="coc-card text-center">
          <Shield size={20} className="mx-auto mb-2 text-coc-text-secondary" />
          <div className="text-2xl font-bold">{character.build}</div>
          <div className="text-xs text-coc-text-muted">体格</div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b border-coc-border mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-3 flex items-center gap-2 border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-coc-accent-red text-coc-accent-red'
                    : 'border-transparent text-coc-text-secondary hover:text-coc-text-primary'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="coc-card">
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
              <div key={attr.key} className="text-center p-4 bg-coc-bg-tertiary rounded">
                <div className="text-xs text-coc-text-muted mb-1">{attr.label}</div>
                <div className="text-2xl font-bold">{(character as any)[attr.key]}</div>
                <div className="text-xs text-coc-text-muted mt-1">
                  ½:{Math.floor((character as any)[attr.key] / 2)} ⅕:{Math.floor((character as any)[attr.key] / 5)}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddSkillModal(true)}
                className="coc-btn-secondary text-sm flex items-center gap-1"
              >
                <Plus size={14} />
                添加技能
              </button>
            </div>
            {Object.entries(COC7_SKILLS).map(([category, skills]) => (
              <div key={category}>
                <h3 className="font-bold mb-3 text-coc-accent-gold capitalize">{category}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {skills.map((skill) => {
                    const value = character.skills[skill.name] || skill.base;
                    const isEditing = editingSkill === skill.name;
                    return (
                      <div key={skill.name} className="flex justify-between items-center p-2 bg-coc-bg-tertiary rounded">
                        <span className="text-sm">{skill.name}</span>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editSkillValue}
                              onChange={(e) => setEditSkillValue(parseInt(e.target.value) || 0)}
                              className="w-14 coc-input text-center text-sm py-1"
                              min={0}
                              max={99}
                            />
                            <button onClick={handleSaveSkill} className="text-green-400">
                              <Save size={14} />
                            </button>
                            <button onClick={() => setEditingSkill(null)} className="text-red-400">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-coc-accent-cyan">{value}%</span>
                            <span className="text-coc-text-muted">½{Math.floor(value/2)}</span>
                            <span className="text-coc-text-muted">⅕{Math.floor(value/5)}</span>
                            <button 
                              onClick={() => handleEditSkill(skill.name, value)}
                              className="text-coc-text-muted hover:text-coc-accent-red"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {/* 自定义技能 */}
            {Object.entries(character.skills || {}).filter(([name]) => 
              !Object.values(COC7_SKILLS).flat().some(s => s.name === name)
            ).length > 0 && (
              <div>
                <h3 className="font-bold mb-3 text-coc-accent-gold">自定义技能</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(character.skills || {}).filter(([name]) => 
                    !Object.values(COC7_SKILLS).flat().some(s => s.name === name)
                  ).map(([name, value]) => (
                    <div key={name} className="flex justify-between items-center p-2 bg-coc-bg-tertiary rounded">
                      <span className="text-sm">{name}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-coc-accent-cyan">{value}%</span>
                        <button 
                          onClick={() => handleEditSkill(name, value as number)}
                          className="text-coc-text-muted hover:text-coc-accent-red"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSkill(name)}
                          className="text-coc-text-muted hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
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
                    <div key={idx} className="p-3 bg-coc-bg-tertiary rounded">
                      <div className="font-medium">{weapon.name}</div>
                      <div className="text-sm text-coc-text-secondary">
                        伤害: {weapon.damage} | 射程: {weapon.range} | 贯穿: {weapon.impale ? '是' : '否'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-coc-text-muted">暂无武器</p>
              )}
            </div>

            <div>
              <h3 className="font-bold mb-3">护甲</h3>
              {character.armor ? (
                <div className="p-3 bg-coc-bg-tertiary rounded">
                  <div className="font-medium">{character.armor.name}</div>
                  <div className="text-sm text-coc-text-secondary">
                    护甲值: {character.armor.rating} | 覆盖: {character.armor.coverage}
                  </div>
                </div>
              ) : (
                <p className="text-coc-text-muted">无护甲</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'background' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-coc-text-secondary mb-2">背景故事</h4>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {character.background || '未填写背景故事'}
              </p>
            </div>
            <hr className="border-coc-void" />
            {[
              { key: 'appearance', label: '形象描述' },
              { key: 'beliefs', label: '思想与信念' },
              { key: 'significantPeople', label: '重要之人' },
              { key: 'meaningfulLocations', label: '意义非凡之地' },
              { key: 'treasuredPossessions', label: '宝贵之物' },
              { key: 'traits', label: '特质' },
              { key: 'woundsAndScars', label: '伤口与疤痕' },
              { key: 'phobiasAndMania', label: '恐惧症与躁狂症' },
            ].map((item) => (
              <div key={item.key}>
                <h4 className="text-sm font-bold text-coc-text-secondary mb-1">{item.label}</h4>
                <p className="text-sm">{(character as any)[item.key] || '未填写'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加技能弹窗 */}
      <Modal
        isOpen={showAddSkillModal}
        onClose={() => setShowAddSkillModal(false)}
        title="添加自定义技能"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">技能名称</label>
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className="w-full coc-input"
              placeholder="输入技能名称"
            />
          </div>
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">初始值 (%)</label>
            <input
              type="number"
              value={newSkillValue}
              onChange={(e) => setNewSkillValue(parseInt(e.target.value) || 0)}
              className="w-full coc-input"
              min={0}
              max={99}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddSkillModal(false)}
              className="coc-btn-secondary flex-1"
            >
              取消
            </button>
            <button
              onClick={handleAddSkill}
              disabled={!newSkillName}
              className="coc-btn-primary flex-1"
            >
              添加
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}