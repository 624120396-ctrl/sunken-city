import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@lib/utils';
import { animateTypewriter } from '@lib/animation';
import { Bot } from 'lucide-react';

interface TypewriterTextProps {
  text: string;
  className?: string;
  onComplete?: () => void;
  startImmediately?: boolean;
  cursor?: boolean;
}

export function TypewriterText({
  text,
  className,
  onComplete,
  startImmediately = true,
  cursor = true,
}: TypewriterTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (startImmediately && ref.current) {
      animateTypewriter(ref.current, text, () => {
        setIsComplete(true);
        onComplete?.();
      });
    }
  }, [startImmediately, text, onComplete]);

  return (
    <span
      ref={ref}
      className={cn(
        'inline',
        className
      )}
    >
      {cursor && !isComplete && (
        <span className="animate-pulse text-coc-gold">| </span>
      )}
    </span>
  );
}

/**
 * NPC 对话气泡（带打字机效果）
 */
interface NPCDialogProps {
  name: string;
  text: string;
  avatar?: string;
  onComplete?: () => void;
  className?: string;
  variant?: 'default' | 'whisper' | 'madness';
}

export function NPCDialog({
  name,
  text,
  avatar,
  onComplete,
  className,
  variant = 'default',
}: NPCDialogProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [isComplete, setIsComplete] = useState(false);

  const variantStyles = {
    default: {
      bubble: 'bg-coc-surface border-coc-void',
      name: 'text-coc-gold',
      text: 'text-coc-parchment',
    },
    whisper: {
      bubble: 'bg-coc-madness/10 border-coc-madness/20',
      name: 'text-coc-madness-glow',
      text: 'text-coc-madness italic font-whisper',
    },
    madness: {
      bubble: 'bg-coc-blood/10 border-coc-blood/20 animate-madness-flicker',
      name: 'text-coc-blood',
      text: 'text-coc-parchment-dim',
    },
  };

  const styles = variantStyles[variant];

  useEffect(() => {
    if (textRef.current) {
      animateTypewriter(textRef.current, text, () => {
        setIsComplete(true);
        onComplete?.();
      });
    }
  }, [text, onComplete]);

  return (
    <div className={cn('flex gap-3 items-start', className)}>
      {/* 头像 */}
      <div className="w-10 h-10 rounded-full bg-coc-abyss border border-coc-void flex items-center justify-center shrink-0 overflow-hidden">
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <Bot size={20} className="text-coc-parchment-dim" />
        )}
      </div>

      {/* 对话框 */}
      <div
        className={cn(
          'flex-1 rounded-2xl border px-4 py-3',
          'rounded-tl-none',
          styles.bubble
        )}
      >
        <div className={cn('text-sm font-rune mb-1', styles.name)}>
          {name}
        </div>
        <div
          ref={textRef}
          className={cn('text-sm leading-relaxed', styles.text)}
        >
          {!isComplete && (
            <span className="animate-pulse text-coc-gold">| </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 打字机效果 Hook（更灵活的控制）
 */
export function useTypewriter(text: string, speed: number = 30) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setIsTyping(true);
    setIsComplete(false);
    setDisplayText('');

    let index = 0;
    intervalRef.current = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setIsTyping(false);
        setIsComplete(true);
      }
    }, speed);
  }, [text, speed]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsTyping(false);
    setDisplayText(text);
    setIsComplete(true);
  }, [text]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setDisplayText('');
    setIsComplete(false);
    setIsTyping(false);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    displayText,
    isComplete,
    isTyping,
    start,
    stop,
    reset,
  };
}
