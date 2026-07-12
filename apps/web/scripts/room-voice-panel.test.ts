import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRoomVoiceConnectionLabel,
  resolveRoomVoiceFallback,
  summarizeRoomVoiceParticipants,
} from '../src/pages/rooms/components/roomVoiceMeta.ts';

test('room voice panel keeps unavailable voice as a text fallback state', () => {
  const fallback = resolveRoomVoiceFallback(new Error('房间语音服务尚未完成部署配置'));

  assert.equal(fallback.tone, 'error');
  assert.equal(fallback.message, '语音暂不可用，请继续使用文字聊天和骰点。');
});

test('room voice panel summarizes speakers before silent listeners', () => {
  const summary = summarizeRoomVoiceParticipants([
    { identity: 'a', name: '阿宁', isSpeaking: false },
    { identity: 'b', name: '老吴', isSpeaking: true },
    { identity: 'c', name: '白船', isSpeaking: false },
  ]);

  assert.equal(summary.count, 3);
  assert.deepEqual(summary.speakers, ['老吴']);
  assert.deepEqual(summary.listeners, ['阿宁', '白船']);
});

test('room voice connection labels are explicit for reconnecting and disconnected states', () => {
  assert.equal(resolveRoomVoiceConnectionLabel('connected'), '已连接');
  assert.equal(resolveRoomVoiceConnectionLabel('reconnecting'), '正在重连');
  assert.equal(resolveRoomVoiceConnectionLabel('disconnected'), '未连接');
});
