import { useEffect, useRef } from 'react';
import { cn } from '@lib/utils';
import { animateMessage } from '@lib/animation';
import { User, Bot } from 'lucide-react';

interface MessageSlideInProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export function MessageSlideIn({
  children,
  index = 0,
  className,
}: MessageSlideInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      animateMessage(ref.current, index);
    }
  }, [index]);

  return (
    <div
      ref={ref}
      className={cn(
        'opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 聊天消息气泡（带滑入动画）
 */
interface AnimatedChatMessageProps {
  content: string;
  sender: 'player' | 'kp' | 'system';
  senderName: string;
  timestamp?: string;
  index?: number;
  className?: string;
}

export function AnimatedChatMessage({
  content,
  sender,
  senderName,
  timestamp,
  index = 0,
  className,
}: AnimatedChatMessageProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      animateMessage(ref.current, index);
    }
  }, [index]);

  const isKP = sender === 'kp';
  const isSystem = sender === 'system';

  return (
    <div
      ref={ref}
      className={cn(
        'flex gap-3 opacity-0',
        isKP ? 'flex-row' : 'flex-row-reverse',
        className
      )}
    >
      {/* 头像 */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isKP && 'bg-coc-madness/20 text-coc-madness',
          isSystem && 'bg-coc-gold/20 text-coc-gold',
          !isKP && !isSystem && 'bg-coc-blood/20 text-coc-blood'
        )}
      >
        {isKP ? <Bot size={16} /> : <User size={16} />}
      </div>

      {/* 消息内容 */}
      <div className={cn('flex-1 max-w-[80%]', isKP ? '' : 'items-end')}
      >
        <div
          className={cn(
            'px-4 py-3 rounded-2xl',
            isKP && 'bg-coc-surface border border-coc-void text-coc-parchment rounded-tl-none',
            isSystem && 'bg-coc-gold/10 border border-coc-gold/20 text-coc-gold text-center',
            !isKP && !isSystem && 'bg-coc-blood/10 border border-coc-blood/20 text-coc-parchment rounded-tr-none'
          )}
        >
          <div className="text-xs font-rune text-coc-parchment-dim mb-1"
          >
            {senderName}
            {timestamp && (
              <span className="ml-2 opacity-50">{timestamp}</span>
            )}
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap"
          >
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
