import { Check, ImageIcon, Save } from 'lucide-react';
import { Button, Surface } from '@components/system';
import { BACKGROUND_OPTIONS } from './backgroundOptions';

interface BackgroundPickerProps {
  value: string;
  saving?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}

const profileLabels = {
  luminous: '明亮',
  balanced: '平衡',
  dark: '暗色',
} as const;

const profileDescriptions = {
  luminous: '适合羊皮纸与明亮档案背景',
  balanced: '冷雾氛围与可读层级平衡',
  dark: '深海和虚空背景的高对比档',
} as const;

export function BackgroundPicker({
  value,
  saving = false,
  onChange,
  onSave,
}: BackgroundPickerProps) {
  return (
    <Surface variant="solid" material="archive" padding="lg" className="profile-background-picker">
      <h2>
        <ImageIcon className="h-5 w-5" />
        全局背景
      </h2>
      <p>
        每张背景都有独立可读性档位。背景负责氛围，页面 Surface 负责正文可读。
      </p>
      <div className="profile-background-picker__grid">
        {BACKGROUND_OPTIONS.map((bg) => {
          const selected = value === bg.id;

          return (
            <button
              key={bg.id}
              type="button"
              onClick={() => onChange(bg.id)}
              className="coc-focus-ring profile-background-option"
              style={{ borderColor: selected ? 'var(--coc-accent-gold)' : 'var(--coc-border-subtle)' }}
              aria-pressed={selected}
            >
              <img src={bg.url} alt={bg.name} loading="lazy" />
              <div className="profile-background-option__label">
                <span>{bg.name}</span>
                <small>
                  {profileLabels[bg.readabilityProfile]}
                </small>
                <span className="sr-only">{profileDescriptions[bg.readabilityProfile]}</span>
              </div>
              {selected && (
                <div className="profile-background-option__check">
                  <Check size={14} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <Button className="mt-4" variant="primary" loading={saving} icon={<Save size={16} />} onClick={onSave}>
        {saving ? '保存中...' : '保存背景'}
      </Button>
    </Surface>
  );
}
