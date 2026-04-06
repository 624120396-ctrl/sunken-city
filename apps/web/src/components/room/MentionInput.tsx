import { useState, useRef } from 'react';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  members: Array<{ userId: string; nickname: string }>;
  onSubmit: (e?: React.FormEvent) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MentionInput({ 
  value, 
  onChange, 
  members, 
  onSubmit, 
  placeholder = "输入消息...", 
  disabled 
}: MentionInputProps) {
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart || 0;
    onChange(newValue);
    setCursorPosition(position);

    // 检查是否在输入 @
    const beforeCursor = newValue.slice(0, position);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.slice(lastAtIndex + 1);
      // 如果 @ 后面没有空格，显示提及列表
      if (!afterAt.includes(' ')) {
        setMentionFilter(afterAt.toLowerCase());
        setShowMentionList(true);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }
  };

  const handleMentionSelect = (nickname: string) => {
    const beforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    const beforeAt = value.slice(0, lastAtIndex);
    const afterCursor = value.slice(cursorPosition);
    
    const newValue = `${beforeAt}@${nickname} ${afterCursor}`;
    onChange(newValue);
    setShowMentionList(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent);
    }
  };

  // 过滤成员列表
  const filteredMembers = members.filter(m => 
    m.nickname.toLowerCase().includes(mentionFilter)
  );

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-full coc-input"
        placeholder={placeholder}
        disabled={disabled}
      />
      
      {showMentionList && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-48 bg-coc-bg-secondary border border-coc-border rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
          {filteredMembers.map((member) => (
            <button
              key={member.userId}
              type="button"
              onClick={() => handleMentionSelect(member.nickname)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-coc-bg-tertiary transition-colors"
            >
              <span className="text-coc-accent-gold">@</span>{member.nickname}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
