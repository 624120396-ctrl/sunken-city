import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--coc-accent-gold)] text-[var(--coc-text-inverse)] hover:bg-[var(--coc-accent-gold-strong)]',
  secondary: 'bg-black/35 text-[var(--coc-text-primary)] border border-[var(--coc-border-subtle)] hover:border-[var(--coc-border-strong)]',
  danger: 'bg-[var(--coc-accent-blood)] text-white hover:bg-[var(--coc-accent-blood-strong)]',
  ghost: 'bg-transparent text-[var(--coc-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--coc-text-primary)]',
  icon: 'bg-black/25 text-[var(--coc-text-secondary)] border border-[var(--coc-border-subtle)] hover:text-[var(--coc-text-primary)]',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isIconOnly = variant === 'icon' && !children;

  return (
    <button
      className={cn(
        'coc-focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--coc-radius-control)] font-medium transition disabled:pointer-events-none disabled:opacity-50',
        variantClass[variant],
        isIconOnly ? 'h-10 w-10 p-0' : sizeClass[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
