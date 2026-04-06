import { X } from 'lucide-react';
import { cn } from '@lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div
        className={cn(
          'relative w-full max-w-md bg-coc-bg-secondary rounded-lg border border-coc-border shadow-2xl',
          className
        )}
      >
        {/* 头部 */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-coc-border">
            <h3 className="text-lg font-bold">{title}</h3>
            <button
              onClick={onClose}
              className="text-coc-text-muted hover:text-coc-text-primary transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* 内容 */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}