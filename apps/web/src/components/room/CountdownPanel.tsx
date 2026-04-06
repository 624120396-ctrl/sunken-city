import { useState } from 'react';
import { Clock, Square, Plus } from 'lucide-react';
import { Modal } from '@components/ui/Modal';

interface CountdownTimer {
  id: string;
  title: string;
  duration: number;
  remaining: number;
  isActive: boolean;
}

interface CountdownPanelProps {
  countdowns: CountdownTimer[];
  isKP: boolean;
  onCreate?: (title: string, duration: number) => void;
  onStop?: (id: string) => void;
}

export function CountdownPanel({ countdowns, isKP, onCreate, onStop }: CountdownPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(5);

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreate?.(title.trim(), minutes * 60);
    setShowCreate(false);
    setTitle('');
    setMinutes(5);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (countdowns.length === 0 && !isKP) return null;

  return (
    <>
      <div className="space-y-2">
        {countdowns.map(cd => (
          <div
            key={cd.id}
            className={`flex items-center justify-between px-3 py-2 rounded border ${
              cd.remaining < 60
                ? 'bg-coc-accent-red/10 border-coc-accent-red animate-pulse'
                : 'bg-coc-bg-secondary border-coc-border'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock size={16} className={cd.remaining < 60 ? 'text-coc-accent-red' : 'text-coc-accent-gold'} />
              <span className="text-sm font-medium">{cd.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-mono ${cd.remaining < 60 ? 'text-coc-accent-red' : 'text-coc-text-primary'}`}>
                {formatTime(cd.remaining)}
              </span>
              {isKP && cd.isActive && (
                <button
                  onClick={() => onStop?.(cd.id)}
                  className="p-1 text-coc-text-muted hover:text-coc-accent-red"
                >
                  <Square size={14} />
                </button>
              )}
            </div>
          </div>
        ))}

        {isKP && (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-2 border border-dashed border-coc-border rounded text-sm text-coc-text-muted hover:text-coc-accent-gold hover:border-coc-accent-gold transition-colors flex items-center justify-center gap-1"
          >
            <Plus size={14} />
            添加倒计时
          </button>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="创建倒计时">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：炸弹将在..."
              className="w-full coc-input"
              maxLength={30}
            />
          </div>
          <div>
            <label className="block text-sm text-coc-text-secondary mb-1">时长（分钟）</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={30}
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-center font-mono">{minutes}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreate(false)}
              className="coc-btn-secondary flex-1"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim()}
              className="coc-btn-primary flex-1 disabled:opacity-50"
            >
              开始
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
