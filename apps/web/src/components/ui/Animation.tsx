import { motion, type HTMLMotionProps, type Variants } from 'motion/react';
import { cn } from '@lib/utils';
import type { ReactNode } from 'react';

interface HoverCardProps {
  children: ReactNode;
  className?: string;
  /** 悬浮抬升高度（px） */
  lift?: number;
  /** 阴影强度 */
  shadow?: 'sm' | 'md' | 'lg';
  /** 是否启用光泽效果 */
  glow?: boolean;
  /** 点击缩放 */
  scaleOnTap?: boolean;
}

const shadowMap = {
  sm: 'hover:shadow-lg',
  md: 'hover:shadow-xl',
  lg: 'hover:shadow-2xl',
};

export function HoverCard({
  children,
  className,
  lift = 4,
  shadow = 'md',
  glow = false,
  scaleOnTap = true,
}: HoverCardProps) {
  return (
    <motion.div
      className={cn('rounded-xl', shadowMap[shadow], className)}
      initial={{ y: 0 }}
      whileHover={{
        y: -lift,
        transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
      }}
      whileTap={scaleOnTap ? { scale: 0.98 } : undefined}
      style={{ willChange: 'transform' }}
    >
      {children}
      {glow && (
        <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            boxShadow: '0 0 30px rgba(201, 162, 39, 0.1), inset 0 1px 1px rgba(255,255,255,0.05)',
          }}
        />
      )}
    </motion.div>
  );
}

/* ===== Stagger 列表动画 ===== */

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

interface StaggerListProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
  /** 子元素间隔（秒） */
  staggerDelay?: number;
  /** 初始延迟（秒） */
  initialDelay?: number;
}

export function StaggerList({
  children,
  className,
  staggerDelay = 0.06,
  initialDelay = 0.05,
  ...props
}: StaggerListProps) {
  return (
    <motion.div
      {...props}
      className={className}
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
        },
      }}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/* ===== 页面过渡动画 ===== */

const pageVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.995 },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  out: {
    opacity: 0,
    y: -8,
    scale: 0.995,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
};

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      className={cn('h-full', className)}
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
    >
      {children}
    </motion.div>
  );
}

/* ===== 淡入动画容器 ===== */

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = 'up',
  distance = 20,
}: FadeInProps) {
  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
