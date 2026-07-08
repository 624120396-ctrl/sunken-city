import { useState } from 'react';
import { Dices, Eye, EyeOff, Target } from 'lucide-react';
import { cn } from '@lib/utils';

const ROLL_TYPES = ['1D100', '1D20', '1D6', '2D6', '3D6'];

interface KPDicePanelProps {
  onRoll: (rollType: string, skillName?: string, skillValue?: number) => void;
  connected?: boolean;
  isSecret?: boolean;
  onToggleSecret?: () => void;
}

export function KPDicePanel({
  onRoll,
  connected = true,
  isSecret = false,
  onToggleSecret,
}: KPDicePanelProps) {
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
    <div className="room-kp-dice-panel">
      <div className="room-kp-dice-panel__topline">
        <div>
          <span className="room-kp-dice-panel__eyebrow">Keeper Dice</span>
          <h3>完整投骰</h3>
          <p>用于剧情点、NPC、环境风险或玩家行为的公开骰与暗骰。</p>
        </div>
        {onToggleSecret && (
          <button
            type="button"
            className={cn('room-kp-dice-panel__mode', isSecret && 'room-kp-dice-panel__mode--secret')}
            onClick={onToggleSecret}
            disabled={!connected}
            aria-pressed={isSecret}
          >
            {isSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{isSecret ? '暗骰' : '明骰'}</span>
          </button>
        )}
      </div>

      <div className="room-kp-dice-panel__types" aria-label="骰型">
        {ROLL_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setRollType(type)}
            className={cn('room-kp-dice-panel__type', rollType === type && 'room-kp-dice-panel__type--active')}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="room-kp-dice-panel__fields">
        <label className="room-kp-dice-panel__field room-kp-dice-panel__field--name">
          <span>对象</span>
          <input
            type="text"
            placeholder="例如：潜行、NPC 察觉、暗流"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            className="room-kp-dice-panel__input"
          />
        </label>
        <label className="room-kp-dice-panel__field room-kp-dice-panel__field--value">
          <span>目标值</span>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="可选"
            value={skillValue}
            onChange={(e) => setSkillValue(e.target.value)}
            className="room-kp-dice-panel__input room-kp-dice-panel__input--value"
          />
        </label>
        <button
          type="button"
          onClick={handleRoll}
          disabled={!connected}
          className="room-kp-dice-panel__submit"
        >
          {skillName || skillValue ? <Target size={16} /> : <Dices size={16} />}
          投骰
        </button>
      </div>
    </div>
  );
}
