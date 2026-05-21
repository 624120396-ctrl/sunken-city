import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@lib/utils';
import { animateDrawer } from '@lib/animation';
import { X } from 'lucide-react';

interface DrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  direction?: 'left' | 'right' | 'bottom';
  title?: string;
  className?: string;
  width?: string;
  height?: string;
}

export function Drawer({
  children,
  isOpen,
  onClose,
  direction = 'left',
  title,
  className,
  width = 'w-80 md:w-96',
  height = 'h-[70vh]',
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (drawerRef.current) {
      setIsAnimating(true);
      animateDrawer(drawerRef.current, direction, isOpen, () => {
        setIsAnimating(false);
      });
    }
  }, [isOpen, direction]);

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 点击遮罩关闭
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen && !isAnimating) return null;

  const isBottom = direction === 'bottom';

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-40',
        'bg-coc-abyss/50 backdrop-blur-sm',
        'transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={handleOverlayClick}
    >
      <div
        ref={drawerRef}
        className={cn(
          'fixed bg-coc-surface border-coc-void shadow-xl',
          'flex flex-col',
          isBottom ? 'bottom-0 left-0 right-0' : 'top-0 bottom-0',
          isBottom ? height : 'h-full',
          isBottom ? 'rounded-t-2xl border-t' : width,
          !isBottom && direction === 'left' ? 'left-0 border-r' : 'right-0 border-l',
          className
        )}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-coc-void shrink-0">
          {title && (
            <h3 className="font-ritual text-lg text-coc-parchment tracking-wide">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="p-1 text-coc-parchment-dim hover:text-coc-parchment transition-colors ml-auto"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>

        {/* 底部把手（仅底部抽屉） */}
        {isBottom && (
          <div className="flex justify-center py-2 shrink-0">
            <div className="w-12 h-1 rounded-full bg-coc-void">
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
