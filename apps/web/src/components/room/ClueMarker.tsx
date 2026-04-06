import { useState } from 'react';
import { Bookmark, X, Search } from 'lucide-react';

interface Clue {
  id: string;
  content: string;
  source: string;
  timestamp: string;
  category?: string;
}

interface ClueMarkerProps {
  messageId: string;
  messageContent: string;
  nickname: string;
  timestamp: string;
  onMarkAsClue: (clue: Clue) => void;
}

const categories = [
  { id: 'person', name: '人物', color: 'text-blue-400' },
  { id: 'place', name: '地点', color: 'text-green-400' },
  { id: 'item', name: '物品', color: 'text-yellow-400' },
  { id: 'event', name: '事件', color: 'text-red-400' },
  { id: 'myth', name: '神话', color: 'text-purple-400' },
];

export function ClueMarker({ messageId, messageContent, nickname, timestamp, onMarkAsClue }: ClueMarkerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('person');
  const [customNote, setCustomNote] = useState('');

  const handleMark = () => {
    const category = categories.find(c => c.id === selectedCategory);
    const clue: Clue = {
      id: messageId,
      content: customNote || messageContent,
      source: nickname,
      timestamp,
      category: category?.name,
    };
    onMarkAsClue(clue);
    setIsOpen(false);
    setCustomNote('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="opacity-0 group-hover:opacity-100 text-coc-accent-gold hover:text-yellow-300 transition-opacity"
        title="标记为线索"
      >
        <Bookmark size={14} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 w-64 bg-coc-bg-secondary border border-coc-border rounded-lg shadow-xl p-3"
            style={{ top: '100%', right: 0 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-1">
                <Search size={14} className="text-coc-accent-gold" />
                标记为线索
              </span>
              <button onClick={() => setIsOpen(false)} className="text-coc-text-muted">
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-coc-text-muted mb-2 line-clamp-2">
              {messageContent}
            </p>

            <div className="flex gap-1 flex-wrap mb-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-xs px-2 py-1 rounded ${
                    selectedCategory === cat.id
                      ? 'bg-coc-accent-gold text-black'
                      : 'bg-coc-bg-tertiary ' + cat.color
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="添加备注（可选）"
              className="w-full text-xs p-2 bg-coc-bg-tertiary border border-coc-border rounded mb-2"
            />

            <button
              onClick={handleMark}
              className="w-full text-xs py-1.5 bg-coc-accent-gold text-black rounded hover:bg-yellow-400"
            >
              确认标记
            </button>
          </div>
        </>
      )}
    </>
  );
}

// 线索板组件
interface ClueBoardProps {
  roomId: string;
  clues?: Clue[];
  onAddClue?: (clue: Clue) => void;
}

export function ClueBoard({ roomId, clues: externalClues, onAddClue: externalAddClue }: ClueBoardProps) {
  const [internalClues, setInternalClues] = useState<Clue[]>(() => {
    const saved = localStorage.getItem(`clues_${roomId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const clues = externalClues !== undefined ? externalClues : internalClues;

  // @ts-ignore - addClue is exported for parent component usage
  const addClue = (clue: Clue) => {
    if (externalAddClue) {
      externalAddClue(clue);
    } else {
      const newClues = [clue, ...internalClues];
      setInternalClues(newClues);
      localStorage.setItem(`clues_${roomId}`, JSON.stringify(newClues));
    }
  };

  const removeClue = (id: string) => {
    const newClues = clues.filter(c => c.id !== id);
    if (externalClues === undefined) {
      setInternalClues(newClues);
      localStorage.setItem(`clues_${roomId}`, JSON.stringify(newClues));
    }
  };

  const filteredClues = filter
    ? clues.filter(c => c.category === filter)
    : clues;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-32 z-30 p-2 bg-coc-bg-secondary border border-coc-border rounded-lg shadow-lg hover:bg-coc-bg-tertiary transition-colors"
        title="线索板"
      >
        <Search size={20} className="text-coc-accent-red" />
        {clues.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-coc-accent-red rounded-full text-xs flex items-center justify-center">
            {clues.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed right-4 top-32 z-30 w-80 bg-coc-bg-secondary border border-coc-border rounded-lg shadow-xl">
      <div className="p-3 border-b border-coc-border flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <Search size={16} className="text-coc-accent-red" />
          线索板
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-coc-text-muted hover:text-coc-text-primary"
        >
          ×
        </button>
      </div>

      <div className="p-3">
        {/* 分类筛选 */}
        <div className="flex gap-1 flex-wrap mb-3">
          <button
            onClick={() => setFilter(null)}
            className={`text-xs px-2 py-1 rounded ${
              filter === null ? 'bg-coc-accent-gold text-black' : 'bg-coc-bg-tertiary'
            }`}
          >
            全部 ({clues.length})
          </button>
          {categories.map(cat => {
            const count = clues.filter(c => c.category === cat.name).length;
            return (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.name)}
                className={`text-xs px-2 py-1 rounded ${
                  filter === cat.name ? 'bg-coc-accent-gold text-black' : 'bg-coc-bg-tertiary ' + cat.color
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* 线索列表 */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredClues.length === 0 ? (
            <p className="text-sm text-coc-text-muted text-center py-4">
              还没有线索
              <br />
              <span className="text-xs">右键点击消息或点击书签图标标记</span>
            </p>
          ) : (
            filteredClues.map((clue) => (
              <div
                key={clue.id}
                className="p-2 bg-coc-bg-tertiary rounded text-sm group relative"
              >
                <div className="flex items-start justify-between">
                  <p className="flex-1 pr-2">{clue.content}</p>
                  <button
                    onClick={() => removeClue(clue.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-coc-text-muted">
                  <span className={categories.find(c => c.name === clue.category)?.color}>
                    {clue.category}
                  </span>
                  <span>·</span>
                  <span>{clue.source}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
