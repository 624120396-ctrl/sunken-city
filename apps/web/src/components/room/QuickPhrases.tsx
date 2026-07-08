import { useState } from 'react';

interface QuickPhrasesProps {
  onSelect: (phrase: string) => void;
}

const phrases = [
  { category: '常用', items: ['/骰 侦查', '/骰 聆听', '/骰 心理学', '/状态'] },
  { category: '动作', items: ['我检查周围', '我仔细倾听', '我试图说服他', '我攻击', '我逃跑'] },
  { category: '询问', items: ['我可以投骰吗？', 'KP，这是什么？', '现在是什么情况？'] },
  { category: '角色扮演', items: ['（紧张地）', '（冷静地）', '（愤怒地）', '（害怕地）'] },
];

export function QuickPhrases({ onSelect }: QuickPhrasesProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm text-coc-text-secondary hover:text-coc-accent-red transition-colors"
      >
        快捷短语
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-coc-bg-secondary border border-coc-border rounded-lg shadow-xl z-50 p-2">
            {phrases.map((group) => (
              <div key={group.category} className="mb-2">
                <div className="text-xs text-coc-text-muted px-2 py-1">{group.category}</div>
                <div className="flex flex-wrap gap-1">
                  {group.items.map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => {
                        onSelect(phrase);
                        setIsOpen(false);
                      }}
                      className="text-xs px-2 py-1 bg-coc-bg-tertiary rounded hover:bg-coc-accent-red/20 transition-colors"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
