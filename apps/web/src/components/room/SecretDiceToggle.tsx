import { Eye, EyeOff } from 'lucide-react';

interface SecretDiceToggleProps {
  isSecret: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function SecretDiceToggle({ isSecret, onToggle, disabled }: SecretDiceToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
        isSecret 
          ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' 
          : 'text-coc-text-muted hover:text-coc-text-primary'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isSecret ? '暗骰模式：仅KP和你可见' : '点击切换暗骰模式'}
    >
      {isSecret ? <EyeOff size={14} /> : <Eye size={14} />}
      <span>{isSecret ? '暗骰' : '明骰'}</span>
    </button>
  );
}
