import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Home, Store,
  Users, Fish, Sparkles, Crown, Landmark,
  LayoutGrid, Trophy, Scroll, BookOpen,
  Compass, Mail, ClipboardList, HelpCircle,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  keywords: string[];
}

const COMMANDS: CommandItem[] = [
  { id: 'dashboard', label: '首页', path: '/', icon: Home, keywords: ['主页', '首页', '仪表盘', 'dash'] },
  { id: 'rooms', label: '故事书', path: '/rooms', icon: Landmark, keywords: ['故事书', '房间', '大厅', '跑团', 'room'] },
  { id: 'recruitments', label: '招募板', path: '/recruitments', icon: ClipboardList, keywords: ['招募', '找团', '报名', '跑团', 'recruitment'] },
  { id: 'solo', label: '幻影脚本', path: '/solo', icon: Scroll, keywords: ['单人', 'solo', '剧本', '故事'] },
  { id: 'scenarios', label: '剧本列表', path: '/scenarios', icon: BookOpen, keywords: ['剧本', 'scenario', '模组'] },
  { id: 'nameless-market', label: '无名集市', path: '/shop', icon: Store, keywords: ['无名集市', '商店', '背包', '市场', '购买', '交易', '遗物', '道具', 'inventory', 'market', 'shop'] },
  { id: 'fishing', label: '黑水港', path: '/fishing', icon: Fish, keywords: ['钓鱼', '卡牌', 'fishing', '黑水港'] },
  { id: 'dream', label: '溺者之牌', path: '/dream', icon: Sparkles, keywords: ['梦境', '占卜', 'dream', '每日', '溺者'] },
  { id: 'friends', label: '好友', path: '/friends', icon: Users, keywords: ['好友', '朋友', 'friend', '社交'] },
  { id: 'messages', label: '消息中心', path: '/messages', icon: Mail, keywords: ['消息', '私信', '通知', 'message'] },
  { id: 'forum', label: '旧日低语', path: '/forums', icon: LayoutGrid, keywords: ['旧日低语', '论坛', '社区', '讨论', 'forum'] },
  { id: 'titles', label: '印记', path: '/titles', icon: Trophy, keywords: ['印记', '称号', '头衔', 'title', '成就'] },
  { id: 'ranks', label: '位阶', path: '/ranks', icon: Crown, keywords: ['位阶', '等级', 'rank', '段位', '经验'] },
  { id: 'profile', label: '个人资料', path: '/profile', icon: Compass, keywords: ['资料', '档案', 'profile', '设置'] },
  { id: 'help', label: '关于与帮助', path: '/help', icon: HelpCircle, keywords: ['帮助', '关于', '新手', '版本', 'faq', 'help'] },
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
