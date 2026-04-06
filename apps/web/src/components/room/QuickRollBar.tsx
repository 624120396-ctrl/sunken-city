import { useState } from 'react';
import { Settings, X, GripVertical } from 'lucide-react';
import { COC7_SKILLS } from '@lib/coc-data';
import { Modal } from '@components/ui/Modal';

interface QuickRollBarProps {
  quickSkills: string[];
  characterSkills: Record<string, number>;
  onRoll: (skillName: string, skillValue: number) => void;
  onUpdateQuickSkills?: (skills: string[]) => void;
  isEditable?: boolean;
}

export function QuickRollBar({ 
  quickSkills, 
  characterSkills, 
  onRoll, 
  onUpdateQuickSkills,
  isEditable 
}: QuickRollBarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [tempSkills, setTempSkills] = useState(quickSkills);

  // 获取所有可用技能
  const allSkills = Object.values(COC7_SKILLS).flat();

  const handleSave = () => {
    onUpdateQuickSkills?.(tempSkills.slice(0, 6));
    setShowSettings(false);
  };

  const handleAdd = (skillName: string) => {
    if (tempSkills.length < 6 && !tempSkills.includes(skillName)) {
      setTempSkills([...tempSkills, skillName]);
    }
  };

  const handleRemove = (skillName: string) => {
    setTempSkills(tempSkills.filter(s => s !== skillName));
  };

  const handleMove = (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < tempSkills.length) {
      const newSkills = [...tempSkills];
      [newSkills[index], newSkills[newIndex]] = [newSkills[newIndex], newSkills[index]];
      setTempSkills(newSkills);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 bg-coc-bg-secondary border-t border-coc-border overflow-x-auto">
        {quickSkills.map(skillName => {
          const skillValue = characterSkills[skillName] || 
            allSkills.find(s => s.name === skillName)?.base || 0;
          
          return (
            <button
              key={skillName}
              onClick={() => onRoll(skillName, skillValue)}
              className="flex-shrink-0 px-3 py-1.5 bg-coc-bg-tertiary hover:bg-coc-accent-gold/20 border border-coc-border hover:border-coc-accent-gold rounded text-sm transition-colors"
            >
              <span className="text-coc-text-secondary">{skillName}</span>
              <span className="ml-1 text-coc-accent-gold">{skillValue}</span>
            </button>
          );
        })}

        {isEditable && (
          <button
            onClick={() => {
              setTempSkills(quickSkills);
              setShowSettings(true);
            }}
            className="flex-shrink-0 p-1.5 text-coc-text-muted hover:text-coc-accent-gold transition-colors"
            title="设置快捷技能"
          >
            <Settings size={16} />
          </button>
        )}
      </div>

      {/* 设置弹窗 */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="设置快捷技能栏">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-coc-text-secondary mb-2">已选择的技能 ({tempSkills.length}/6)</p>
            <div className="space-y-1">
              {tempSkills.map((skillName, index) => (
                <div 
                  key={skillName} 
                  className="flex items-center gap-2 p-2 bg-coc-bg-tertiary rounded"
                >
                  <GripVertical size={16} className="text-coc-text-muted" />
                  <span className="flex-1">{skillName}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                      className="p-1 text-coc-text-muted hover:text-coc-text-primary disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMove(index, 1)}
                      disabled={index === tempSkills.length - 1}
                      className="p-1 text-coc-text-muted hover:text-coc-text-primary disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleRemove(skillName)}
                      className="p-1 text-coc-text-muted hover:text-coc-accent-red"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {tempSkills.length < 6 && (
            <div>
              <p className="text-sm text-coc-text-secondary mb-2">添加技能</p>
              <div className="max-h-48 overflow-y-auto border border-coc-border rounded">
                {allSkills
                  .filter(s => !tempSkills.includes(s.name))
                  .map(skill => (
                    <button
                      key={skill.name}
                      onClick={() => handleAdd(skill.name)}
                      className="w-full text-left px-3 py-2 hover:bg-coc-bg-tertiary transition-colors border-b border-coc-border last:border-b-0"
                    >
                      <span>{skill.name}</span>
                      <span className="ml-2 text-xs text-coc-text-muted">基础 {skill.base}%</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowSettings(false)}
              className="coc-btn-secondary flex-1"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="coc-btn-primary flex-1"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
