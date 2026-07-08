import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Settings, X, GripVertical } from 'lucide-react';
import { COC7E_SKILLS } from '@lib/coc7-data';
import { Modal } from '@components/ui/Modal';
import { cn } from '@lib/utils';

interface QuickRollBarProps {
  quickSkills: string[];
  characterSkills: Record<string, number>;
  onRoll: (skillName: string, skillValue: number) => void;
  onUpdateQuickSkills?: (skills: string[]) => void;
  isEditable?: boolean;
  compact?: boolean;
  desktopPageSize?: number;
}

export function QuickRollBar({
  quickSkills,
  characterSkills,
  onRoll,
  onUpdateQuickSkills,
  isEditable,
  compact = false,
  desktopPageSize = 2,
}: QuickRollBarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [tempSkills, setTempSkills] = useState(quickSkills);
  const [page, setPage] = useState(0);
  const pageSize = compact ? 3 : desktopPageSize;
  const pageCount = Math.max(1, Math.ceil(quickSkills.length / pageSize));
  const visibleSkills = useMemo(
    () => quickSkills.slice(page * pageSize, page * pageSize + pageSize),
    [page, pageSize, quickSkills]
  );

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  const getSkillDef = (key: string) => COC7E_SKILLS.find((s) => s.key === key);
  const getCompactSkillName = (name: string) => {
    const compactNames: Record<string, string> = {
      图书馆使用: '图书馆',
      克苏鲁神话: '神话',
      信用评级: '信用',
      乔装打扮: '乔装',
      电子学: '电子',
      计算机使用: '计算机',
    };
    return compactNames[name] || name;
  };

  const handleSave = () => {
    onUpdateQuickSkills?.(tempSkills.slice(0, 6));
    setShowSettings(false);
  };

  const handleAdd = (skillKey: string) => {
    if (tempSkills.length < 6 && !tempSkills.includes(skillKey)) {
      setTempSkills([...tempSkills, skillKey]);
    }
  };

  const handleRemove = (skillKey: string) => {
    setTempSkills(tempSkills.filter((s) => s !== skillKey));
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
      <div
        data-testid="room-quick-roll-bar"
        className={cn(
          'room-quick-roll-carousel flex items-center bg-coc-bg-secondary border-t border-coc-border',
          compact
            ? 'h-10 gap-1.5 px-2 py-1'
            : 'gap-2 px-4 py-2'
        )}
      >
        {pageCount > 1 && (
          <button
            type="button"
            className="room-quick-roll-carousel__nav"
            onClick={() => setPage((current) => (current + pageCount - 1) % pageCount)}
            aria-label="上一组快捷投骰"
          >
            <ChevronLeft size={14} />
          </button>
        )}

        <div className="room-quick-roll-carousel__items">
          {visibleSkills.map((skillKey) => {
            const def = getSkillDef(skillKey);
            const skillName = def?.name || skillKey;
            const displayName = compact ? getCompactSkillName(skillName) : skillName;
            const skillValue = characterSkills[skillKey] ?? def?.baseValue ?? 0;

            return (
              <button
                key={skillKey}
                type="button"
                onClick={() => onRoll(skillName, skillValue)}
                className={cn(
                  'room-quick-roll-carousel__skill flex-shrink-0 bg-coc-bg-tertiary hover:bg-coc-accent-gold/20 border border-coc-border hover:border-coc-accent-gold rounded transition-colors',
                  compact
                    ? 'flex h-8 min-w-[52px] max-w-[72px] items-center justify-center px-1.5 text-[11px] leading-none'
                    : 'px-3 py-1.5 text-sm'
                )}
              >
                <span className={cn('room-quick-roll-carousel__name text-coc-text-secondary', compact && 'min-w-0 truncate')} title={skillName}>{displayName}</span>
                <span className={cn('room-quick-roll-carousel__value text-coc-accent-gold', compact ? 'ml-0.5' : 'ml-1')}>{skillValue}</span>
              </button>
            );
          })}
        </div>

        {pageCount > 1 && (
          <button
            type="button"
            className="room-quick-roll-carousel__nav"
            onClick={() => setPage((current) => (current + 1) % pageCount)}
            aria-label="下一组快捷投骰"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {pageCount > 1 && (
          <div className="room-quick-roll-carousel__dots" aria-label={`快捷投骰第 ${page + 1} 页，共 ${pageCount} 页`}>
            {Array.from({ length: pageCount }, (_, index) => (
              <span
                key={index}
                className={cn('room-quick-roll-carousel__dot', index === page && 'room-quick-roll-carousel__dot--active')}
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        {isEditable && (
            <button
              type="button"
              onClick={() => {
                setTempSkills(quickSkills);
                setShowSettings(true);
              }}
              className={cn(
                'room-quick-roll-carousel__settings flex-shrink-0 text-coc-text-muted hover:text-coc-accent-gold transition-colors',
                compact ? 'flex h-8 w-8 items-center justify-center p-0' : 'p-1.5'
              )}
              title="设置快捷技能"
            >
              <Settings size={compact ? 14 : 16} />
            </button>
        )}
      </div>

      {/* 设置弹窗 */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="设置快捷技能栏">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-coc-text-secondary mb-2">已选择的技能 ({tempSkills.length}/6)</p>
            <div className="space-y-1">
              {tempSkills.map((skillKey, index) => {
                const def = getSkillDef(skillKey);
                const skillName = def?.name || skillKey;
                return (
                  <div key={skillKey} className="flex items-center gap-2 p-2 bg-coc-bg-tertiary rounded">
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
                        onClick={() => handleRemove(skillKey)}
                        className="p-1 text-coc-text-muted hover:text-coc-accent-red"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {tempSkills.length < 6 && (
            <div>
              <p className="text-sm text-coc-text-secondary mb-2">添加技能</p>
              <div className="max-h-48 overflow-y-auto border border-coc-border rounded">
                {COC7E_SKILLS.filter((s) => !tempSkills.includes(s.key)).map((skill) => (
                  <button
                    key={skill.key}
                    onClick={() => handleAdd(skill.key)}
                    className="w-full text-left px-3 py-2 hover:bg-coc-bg-tertiary transition-colors border-b border-coc-border last:border-b-0"
                  >
                    <span>{skill.name}</span>
                    <span className="ml-2 text-xs text-coc-text-muted">基础 {skill.baseValue}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setShowSettings(false)} className="coc-btn-secondary flex-1">
              取消
            </button>
            <button onClick={handleSave} className="coc-btn-primary flex-1">
              保存
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
