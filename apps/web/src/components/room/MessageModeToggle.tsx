interface MessageModeToggleProps {
  mode: 'text' | 'ic' | 'oc' | 'narration';
  onChange: (mode: 'text' | 'ic' | 'oc' | 'narration') => void;
}

export function MessageModeToggle({ mode, onChange }: MessageModeToggleProps) {
  const modes: { key: 'text' | 'ic' | 'oc' | 'narration'; label: string; className: string }[] = [
    { key: 'text', label: '普通', className: 'text-coc-text-secondary' },
    { key: 'ic', label: 'IC', className: 'text-amber-300' },
    { key: 'oc', label: 'OC', className: 'text-slate-300' },
    { key: 'narration', label: '旁白', className: 'text-coc-accent-gold italic' },
  ];

  return (
    <div className="flex items-center gap-1">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`px-2 py-0.5 rounded text-xs border transition-colors ${
            mode === m.key
              ? `bg-coc-bg-tertiary border-coc-border ${m.className}`
              : 'border-transparent text-coc-text-muted hover:text-coc-text-secondary'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
