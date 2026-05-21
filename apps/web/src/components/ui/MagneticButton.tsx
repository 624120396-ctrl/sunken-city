import { cn } from '@lib/utils';
import { useRef, useCallback, useState } from 'react';
import { animateButtonPress } from '@lib/animation';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'blood' | 'gold' | 'void';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  magnetic?: boolean;
}

const variantStyles = {
  blood: {
    base: 'bg-coc-blood text-coc-parchment',
    hover: 'hover:bg-coc-blood-glow',
    shadow: 'shadow-[0_0_15px_rgba(139,38,53,0.4)]',
    active: 'active:bg-coc-blood-dark',
  },
  gold: {
    base: 'bg-coc-gold text-coc-abyss',
    hover: 'hover:bg-coc-gold-glow',
    shadow: 'shadow-[0_0_15px_rgba(201,162,39,0.3)]',
    active: 'active:bg-coc-gold-dim',
  },
  void: {
    base: 'bg-coc-surface border border-coc-void text-coc-parchment',
    hover: 'hover:border-coc-rift hover:bg-coc-mist',
    shadow: '',
    active: 'active:bg-coc-deep',
  },
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export function MagneticButton({
  children,
  className,
  variant = 'blood',
  size = 'md',
  onClick,
  disabled = false,
  magnetic = true,
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!magnetic || !buttonRef.current || disabled) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      setPosition({
        x: x * 0.2,
        y: y * 0.2,
      });
    },
    [magnetic, disabled]
  );

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleClick = useCallback(() => {
    if (buttonRef.current) {
      animateButtonPress(buttonRef.current);
    }
    onClick?.();
  }, [onClick]);

  const styles = variantStyles[variant];

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      className={cn(
        'relative rounded-lg font-medium',
        'transition-colors duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'overflow-hidden',
        'font-ritual tracking-wider',
        styles.base,
        styles.hover,
        sizeStyles[size],
        className
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: position.x === 0 && position.y === 0 ? 'transform 0.3s ease' : 'none',
      }}
    >
      {/* 内部微光 */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>

      {/* hover 光效 */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 transition-opacity duration-300',
          'hover:opacity-100',
          styles.shadow
        )}
      />
    </button>
  );
}
