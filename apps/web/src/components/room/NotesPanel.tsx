import { useState, useEffect } from 'react';
import { Book, Lock, Unlock, Trash2 } from 'lucide-react';

interface Note {
  id: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
}

interface NotesPanelProps {
  roomId: string;
}

export function NotesPanel({ roomId }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // 从localStorage加载笔记
  useEffect(() => {
    const saved = localStorage.getItem(`notes_${roomId}`);
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch {}
    }
  }, [roomId]);

  // 保存到localStorage
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(`notes_${roomId}`, JSON.stringify(notes));
    }
  }, [notes, roomId]);

  const addNote = () => {
    if (!newNote.trim()) return;
    
    const note: Note = {
      id: Date.now().toString(),
      content: newNote.trim(),
      isPrivate,
      createdAt: new Date().toISOString(),
    };
    
    setNotes([note, ...notes]);
    setNewNote('');
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-20 z-30 p-2 bg-black/20 border border-[#3a3a3a]/40 rounded-lg shadow-lg shadow-black/40 hover:bg-black/20 transition-colors"
        title="笔记栏"
      >
        <Book size={20} className="text-[#c9a227]" />
        {notes.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#a63848] rounded-full text-xs flex items-center justify-center">
            {notes.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed right-4 top-20 z-30 w-72 bg-black/20 border border-[#3a3a3a]/40 rounded-lg shadow-xl shadow-black/60">
      <div className="p-3 border-b border-[#3a3a3a]/40 flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <Book size={16} className="text-[#c9a227]" />
          调查笔记
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-[#6b6558] hover:text-[#d4c5a8]"
        >
          ×
        </button>
      </div>
      
      <div className="p-3 space-y-3">
        {/* 添加笔记 */}
        <div className="space-y-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="记录线索、推理、待办..."
            className="w-full h-20 p-2 text-sm bg-black/20 border border-[#3a3a3a]/40 rounded resize-none focus:outline-none focus:border-coc-accent-gold"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) {
                addNote();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                isPrivate 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'bg-black/20 text-coc-text-secondary'
              }`}
            >
              {isPrivate ? <Lock size={12} /> : <Unlock size={12} />}
              {isPrivate ? '仅自己可见' : '对KP可见'}
            </button>
            
            <button
              onClick={addNote}
              disabled={!newNote.trim()}
              className="text-xs px-3 py-1 bg-[#a63848] rounded disabled:opacity-50"
            >
              添加
            </button>
          </div>
        </div>
        
        {/* 笔记列表 */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-sm text-[#6b6558] text-center py-4">
              还没有笔记
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`p-2 rounded text-sm relative group ${
                  note.isPrivate ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-black/20'
                }`}
              >
                <p className="pr-6">{note.content}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-[#6b6558]">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                  {note.isPrivate && (
                    <Lock size={10} className="text-purple-400" />
                  )}
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
