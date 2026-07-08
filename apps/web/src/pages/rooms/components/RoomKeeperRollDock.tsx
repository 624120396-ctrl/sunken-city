import { Dice5, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { cn } from '@lib/utils';

interface RoomKeeperRollDockProps {
  connected: boolean;
  isSecretDice: boolean;
  onToggleSecretDice: () => void;
  onQuickRoll: () => void;
  onOpenFull: () => void;
}

export function RoomKeeperRollDock({
  connected,
  isSecretDice,
  onToggleSecretDice,
  onQuickRoll,
  onOpenFull,
}: RoomKeeperRollDockProps) {
  return (
    <div className="room-keeper-roll-dock" aria-label="KP 骰点工具">
      <button
        type="button"
        className="room-keeper-roll-dock__quick"
        onClick={onQuickRoll}
        disabled={!connected}
        title="快速投 1D100"
      >
        <Dice5 size={16} />
        <span>D100</span>
      </button>

      <button
        type="button"
        className="room-keeper-roll-dock__full"
        onClick={onOpenFull}
        disabled={!connected}
        title="打开完整投骰面板"
      >
        <SlidersHorizontal size={16} />
        <span>投骰</span>
      </button>

      <button
        type="button"
        className={cn('room-keeper-roll-dock__mode', isSecretDice && 'room-keeper-roll-dock__mode--secret')}
        onClick={onToggleSecretDice}
        disabled={!connected}
        aria-pressed={isSecretDice}
        title={isSecretDice ? '当前为暗骰，点击切换为明骰' : '当前为明骰，点击切换为暗骰'}
      >
        {isSecretDice ? <EyeOff size={15} /> : <Eye size={15} />}
        <span>{isSecretDice ? '暗骰' : '明骰'}</span>
      </button>
    </div>
  );
}
