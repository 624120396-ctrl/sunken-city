import { Loader2 } from 'lucide-react';

interface AiNarrationBlockProps {
  fallbackText: string;
  aiText?: string | null;
  isLoading?: boolean;
  corruption?: number;
}

export function AiNarrationBlock({
  fallbackText,
  aiText,
  isLoading = false,
  corruption = 0,
}: AiNarrationBlockProps) {
  const textColorClass =
    corruption >= 50
      ? 'text-rose-300/90 animate-pulse [--tw-pulse-opacity:0.2]'
      : 'text-slate-100';

  return (
    <div className="relative">
      {isLoading && (
        <Loader2 className="absolute top-0 right-0 w-3 h-3 animate-spin text-slate-400/70 z-10" />
      )}

      <div className="relative min-h-[1.5em]">
        <p
          className={`whitespace-pre-wrap transition-opacity duration-500 ${textColorClass} ${
            aiText ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {fallbackText}
        </p>
        {aiText && (
          <p
            className={`absolute inset-0 whitespace-pre-wrap transition-opacity duration-500 ${textColorClass}`}
          >
            {aiText}
          </p>
        )}
      </div>
    </div>
  );
}
