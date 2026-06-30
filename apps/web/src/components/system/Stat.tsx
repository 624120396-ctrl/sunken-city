import type { ReactNode } from 'react';
import { cn } from '@lib/utils';

type StatTone = 'gold' | 'blood' | 'madness' | 'ocean' | 'neutral';

interface StatProps {
  label: string;
  value: ReactNode;
  tone?: StatTone;
  className?: string;
}

const toneClass: Record<StatTone, string> = {
  gold: 'text-[var(--coc-accent-gold-strong)]',
  blood: 'text-[var(--coc-accent-blood-strong)]',
  madness: 'text-[var(--coc-accent-madness)]',
  ocean: 'text-[var(--coc-accent-ocean)]',
  neutral: 'text-[var(--coc-text-primary)]',
};

export function Stat({ label, value, tone = 'neutral', className }: StatProps) {
  return (
    <div className={cn('rounded-md border border-[var(--coc-border-subtle)] bg-black/20 px-3 py-2', className)}>
      <div className={cn('font-mono text-lg font-bold leading-none', toneClass[tone])}>{value}</div>
      <div className="mt-1 text-[11px] text-[var(--coc-text-muted)]">{label}</div>
    </div>
  );
}
