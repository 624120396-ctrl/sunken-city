import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

export interface DialogData {
  speaker: string;
  avatarUrl: string;
  text: string;
  textColor: string;
}

interface StoryDialogBoxProps {
  dialog: DialogData;
  onFinish: () => void;
  className?: string;
  typingSpeed?: number;
}

/**
 * 故事对话框组件 (Layer 4 - UI 层)
 * 固定高度: 220px
 * 打字机速度: 默认 22 字/秒
 * 背景: bg-slate-900/70 backdrop-blur
 */
const StoryDialogBox: React.FC<StoryDialogBoxProps> = ({
  dialog,
  onFinish,
  className,
  typingSpeed = 22
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typeInterval = 1000 / typingSpeed;

  // 打字机效果
  useEffect(() => {
    setDisplayText('');
    currentIndexRef.current = 0;
    setIsTyping(true);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      if (currentIndexRef.current < dialog.text.length) {
        setDisplayText(prev => prev + dialog.text[currentIndexRef.current]);
        currentIndexRef.current += 1;
      } else {
        setIsTyping(false);
        if (timerRef.current) clearInterval(timerRef.current);
        onFinish();
      }
    }, typeInterval);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dialog.text, typingSpeed, onFinish]);

  // 点击跳过打字
  const handleSkip = useCallback(() => {
    if (isTyping) {
      setDisplayText(dialog.text);
      setIsTyping(false);
      if (timerRef.current) clearInterval(timerRef.current);
      onFinish();
    }
  }, [isTyping, dialog.text, onFinish]);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`fixed bottom-0 left-0 right-0 h-[220px] px-8 py-6 bg-slate-900/70 backdrop-blur-md border-t border-white/10 cursor-pointer ${className}`}
      onClick={handleSkip}
    >
      {/* 说话者信息 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-white/80 overflow-hidden bg-slate-700">
          <img 
            src={dialog.avatarUrl} 
            alt={dialog.speaker} 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/avatars/default.png';
            }}
          />
        </div>
        <span className="text-white font-bold text-lg">{dialog.speaker}</span>
      </div>
      
      {/* 对话文本 */}
      <p 
        className="text-xl leading-relaxed min-h-[80px]"
        style={{ color: dialog.textColor || '#ffffff' }}
      >
        {displayText}
        {isTyping && <span className="animate-pulse ml-0.5">|</span>}
      </p>
      
      {/* 继续提示 */}
      {!isTyping && (
        <motion.div 
          className="absolute bottom-4 right-6 text-white/70 text-sm"
          animate={{ y: [0, 4, 0] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          点击继续 ▶
        </motion.div>
      )}
    </motion.div>
  );
};

export default StoryDialogBox;
