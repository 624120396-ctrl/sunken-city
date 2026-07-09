import { useEffect, useState } from 'react';

interface StoryDialogBoxProps {
  text: string;
  speaker?: string;
  subText?: string;
  className?: string;
}

export function StoryDialogBox({ text, speaker, subText, className = '' }: StoryDialogBoxProps) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
      }
    }, 18);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <div
      className={`solo-dialog-box relative rounded-t-2xl rounded-br-2xl rounded-bl-md border border-white/10 bg-black/60 backdrop-blur px-5 py-4 ${className}`}
    >
      {speaker && (
        <div className="text-xs font-semibold tracking-wider text-amber-400 mb-1">{speaker}</div>
      )}
      <div className="text-sm leading-7 text-slate-100 whitespace-pre-wrap min-h-[3rem]">
        {displayed}
        <span className="inline-block w-0.5 h-4 bg-amber-400 ml-0.5 align-middle animate-pulse" />
      </div>
      {subText && (
        <div className="mt-2 text-xs italic text-slate-400 border-l-2 border-slate-600 pl-3">
          {subText}
        </div>
      )}
    </div>
  );
}
