import { useState, useEffect } from 'react';
import { X, Crown, Sparkles } from 'lucide-react';
import { RuneBorder } from '@components/ui/RuneBorder';
import type { Rank } from '@services/rank-title.service';

interface RankEditModalProps {
  rank: Rank | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Rank>) => void;
}

export function RankEditModal({ rank, isOpen, onClose, onSave }: RankEditModalProps) {
  const [formData, setFormData] = useState<Partial<Rank>>({
    name: '',
    expRequired: 0,
    description: '',
    icon: '',
    color: '#c9a227',
    privileges: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (rank) {
      setFormData({
        name: rank.name,
        expRequired: rank.expRequired,
        description: rank.description,
        icon: rank.icon,
        color: rank.color,
        privileges: rank.privileges || [],
      });
    }
  }, [rank]);

  if (!isOpen || !rank) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4">
        <RuneBorder variant="gold" intensity="strong">
          <div className="coc-bg-parchment p-6">
            {/* 头部 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-coc-gold" />
                <h2 className="text-xl font-ritual font-bold text-coc-parchment">
                  编辑位阶
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-coc-parchment-dim hover:text-coc-parchment transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* 预览 */}
            <div className="mb-6 p-4 bg-coc-abyss rounded-lg text-center">
              <span className="text-3xl mr-2">{formData.icon}</span>
              <span className="text-lg font-ritual" style={{ color: formData.color }}>
                {formData.name || '位阶名称'}
              </span>
              <p className="text-sm text-coc-parchment-dim mt-1">
                Lv.{rank.level} · 需要 {formData.expRequired} SP
              </p>
            </div>

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                  位阶名称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
                  placeholder="例如：深渊潜行者"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                    所需 SP
                  </label>
                  <input
                    type="number"
                    value={formData.expRequired}
                    onChange={(e) => setFormData({ ...formData, expRequired: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                    图标
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none"
                    placeholder="例如：🌊"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                  主题色
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 bg-coc-abyss border border-coc-void rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none font-mono"
                    placeholder="#c9a227"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                  位阶描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none resize-none"
                  rows={3}
                  placeholder="描述这个位阶的含义..."
                />
              </div>

              <div>
                <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                  特权 (每行一个)
                </label>
                <textarea
                  value={formData.privileges?.join('\n') || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    privileges: e.target.value.split('\n').filter(p => p.trim()) 
                  })}
                  className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-gold focus:outline-none resize-none"
                  rows={2}
                  placeholder="例如：每日额外获得10 SP"
                />
              </div>

              {/* 按钮 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-coc-void text-coc-parchment rounded hover:bg-coc-void/80 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-coc-gold text-coc-abyss rounded hover:bg-coc-gold-glow transition-colors font-medium disabled:opacity-50"
                >
                  <Sparkles className="inline-block w-4 h-4 mr-2" />
                  {isSubmitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </RuneBorder>
      </div>
    </div>
  );
}
