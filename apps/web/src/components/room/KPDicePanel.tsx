import { useState } from 'react';
import { Dices } from 'lucide-react';

const ROLL_TYPES = ['1D100', '1D20', '1D6', '2D6', '3D6'];

interface KPDicePanelProps {
  onRoll: (rollType: string, skillName?: string, skillValue?: number) => void;
}

export function KPDicePanel({ onRoll }: KPDicePanelProps) {
  const [rollType, setRollType] = useState('1D100');
  const [skillName, setSkillName] = useState('');
  const [skillValue, setSkillValue] = useState('');

  const handleRoll = () => {
    const value = skillValue ? parseInt(skillValue, 10) : undefined;
    onRoll(rollType, skillName || undefined, value);
    setSkillName('');
    setSkillValue('');
  };

  return (
    <div className="px-4 py-2 bg-coc-bg-secondary border-t border-coc-border">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs text-coc-text-muted">KP投骰:</span>
        {ROLL_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setRollType(type)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              rollType === type
                ? 'bg-coc-accent-gold/20 border-coc-accent-gold text-coc-accent-gold'
                : 'bg-coc-bg-tertiary border-coc-border hover:border-coc-accent-gold/50'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="技能名 (可选)"
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
          className="flex-1 min-w-[80px] px-2 py-1 bg-coc-bg-tertiary border border-coc-border rounded text-sm focus:border-coc-accent-gold outline-none"
        />
        <input
          type="number"
          placeholder="目标值"
          value={skillValue}
          onChange={(e) => setSkillValue(e.target.value)}
          className="w-20 px-2 py-1 bg-coc-bg-tertiary border border-coc-border rounded text-sm focus:border-coc-accent-gold outline-none"
        />
        <button
          onClick={handleRoll}
          className="px-3 py-1.5 bg-coc-accent-red hover:bg-red-600 text-white rounded text-sm flex items-center gap-1"
        >
          <Dices size={14} />
          投骰
        </button>
      </div>
    </div>
  );
}
