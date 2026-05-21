import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  /** 图标或插画 */
  icon?: ReactNode;
  /** 主标题 */
  title: string;
  /** 描述文案 */
  description?: string;
  /** 操作按钮 */
  action?: ReactNode;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否使用动画 */
  animate?: boolean;
}

const sizeMap = {
  sm: { icon: 'w-10 h-10', title: 'text-sm', desc: 'text-xs', padding: 'py-6' },
  md: { icon: 'w-16 h-16', title: 'text-lg', desc: 'text-sm', padding: 'py-12' },
  lg: { icon: 'w-20 h-20', title: 'text-xl', desc: 'text-base', padding: 'py-20' },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  animate = true,
}: EmptyStateProps) {
  const s = sizeMap[size];

  const Wrapper = animate
    ? motion.div
    : 'div' as unknown as typeof motion.div;

  return (
    <Wrapper
      className={`flex flex-col items-center justify-center text-center ${s.padding} px-4`}
      {...(animate && {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
      })}
    >
      {icon && (
        <div
          className={`${s.icon} mb-4 text-coc-parchment-faded flex items-center justify-center`}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <h3
        className={`${s.title} font-ritual text-coc-parchment font-semibold tracking-wide mb-2`}
      >
        {title}
      </h3>

      {description && (
        <p className={`${s.desc} text-coc-text-secondary max-w-[40ch] leading-relaxed mb-4`}>
          {description}
        </p>
      )}

      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </Wrapper>
  );
}

/** 空状态图标预设 */
export const EmptyIcons = {
  /** 钓鱼 — 鱼钩与波浪 */
  Fishing: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full opacity-60">
      <path d="M32 8v20M32 28c-8 0-16 4-16 12s8 16 16 16 16-8 16-16" strokeLinecap="round" />
      <path d="M28 56l4-4 4 4M20 44c4-2 8-2 12 0s8 2 12 0" strokeLinecap="round" opacity="0.5" />
    </svg>
  ),

  /** 背包 — 空袋子 */
  Inventory: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full opacity-60">
      <path d="M16 20h32l4 36H12l4-36z" />
      <path d="M24 20V12a8 8 0 0 1 16 0v8" />
      <circle cx="32" cy="40" r="3" opacity="0.3" />
    </svg>
  ),

  /** 商店 — 空货架 */
  Shop: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full opacity-60">
      <path d="M8 16h48v4H8zM12 20v40M52 20v40M16 32h32M16 44h32" />
      <path d="M20 28v-4M32 28v-4M44 28v-4" strokeDasharray="2 4" />
    </svg>
  ),

  /** 好友 — 孤独的剪影 */
  Friends: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full opacity-60">
      <circle cx="32" cy="22" r="8" />
      <path d="M16 56c0-12 8-16 16-16s16 4 16 16" />
      <circle cx="50" cy="18" r="4" opacity="0.4" />
      <path d="M48 32c0-6 4-8 6-8" opacity="0.4" />
    </svg>
  ),

  /** 梦境 — 睡眼 */
  Dreams: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full opacity-60">
      <path d="M16 32c0-12 8-20 16-20s16 8 16 20-8 20-16 20" />
      <path d="M24 30c2-2 4-2 6 0M38 30c2-2 4-2 6 0" />
      <path d="M30 36c0 2 2 4 4 0" />
      <circle cx="48" cy="16" r="2" opacity="0.5" />
      <circle cx="54" cy="12" r="1.5" opacity="0.3" />
    </svg>
  ),

  /** 战斗 — 断裂的剑 */
  Combat: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full opacity-60">
      <path d="M20 44L44 20" strokeLinecap="round" />
      <path d="M36 16l8 8-4 4-8-8z" />
      <path d="M16 48l4-4" />
    </svg>
  ),

  /** 消息 — 空信封 */
  Messages: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full opacity-60">
      <rect x="8" y="16" width="48" height="36" rx="2" />
      <path d="M8 20l24 16 24-16" />
    </svg>
  ),

  /** 调查员 — 无名墓碑 */
  Investigator: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full opacity-60">
      <path d="M20 52V28a12 12 0 0 1 24 0v24" />
      <path d="M16 52h32" />
      <path d="M28 36h8M28 42h8" opacity="0.4" />
    </svg>
  ),

  /** 线索 — 问号符文 */
  Clue: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full opacity-60">
      <circle cx="32" cy="32" r="24" />
      <path d="M28 24c0-4 4-6 8-4s4 6 0 8-4 4-4 8" />
      <circle cx="32" cy="46" r="2" />
    </svg>
  ),

  /** 骰子 — 空白骰子面 */
  Dice: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full opacity-60">
      <rect x="12" y="12" width="40" height="40" rx="6" />
      <circle cx="32" cy="32" r="3" opacity="0.5" />
    </svg>
  ),

  /** 通用 — 虚空之眼 */
  Void: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full opacity-60">
      <path d="M8 32c12-16 36-16 48 0-12 16-36 16-48 0z" />
      <circle cx="32" cy="32" r="8" />
      <circle cx="32" cy="32" r="3" fill="currentColor" opacity="0.3" />
    </svg>
  ),
};
