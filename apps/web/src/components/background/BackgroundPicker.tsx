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
    <Surface variant="solid" padding="lg">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--coc-text-gold)]">
        <ImageIcon className="h-5 w-5 text-[var(--coc-accent-gold)]" />
        全局背景
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-[var(--coc-text-secondary)]">
        每张背景都有独立可读性档位。背景负责氛围，页面 Surface 负责正文可读。
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {BACKGROUND_OPTIONS.map((bg) => {
          const selected = value === bg.id;

          return (
            <button
              key={bg.id}
              type="button"
              onClick={() => onChange(bg.id)}
              className="coc-focus-ring relative overflow-hidden rounded-md border transition"
              style={{ borderColor: selected ? 'var(--coc-accent-gold)' : 'var(--coc-border-subtle)' }}
              aria-pressed={selected}
            >
              <img src={bg.url} alt={bg.name} className="h-24 w-full object-cover" loading="lazy" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-left">
                <span className="block text-xs font-medium text-white">{bg.name}</span>
                <span className="mt-1 inline-flex rounded-full border border-white/20 bg-black/45 px-2 py-0.5 text-[10px] text-white/85">
                  {profileLabels[bg.readabilityProfile]}
                </span>
                <span className="sr-only">{profileDescriptions[bg.readabilityProfile]}</span>
              </div>
              {selected && (
                <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--coc-accent-gold)] text-black">
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
