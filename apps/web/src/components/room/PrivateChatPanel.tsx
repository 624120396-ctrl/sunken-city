import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';

interface PrivateMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  receiver: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

interface PrivateChatPanelProps {
  roomId: string;
  members: Array<{
    userId: string;
    nickname: string;
    character?: {
      id: string;
      name: string;
      avatarUrl?: string;
    } | null;
  }>;
  myCharacterId?: string;
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
}

export function PrivateChatPanel({ 
  roomId, 
  members, 
  myCharacterId, 
  isOpen, 
  onClose,
  unreadCount 
}: PrivateChatPanelProps) {
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [selectedReceiverId, setSelectedReceiverId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !myCharacterId) return;

    const fetchMessages = async () => {
      try {
        const response = await apiFetch(`/rooms/${roomId}/private-messages`);
        const data = await handleApiResponse<{ messages: PrivateMessage[] }>(response);
        setMessages(data.messages);
      } catch (error) {
        console.error('获取私聊消息失败:', error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);

    return () => clearInterval(interval);
  }, [roomId, myCharacterId, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !selectedReceiverId) return;

    try {
      const response = await apiFetch(`/rooms/${roomId}/private-messages`, {
        method: 'POST',
        body: JSON.stringify({
          receiverCharacterId: selectedReceiverId,
          content: inputValue.trim(),
        }),
      });
      const data = await handleApiResponse<{ message: PrivateMessage }>(response);
      setMessages(prev => [...prev, data.message]);
      setInputValue('');
    } catch (error) {
      console.error('发送私聊失败:', error);
    }
  };

  const chatableMembers = members.filter(m => m.character?.id !== myCharacterId && m.character);

  const getMessagesWith = (characterId: string) => {
    return messages.filter(m =>
      (m.senderId === myCharacterId && m.receiverId === characterId) ||
      (m.senderId === characterId && m.receiverId === myCharacterId)
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-coc-bg-secondary border-l border-coc-border shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-coc-border">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-coc-accent-gold" />
          <span className="font-bold">私聊</span>
          {unreadCount > 0 && (
            <span className="bg-coc-accent-red text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        <button onClick={onClose} className="text-coc-text-muted hover:text-coc-text-primary">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-24 border-r border-coc-border overflow-y-auto">
          {chatableMembers.map(member => (
            <button
              key={member.character!.id}
              onClick={() => setSelectedReceiverId(member.character!.id)}
              className={`w-full p-2 text-left border-b border-coc-border hover:bg-coc-bg-tertiary transition-colors ${
                selectedReceiverId === member.character!.id ? 'bg-coc-bg-tertiary' : ''
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                {member.character!.avatarUrl ? (
                  <img 
                    src={member.character!.avatarUrl} 
                    alt={member.character!.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-coc-bg-tertiary flex items-center justify-center text-sm">
                    {member.character!.name[0]}
                  </div>
                )}
                <span className="text-xs truncate w-full text-center">{member.character!.name}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col">
          {selectedReceiverId ? (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {getMessagesWith(selectedReceiverId).map(msg => {
                  const isMe = msg.senderId === myCharacterId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                        isMe 
                          ? 'bg-coc-accent-gold/20 text-coc-text-primary' 
                          : 'bg-coc-bg-tertiary text-coc-text-primary'
                      }`}>
                        <p>{msg.content}</p>
                        <span className="text-xs text-coc-text-muted mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-coc-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="flex-1 coc-input text-sm"
                    placeholder="输入私聊内容..."
                    maxLength={200}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="coc-btn-primary px-3"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-coc-text-muted">
              <p className="text-sm">选择左侧成员开始私聊</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
