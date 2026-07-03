import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDreamArchiveCardMeta,
  getDreamHistoryMeta,
  getDreamArchiveSummary,
} from '../src/components/dreaming/dreamingArchiveMeta.ts';

test('unlocked archive cards display their name and draw count', () => {
  assert.deepEqual(getDreamArchiveCardMeta({ key: 'fog', name: '雾中来客', rarity: 'rare', unlocked: true, drawCount: 3 }), {
    title: '雾中来客',
    subtitle: '已抽中 3 次',
    lockLabel: '已归档',
    seal: 'II',
    rarityLabel: '稀有',
    tone: 'rare',
  });
});

test('locked archive cards keep a sealed dossier presentation', () => {
  assert.deepEqual(getDreamArchiveCardMeta({ key: 'crown', name: '溺王冠冕', rarity: 'legendary', unlocked: false, drawCount: 0 }), {
    title: '封存牌面',
    subtitle: '等待梦境解锁',
    lockLabel: '未解锁',
    seal: 'V',
    rarityLabel: '传说',
    tone: 'legendary',
  });
});

test('deep history entries receive the strongest ledger state', () => {
  assert.deepEqual(getDreamHistoryMeta({ position: 'reversed', isRevealed: true, isDeepRevealed: true }), {
    positionLabel: '逆位',
    statusLabel: '深层封缄',
    statusTone: 'deep',
    seal: 'III',
  });
});

test('archive summary reports unlocked and sealed cards', () => {
  assert.deepEqual(getDreamArchiveSummary([
    { unlocked: true },
    { unlocked: false },
    { unlocked: true },
  ]), {
    unlocked: 2,
    sealed: 1,
    total: 3,
    progressLabel: '2/3 已记录',
  });
});
