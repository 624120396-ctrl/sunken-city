import { useEffect, useState } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number; // 毫秒/字
  onComplete?: () => void;
  className?: string;
}

export function TypewriterText({ text, speed = 50, onComplete, className }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        onComplete?.();
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <span className="animate-pulse text-coc-accent-gold">|</span>
      )}
    </span>
  );
}

// 打字机消息组件（用于聊天）
interface TypewriterMessageProps {
  content: string;
  speed?: number;
  className?: string;
}

export function TypewriterMessage({ content, speed = 30, className }: TypewriterMessageProps) {
  const [showTypewriter, setShowTypewriter] = useState(true);

  // 点击跳过打字效果
  const handleSkip = () => {
    setShowTypewriter(false);
  };

  if (!showTypewriter) {
    return <span className={className}>{content}</span>;
  }

  return (
    <span onClick={handleSkip} className={`cursor-pointer ${className}`}>
      <TypewriterText 
        text={content} 
        speed={speed} 
        onComplete={() => setShowTypewriter(false)}
      />
    </span>
  );
}

// 打字机模式开关
export function useTypewriterMode() {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('coc-typewriter-mode');
    return saved ? JSON.parse(saved) : false;
  });

  const toggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    localStorage.setItem('coc-typewriter-mode', JSON.stringify(newValue));
  };

  return { enabled, toggle };
}
