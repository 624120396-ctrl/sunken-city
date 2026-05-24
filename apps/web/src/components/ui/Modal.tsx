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
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div
        className={cn(
          'relative w-full max-w-md backdrop-blur-md bg-black/60 rounded-lg border border-[#3a3a3a]/60 shadow-2xl shadow-black/80',
          className
        )}
      >
        {/* 头部 */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#3a3a3a]/40">
            <h3 className="text-lg font-bold" style={{ color: '#c9a227' }}>{title}</h3>
            <button
              onClick={onClose}
              className="transition-colors"
              style={{ color: '#6b6558' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#e8d4a0')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6b6558')}
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* 内容 */}
        <div className="p-6" style={{ color: '#d4c5a8' }}>{children}</div>
      </div>
    </div>
  );
}