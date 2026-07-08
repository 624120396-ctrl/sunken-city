import { useMemo, useState, type RefObject } from 'react';
import { Check, Crown, ScrollText, User, X } from 'lucide-react';
import { ClueMarker } from '@components/room/ClueMarker';
import { EmptyIcons, EmptyState } from '@components/ui/EmptyState';
import { StaggerItem, StaggerList } from '@components/ui/Animation';
import { Tooltip } from '@components/ui/Tooltip';
import { getSkillExplanation, getSuccessExplanation } from '@lib/dice-explanations';
import { cn } from '@lib/utils';
import type { RoomChatMessage, RoomGameplayMember } from './RoomGameplayTypes';

interface RoomChatTranscriptProps {
  messages: RoomChatMessage[];
  members: RoomGameplayMember[];
  currentUserId?: string;
  isMobile: boolean;
  canUseKPTools: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  onArchiveImportantMessage: (msg: RoomChatMessage, displayName: string) => void;
  onArchiveKeyDice: (msg: RoomChatMessage, displayName: string) => void;
  onMarkClue: (clue: {
    id: string;
    content: string;
    source: string;
    timestamp: string;
    category?: string;
  }) => void;
}

function getDicePresentation(level: string) {
  const normalized = level.toUpperCase();
  if (level.includes('大成功') || normalized === 'CRITICAL_SUCCESS') {
    return { label: '大成功', tone: 'critical-success' };
  }
  if (level.includes('极难成功') || level.includes('极大成功') || normalized === 'EXTREME_SUCCESS') {
    return { label: level.includes('极大成功') ? '极大成功' : '极难成功', tone: 'extreme-success' };
  }
  if (level.includes('困难成功') || normalized === 'HARD_SUCCESS') {
    return { label: '困难成功', tone: 'hard-success' };
  }
  if ((level.includes('成功') && !level.includes('失败')) || normalized === 'SUCCESS') {
    return { label: '成功', tone: 'success' };
  }
  if (level.includes('大失败') || level.includes('极大失败') || normalized === 'FUMBLE' || normalized === 'EXTREME_FAILURE') {
    return { label: level.includes('极大失败') ? '极大失败' : '大失败', tone: 'fumble' };
  }
  return { label: normalized === 'FAILURE' || normalized === 'FAIL' ? '失败' : level, tone: 'failure' };
}

export function RoomChatTranscript({
  messages,
  members,
  currentUserId,
  isMobile,
  canUseKPTools,
  messagesEndRef,
  onArchiveImportantMessage,
  onArchiveKeyDice,
  onMarkClue,
}: RoomChatTranscriptProps) {
  const [archiveMode, setArchiveMode] = useState(false);
  const [selectedArchiveIds, setSelectedArchiveIds] = useState<Set<string>>(new Set());
  const archivableMessages = useMemo(
    () => messages.filter((message) => message.userId !== 'system' && (message.type === 'text' || message.rollData?.rollResult !== undefined)),
    [messages]
  );
  const selectedArchiveMessages = useMemo(
    () => archivableMessages.filter((message) => selectedArchiveIds.has(message.id)),
    [archivableMessages, selectedArchiveIds]
  );

  const toggleArchiveMode = () => {
    setArchiveMode((enabled) => !enabled);
    setSelectedArchiveIds(new Set());
  };

  const toggleSelectedArchive = (messageId: string) => {
    setSelectedArchiveIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const archiveSelectedMessages = () => {
    selectedArchiveMessages.forEach((message) => {
      const sender = members.find((member) => member.userId === message.userId);
      const displayName = sender?.character?.name || sender?.displayedCharacter?.name || message.nickname;
      if (message.type === 'dice' && message.rollData?.rollResult !== undefined) {
        onArchiveKeyDice(message, displayName);
      } else if (message.type === 'text') {
        onArchiveImportantMessage(message, displayName);
      }
    });
    setSelectedArchiveIds(new Set());
    setArchiveMode(false);
  };

  return (
    <StaggerList
      data-testid="room-message-list"
      className={cn(
        'room-message-list room-chat-v3 flex-1 overflow-y-auto min-h-0',
        isMobile ? 'p-2 space-y-2' : 'p-4 space-y-3'
      )}
      staggerDelay={0.03}
    >
      {canUseKPTools && messages.length > 0 && (
        <div className="room-chat-v3__archive-toolbar">
          <button type="button" onClick={toggleArchiveMode} className="room-chat-v3__archive-toolbar-button">
            {archiveMode ? <X size={13} /> : <ScrollText size={13} />}
            {archiveMode ? '退出选择' : '归档选择'}
          </button>
          {archiveMode && (
            <>
              <span className="room-chat-v3__archive-toolbar-count">已选 {selectedArchiveMessages.length}</span>
              <button
                type="button"
                onClick={() => setSelectedArchiveIds(new Set(archivableMessages.map((message) => message.id)))}
                className="room-chat-v3__archive-toolbar-ghost"
                disabled={archivableMessages.length === 0}
              >
                全选
              </button>
              <button
                type="button"
                onClick={archiveSelectedMessages}
                className="room-chat-v3__archive-toolbar-primary"
                disabled={selectedArchiveMessages.length === 0}
              >
                <Check size={13} />
                归档所选
              </button>
            </>
          )}
        </div>
      )}

      {messages.length === 0 ? (
        <StaggerItem>
          <div className="room-chat-v3__empty">
            <EmptyState
              icon={EmptyIcons.Messages}
              title="还没有消息"
              description="当前案卷还未留下记录。"
              size="sm"
              animate={false}
            />
          </div>
        </StaggerItem>
      ) : (
        messages.map((msg) => {
          const isSystem = msg.userId === 'system';
          const isMe = msg.userId === currentUserId;
          const sender = members.find((member) => member.userId === msg.userId);
          const isKPMessage = sender?.role === 'KP';
          const displayName = sender?.character?.name || sender?.displayedCharacter?.name || msg.nickname;
          const canArchiveMessage = canUseKPTools && (msg.type === 'text' || msg.rollData?.rollResult !== undefined);
          const isArchiveSelected = selectedArchiveIds.has(msg.id);
          const hasSidePanel = archiveMode || (msg.type === 'dice' && msg.rollData?.successLevel);
          const dicePresentation = msg.rollData?.successLevel ? getDicePresentation(msg.rollData.successLevel) : null;
          const isPrivate = msg.type === 'private';
          const privateLabel = isPrivate
            ? msg.privateMeta?.targetUserId === currentUserId
              ? '私聊给我'
              : `私聊给 ${msg.privateMeta?.targetNickname || '对方'}`
            : '';

          if (isSystem) {
            return (
              <StaggerItem key={msg.id}>
                <div className="room-chat-v3__system-wrap">
                  <div className={cn('room-system-message room-chat-v3__system', isMobile ? 'px-2 py-2' : 'px-5 py-3')}>
                    <span>{msg.content}</span>
                    <span className="room-chat-v3__system-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </StaggerItem>
            );
          }

          return (
            <StaggerItem key={msg.id}>
              <article
                className={cn('room-chat-v3__row', isMobile ? 'gap-2' : 'gap-3')}
                data-message-kind={msg.type}
                data-own-message={isMe ? 'true' : 'false'}
                data-kp-message={isKPMessage ? 'true' : 'false'}
                data-archive-mode={archiveMode ? 'true' : 'false'}
                data-archive-selected={isArchiveSelected ? 'true' : 'false'}
                data-has-side={hasSidePanel ? 'true' : 'false'}
                data-private-message={isPrivate ? 'true' : 'false'}
                onContextMenu={(event) => {
                  if (!canArchiveMessage) return;
                  event.preventDefault();
                  setArchiveMode(true);
                  toggleSelectedArchive(msg.id);
                }}
              >
                <div className={cn('room-chat-v3__avatar', isMobile ? 'h-8 w-8' : 'h-10 w-10')}>
                  {sender?.avatarUrl ? (
                    <img src={sender.avatarUrl} className="h-full w-full rounded-full object-cover" alt="" />
                  ) : (
                    <User size={isMobile ? 16 : 19} />
                  )}
                </div>

                <div className={cn('room-message-bubble room-chat-v3__record', isMobile ? 'px-3 py-2' : 'px-4 py-3')}>
                  <div className="room-chat-v3__main">
                    <header className="room-chat-v3__record-header">
                      <span className="room-chat-v3__sender">
                        {isKPMessage && <Crown size={14} />}
                        {displayName}
                        {isMe && <span className="room-chat-v3__self">我</span>}
                        {isPrivate && <span className="room-chat-v3__private-tag">{privateLabel}</span>}
                      </span>
                      <Tooltip content={new Date(msg.timestamp).toLocaleString()}>
                        <time className="room-chat-v3__time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </Tooltip>
                    </header>

                    <p className="room-chat-v3__content">{msg.content}</p>
                  </div>

                  {hasSidePanel && (
                    <aside className="room-chat-v3__side" aria-label="消息操作">
                      {msg.type === 'dice' && msg.rollData?.successLevel && (
                        <div className="room-chat-v3__dice-detail" data-result-tone={dicePresentation?.tone}>
                          <span className="room-chat-v3__dice-type">
                            {msg.rollData.targetName || '1d100'}
                          </span>
                          <span className="room-chat-v3__dice-result">
                            {msg.rollData.rollResult ?? '-'}
                          </span>
                          <Tooltip content={getSuccessExplanation(msg.rollData.successLevel)}>
                            <span className="room-chat-v3__dice-success">
                              {dicePresentation?.label || msg.rollData.successLevel}
                            </span>
                          </Tooltip>
                          {msg.rollData.targetName && (
                            <span className="room-chat-v3__dice-note">
                              {getSkillExplanation(msg.rollData.targetName)}
                            </span>
                          )}
                        </div>
                      )}

                      {archiveMode && canArchiveMessage && (
                        <button
                          type="button"
                          onClick={() => toggleSelectedArchive(msg.id)}
                          className="room-chat-v3__archive-select"
                          aria-pressed={isArchiveSelected}
                          aria-label={isArchiveSelected ? '取消选择归档消息' : '选择归档消息'}
                        >
                          {isArchiveSelected && <Check size={13} />}
                        </button>
                      )}
                    </aside>
                  )}

                  {msg.type === 'text' && (
                    <div className="room-chat-v3__clue-marker">
                      <ClueMarker
                        messageId={msg.id}
                        messageContent={msg.content}
                        nickname={displayName}
                        timestamp={msg.timestamp}
                        onMarkAsClue={onMarkClue}
                      />
                    </div>
                  )}
                </div>
              </article>
            </StaggerItem>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </StaggerList>
  );
}
