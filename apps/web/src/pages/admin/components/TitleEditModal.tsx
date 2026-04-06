import { useState, useEffect } from 'react';
import { X, Award, Sparkles } from 'lucide-react';
import { RuneBorder } from '@components/ui/RuneBorder';
import type { Title } from '@services/rank-title.service';

interface TitleEditModalProps {
  title: Title | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Title>) => void;
}

const CATEGORIES = [
  { value: 'exploration', label: '探索' },
  { value: 'combat', label: '战斗' },
  { value: 'social', label: '社交' },
  { value: 'madness', label: '疯狂' },
  { value: 'special', label: '特殊' },
  { value: 'hidden', label: '隐藏' },
];

const RARITIES = [
  { value: 'common', label: '普通', color: '#a69b85' },
  { value: 'rare', label: '稀有', color: '#c9a227' },
  { value: 'epic', label: '史诗', color: '#8b2635' },
  { value: 'legendary', label: '传说', color: '#6b4c7a' },
  { value: 'mythical', label: '神话', color: '#e8d4a0' },
];

export function TitleEditModal({ title, isOpen, onClose, onSave }: TitleEditModalProps) {
  const [formData, setFormData] = useState<Partial<Title>>({
    name: '',
    key: '',
    description: '',
    category: 'exploration',
    rarity: 'common',
    condition: '',
    expReward: 0,
    icon: '',
    color: '#a69b85',
    hint: '',
    isHidden: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (title) {
      setFormData({
        name: title.name,
        key: title.key,
        description: title.description,
        category: title.category,
        rarity: title.rarity,
        condition: title.condition,
        expReward: title.expReward,
        icon: title.icon,
        color: title.color,
        hint: title.hint || '',
        isHidden: title.isHidden,
      });
    }
  }, [title]);

  if (!isOpen || !title) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    return RARITIES.find(r => r.value === rarity)?.color || '#a69b85';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4">
        <RuneBorder variant="madness" intensity="strong">
          <div className="coc-bg-parchment p-6 max-h-[85vh] overflow-y-auto">
            {/* 头部 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-coc-madness-glow" />
                <h2 className="text-xl font-ritual font-bold text-coc-parchment">
                  编辑印记
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
              <span 
                className="text-lg font-ritual" 
                style={{ color: formData.color }}
              >
                {formData.name || '印记名称'}
              </span>
              <div className="flex justify-center gap-2 mt-2">
                <span 
                  className="px-2 py-0.5 text-xs rounded"
                  style={{ 
                    backgroundColor: `${getRarityColor(formData.rarity || 'common')}20`,
                    color: getRarityColor(formData.rarity || 'common')
                  }}
                >
                  {RARITIES.find(r => r.value === formData.rarity)?.label}
                </span>
                <span className="px-2 py-0.5 text-xs rounded bg-coc-void text-coc-parchment-dim">
                  {CATEGORIES.find(c => c.value === formData.category)?.label}
                </span>
                {formData.isHidden && (
                  <span className="px-2 py-0.5 text-xs rounded bg-coc-madness/30 text-coc-madness-glow">
                    隐藏
                  </span>
                )}
              </div>
            </div>

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                    印记名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-madness focus:outline-none"
                    placeholder="例如：深渊行者"
                  />
                </div>

                <div>
                  <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                    标识键
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-madness focus:outline-none font-mono"
                    placeholder="例如：abyss_walker"
                    disabled={!!title.id}
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
                    className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-madness focus:outline-none"
                    placeholder="例如：🌊"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                    分类
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-madness focus:outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                    稀有度
                  </label>
                  <select
                    value={formData.rarity}
                    onChange={(e) => {
                      const rarity = e.target.value;
                      setFormData({ 
                        ...formData, 
                        rarity: rarity as any,
                        color: getRarityColor(rarity)
                      });
                    }}
                    className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-madness focus:outline-none"
                  >
                    {RARITIES.map(rar => (
                      <option key={rar.value} value={rar.value}>{rar.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                      className="flex-1 px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-madness focus:outline-none font-mono"
                      placeholder="#c9a227"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                    SP 奖励
                  </label>
                  <input
                    type="number"
                    value={formData.expReward}
                    onChange={(e) => setFormData({ ...formData, expReward: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-madness focus:outline-none"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                  解锁条件
                </label>
                <input
                  type="text"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-madness focus:outline-none"
                  placeholder="例如：完成10场跑团"
                />
              </div>

              <div>
                <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                  印记描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-madness focus:outline-none resize-none"
                  rows={2}
                  placeholder="描述这个印记的含义..."
                />
              </div>

              <div>
                <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">
                  提示文本 (隐藏类印记)
                </label>
                <textarea
                  value={formData.hint || ''}
                  onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                  className="w-full px-3 py-2 bg-coc-abyss border border-coc-void rounded text-coc-parchment focus:border-coc-madness focus:outline-none resize-none"
                  rows={2}
                  placeholder="隐藏类印记的模糊提示..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isHidden"
                  checked={formData.isHidden}
                  onChange={(e) => setFormData({ ...formData, isHidden: e.target.checked })}
                  className="w-4 h-4 bg-coc-abyss border-coc-void rounded"
                />
                <label htmlFor="isHidden" className="text-sm text-coc-parchment-dim">
                  隐藏印记 (不解锁前不可见)
                </label>
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
                  className="flex-1 px-4 py-2 bg-coc-madness text-coc-parchment rounded hover:bg-coc-madness-glow transition-colors font-medium disabled:opacity-50"
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
