import { ChevronDown, ChevronUp, Edit2, Check, X, Wand2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { generateImage } from '../../services/ai.service';

interface SceneCardProps {
  description?: string;
  isKP: boolean;
  onUpdate?: (desc: string) => void;
}

function TypewriterText({ text, speed = 30 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
      } else {
        setDone(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="inline-block w-0.5 h-4 bg-coc-gold/60 ml-0.5 animate-pulse align-text-bottom" />}
    </span>
  );
}

export function SceneCard({ description, isKP, onUpdate }: SceneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(description || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setEditValue(description || '');
  }, [description]);

  const handleSave = () => {
    onUpdate?.(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(description || '');
    setIsEditing(false);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setAiLoading(true);
      const data = await generateImage(aiPrompt.trim(), '1920x1920');
      const imgMarkdown = `![](${data.url})`;
      const newValue = editValue ? `${editValue}\n\n${imgMarkdown}` : imgMarkdown;
      setEditValue(newValue);
      setAiPrompt('');
    } catch (err) {
      alert('生成失败：' + (err as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  if (!description && !isKP) return null;

  return (
    <div className="bg-coc-bg-secondary border border-coc-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-sm text-coc-text-secondary hover:bg-coc-bg-tertiary transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-coc-accent-gold">场景</span>
          {description && !isExpanded && (
            <span className="text-coc-text-muted truncate max-w-[200px]">{description}</span>
          )}
        </span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full coc-input min-h-[80px] text-sm"
                placeholder="描述当前场景..."
                maxLength={3000}
              />
              {isKP && (
                <div className="flex items-center gap-2">
                  <input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="输入画面描述，AI 生成场景图并插入"
                    className="flex-1 px-2 py-1.5 bg-coc-abyss border border-coc-void rounded text-sm text-coc-parchment focus:border-coc-gold focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAiGenerate();
                      }
                    }}
                  />
                  <button
                    onClick={handleAiGenerate}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="px-3 py-1.5 bg-coc-gold text-coc-abyss rounded text-sm font-medium hover:bg-coc-gold-glow disabled:opacity-50"
                  >
                    {aiLoading ? '生成中...' : (<> <Wand2 size={14} /> 生图 </>)}
                  </button>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={handleCancel} className="p-1 text-coc-text-muted hover:text-coc-text-primary">
                  <X size={16} />
                </button>
                <button onClick={handleSave} className="p-1 text-coc-accent-gold hover:text-coc-accent-gold/80">
                  <Check size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <p className="text-sm text-coc-text-primary italic leading-relaxed whitespace-pre-wrap">
                {description ? <TypewriterText text={description} speed={25} /> : '暂无场景描述'}
              </p>
              {isKP && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 text-coc-text-muted hover:text-coc-accent-gold transition-opacity"
                >
                  <Edit2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
