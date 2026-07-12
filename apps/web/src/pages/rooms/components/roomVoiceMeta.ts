export function resolveRoomVoiceFallback(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return {
    tone: 'error' as const,
    message: message.includes('权限')
      ? '你没有加入此房间语音频道的权限。'
      : '语音暂不可用，请继续使用文字聊天和骰点。',
  };
}

export function resolveRoomVoiceConnectionLabel(state: string) {
  if (state === 'connected') return '已连接';
  if (state === 'connecting') return '连接中';
  if (state === 'reconnecting') return '正在重连';
  return '未连接';
}

export function summarizeRoomVoiceParticipants(
  participants: Array<{ identity: string; name?: string; isSpeaking?: boolean }>
) {
  const names = participants.map((participant) => ({
    name: participant.name || participant.identity,
    isSpeaking: Boolean(participant.isSpeaking),
  }));

  return {
    count: names.length,
    speakers: names.filter((participant) => participant.isSpeaking).map((participant) => participant.name),
    listeners: names.filter((participant) => !participant.isSpeaking).map((participant) => participant.name),
  };
}
