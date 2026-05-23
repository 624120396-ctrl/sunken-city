import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Home, Store, ShoppingBag,
  Users, Fish, Sparkles, Backpack, Crown, Landmark,
  Map, HelpCircle, LayoutGrid, Trophy, Scroll, BookOpen,
  Compass, Mail,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  keywords: string[];
}

const COMMANDS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: Home, keywords: ['主页', '首页', '仪表盘', 'dash'] },
  { id: 'rooms', label: '房间大厅', path: '/rooms', icon: Landmark, keywords: ['房间', '大厅', '跑团', 'room'] },
  { id: 'solo', label: '幻影脚本', path: '/solo', icon: Scroll, keywords: ['单人', 'solo', '剧本', '故事'] },
  { id: 'scenarios', label: '剧本列表', path: '/scenarios', icon: BookOpen, keywords: ['剧本', 'scenario', '模组'] },
  { id: 'market', label: '遗物市场', path: '/market', icon: Store, keywords: ['市场', '交易', '遗物', 'market'] },
  { id: 'shop', label: '拉莱耶遗珍', path: '/shop', icon: ShoppingBag, keywords: ['商店', '购买', 'shop', '遗珍'] },
  { id: 'inventory', label: '背包', path: '/inventory', icon: Backpack, keywords: ['背包', '物品', 'inventory', '道具'] },
  { id: 'fishing', label: '溺者之牌', path: '/fishing', icon: Fish, keywords: ['钓鱼', '卡牌', 'fishing', '溺者'] },
  { id: 'dream', label: '梦境占卜', path: '/dream', icon: Sparkles, keywords: ['梦境', '占卜', 'dream', '每日'] },
  { id: 'friends', label: '好友', path: '/friends', icon: Users, keywords: ['好友', '朋友', 'friend', '社交'] },
  { id: 'messages', label: '消息中心', path: '/messages', icon: Mail, keywords: ['消息', '私信', '通知', 'message'] },
  { id: 'forum', label: '论坛', path: '/forums', icon: LayoutGrid, keywords: ['论坛', '社区', '讨论', 'forum'] },
  { id: 'titles', label: '称号', path: '/titles', icon: Trophy, keywords: ['称号', '头衔', 'title', '成就'] },
  { id: 'ranks', label: '等级', path: '/ranks', icon: Crown, keywords: ['等级', ' rank', '段位', '经验'] },
  { id: 'world', label: '世界地图', path: '/world', icon: Map, keywords: ['地图', '世界', 'world', '探索'] },
  { id: 'profile', label: '个人资料', path: '/profile', icon: Compass, keywords: ['资料', '档案', 'profile', '设置'] },
  { id: 'help', label: '帮助', path: '/help', icon: HelpCircle, keywords: ['帮助', '指南', 'help', '教程'] },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = query.trim()
    ? COMMANDS.filter((cmd) =>
        [cmd.label, ...cmd.keywords].some((k) =>
          k.toLowerCase().includes(query.toLowerCase())
        )
      )
    : COMMANDS;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      navigate(item.path);
      setIsOpen(false);
      setQuery('');
    },
    [navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] overlay-layer-3">
      <div className="modal-layer-3 w-full max-w-lg mx-4 overflow-hidden">
        {/* 搜索头 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-coc-border/60">
          <Search size={18} className="text-coc-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索页面… (支持中英文)"
            className="flex-1 bg-transparent text-sm text-coc-text-primary placeholder:text-coc-text-muted outline-none"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-coc-border/30 text-coc-text-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 结果列表 */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-coc-text-muted">
              未找到匹配页面
            </div>
          ) : (
            filtered.map((cmd, index) => {
              const Icon = cmd.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-coc-gold/10 text-coc-gold'
                      : 'text-coc-text-primary hover:bg-coc-bg-elevated'
                  }`}
                >
                  <Icon size={16} className={isSelected ? 'text-coc-gold' : 'text-coc-text-muted'} />
                  <span className="flex-1">{cmd.label}</span>
                  <span className="text-xs text-coc-text-muted">
                    {cmd.keywords.slice(0, 2).join(' · ')}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-4 py-2 border-t border-coc-border/60 text-xs text-coc-text-muted flex items-center gap-4">
          <span>↑↓ 选择</span>
          <span>↵ 跳转</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
