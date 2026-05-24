import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ButtonVariant = 'primary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface CthulhuButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#1a1a24] text-[#c9a227] border border-[#2a2a35] hover:border-[#c9a227]/30',
  danger:
    'bg-[#8b2635] text-[#f5f0e6] border border-[#8b2635]/50 hover:bg-[#a63848]',
  ghost:
    'bg-transparent text-[#c4b9a0] border border-[#2a2a35] hover:border-[#c9a227]/20 hover:bg-[#1a1a24]/50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-5 py-2.5 text-sm rounded-lg',
  lg: 'px-8 py-4 text-base rounded-lg',
};

export const CthulhuButton = React.forwardRef<HTMLButtonElement, CthulhuButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      className,
      disabled = false,
      loading = false,
      onClick,
      href,
      icon,
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const buttonContent = (
      <>
        {/* 底部阴影 — 3D按压感 */}
        <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-black/40 to-transparent pointer-events-none rounded-inherit" />

        {/* hover 流光扫过 */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c9a227]/10 to-transparent pointer-events-none"
          initial={{ x: '-100%' }}
          whileHover={!isDisabled ? { x: '100%' } : {}}
          transition={{ duration: 0.6 }}
        />

        {/* 顶部高光 */}
        <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#c9a227]/30 to-transparent pointer-events-none" />

        {/* 血滴装饰（danger变体） */}
        {variant === 'danger' && (
          <svg className="absolute bottom-1 left-2 w-3 h-4 pointer-events-none" viewBox="0 0 6 8">
            <path
              d="M3,0 Q5,3 3,7"
              stroke="#8b2635"
              strokeWidth="1.5"
              fill="none"
              opacity="0.5"
            />
            <circle cx="3" cy="7" r="1.5" fill="#8b2635" opacity="0.3" />
          </svg>
        )}

        {/* 内容 */}
        <span className="relative z-10 flex items-center gap-2">
          {loading && (
            <motion.span
              className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          )}
          {icon && !loading && icon}
          {children}
        </span>
      </>
    );

    const baseClasses = cn(
      'relative inline-flex items-center justify-center overflow-hidden font-medium',
      'transition-colors duration-200',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a227]/30',
      variantClasses[variant],
      sizeClasses[size],
      isDisabled && 'opacity-40 cursor-not-allowed',
      className
    );

    if (href) {
      return (
        <motion.a
          href={href}
          className={baseClasses}
          whileHover={!isDisabled ? { scale: 1.05, y: -2 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {buttonContent}
        </motion.a>
      );
    }

    return (
      <motion.button
        ref={ref}
        className={baseClasses}
        onClick={onClick}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.05, y: -2 } : {}}
        whileTap={!isDisabled ? { scale: 0.95 } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {buttonContent}
      </motion.button>
    );
  }
);

CthulhuButton.displayName = 'CthulhuButton';
