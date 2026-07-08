import type { FormEvent } from 'react';
import { ChevronDown, ChevronUp, Dice5, Send } from 'lucide-react';
import { MentionInput } from '@components/room/MentionInput';
import { QuickPhrases } from '@components/room/QuickPhrases';
import { cn } from '@lib/utils';
import type { RoomGameplayMember } from './RoomGameplayTypes';

interface RoomChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  members: RoomGameplayMember[];
  currentUserId?: string;
  connected: boolean;
  isMobile: boolean;
  showChatTools: boolean;
  setShowChatTools: (visible: boolean | ((visible: boolean) => boolean)) => void;
  hasSelectedCharacter: boolean;
  showMobileQuickRolls: boolean;
  setShowMobileQuickRolls: (visible: boolean | ((visible: boolean) => boolean)) => void;
  canUseKPTools: boolean;
  canSendPrivateMessage: boolean;
  sendTargetUserId: string;
  onSendTargetChange: (value: string) => void;
  onOpenSanityModal: () => void;
  onSubmit: (event?: FormEvent) => void;
}

export function RoomChatComposer({
  value,
  onChange,
  members,
  currentUserId,
  connected,
  isMobile,
  showChatTools,
  setShowChatTools,
  hasSelectedCharacter,
  showMobileQuickRolls,
  setShowMobileQuickRolls,
  canUseKPTools,
  canSendPrivateMessage,
  sendTargetUserId,
  onSendTargetChange,
  onOpenSanityModal,
  onSubmit,
}: RoomChatComposerProps) {
  const privateTargets = members
    .filter((member) => member.userId !== currentUserId && (member.role === 'KP' || member.role === 'PLAYER'))
    .map((member) => {
      const character = member.character || member.displayedCharacter;
      return {
        userId: member.userId,
        label: character?.name || member.nickname,
        role: member.role === 'KP' ? '守密人' : '调查员',
      };
    });
  const hasPrivateTargets = canSendPrivateMessage && privateTargets.length > 0;

  const insertDiceCommand = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onChange('/骰 ');
      return;
    }
    if (trimmed.startsWith('/骰')) return;
    onChange(`${value}${value.endsWith(' ') ? '' : ' '}/骰 `);
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        'room-chat-composer room-chat-composer-v3 flex-shrink-0',
        canUseKPTools ? 'room-chat-composer-v3--keeper' : 'room-chat-composer-v3--player',
        hasPrivateTargets && 'room-chat-composer-v3--has-target',
        isMobile ? 'p-2' : 'space-y-2 p-4'
      )}
    >
      {(!isMobile || showChatTools) && (
        <div
          data-testid="room-chat-tools-row"
          className={cn('room-chat-composer-v3__tools', isMobile && 'pb-1')}
        >
          <div className="room-chat-composer-v3__tool-group">
            {showChatTools && (
              <>
                <QuickPhrases onSelect={(phrase) => onChange(value + phrase)} />
                {canUseKPTools && (
                  <button
                    type="button"
                    onClick={onOpenSanityModal}
                    disabled={!connected}
                    className="room-chat-danger-action px-2 py-1 rounded text-xs border transition-colors"
                  >
                    理智侵蚀
                  </button>
                )}
              </>
            )}
          </div>
          {!isMobile && (
            <button
              type="button"
              onClick={() => setShowChatTools(!showChatTools)}
              className="room-chat-composer-v3__fold"
              title={showChatTools ? '收起工具' : '展开工具'}
            >
              {showChatTools ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      )}

      <div className={cn('room-chat-composer-v3__input-row', isMobile && 'items-center')}>
        {isMobile && (
          <button
            type="button"
            data-testid="room-chat-tools-toggle"
            onClick={() => setShowChatTools(!showChatTools)}
            className={cn('room-chat-composer-v3__icon-button', showChatTools && 'room-chat-composer-v3__icon-button--active')}
            title={showChatTools ? '收起工具' : '展开工具'}
            aria-label={showChatTools ? '收起聊天工具' : '展开聊天工具'}
          >
            {showChatTools ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        {isMobile && hasSelectedCharacter && (
          <button
            type="button"
            data-testid="room-mobile-quick-roll-toggle"
            onClick={() => setShowMobileQuickRolls((visible) => !visible)}
            className={cn('room-chat-composer-v3__icon-button', showMobileQuickRolls && 'room-chat-composer-v3__icon-button--active')}
            title={showMobileQuickRolls ? '收起快捷检定' : '展开快捷检定'}
            aria-label={showMobileQuickRolls ? '收起快捷检定' : '展开快捷检定'}
            aria-expanded={showMobileQuickRolls}
          >
            <Dice5 size={16} />
          </button>
        )}
        {!isMobile && !canUseKPTools && (
          <button
            type="button"
            className="room-chat-composer-v3__dice-command"
            onClick={insertDiceCommand}
            disabled={!connected}
            title="输入骰子指令"
            aria-label="输入骰子指令"
          >
            <Dice5 size={16} />
            <span>投骰</span>
          </button>
        )}
        {hasPrivateTargets && (
          <select
            className={cn('room-chat-composer-v3__target', sendTargetUserId !== 'public' && 'room-chat-composer-v3__target--private')}
            value={sendTargetUserId}
            onChange={(event) => onSendTargetChange(event.target.value)}
            disabled={!connected}
            aria-label="发送对象"
            title="发送对象"
          >
            <option value="public">公开</option>
            {privateTargets.map((target) => (
              <option key={target.userId} value={target.userId}>
                私聊：{target.label}
              </option>
            ))}
          </select>
        )}
        <MentionInput
          value={value}
          onChange={onChange}
          members={members.map((member) => ({ userId: member.userId, nickname: member.nickname }))}
          onSubmit={onSubmit}
          placeholder={connected ? (canUseKPTools ? '主持场景、输入剧情描述或骰点指令...' : '记录调查、回应 KP、输入 /骰...') : '正在连接房间...'}
          disabled={!connected}
        />
        <button
          type="submit"
          className="room-chat-composer-v3__send-button room-send-ritual-button"
          disabled={!connected}
          aria-label="发送消息"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  );
}
