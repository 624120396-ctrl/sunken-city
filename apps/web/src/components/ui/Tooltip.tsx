import { ReactNode, useState } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={`absolute z-50 ${positionClasses[position]} whitespace-nowrap`}>
          <div className="bg-coc-bg-secondary border border-coc-border px-3 py-2 rounded text-sm text-coc-text-primary shadow-lg">
            {content}
          </div>
          {/* 小三角箭头 */}
          <div 
            className={`absolute w-2 h-2 bg-coc-bg-secondary border-coc-border rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1 border-b border-r' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-t border-l' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t border-r' :
              'right-full top-1/2 -translate-y-1/2 -mr-1 border-b border-l'
            }`}
          />
        </div>
      )}
    </div>
  );
}
