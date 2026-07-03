import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDreamingOraclePhase,
  getOracleCandidateSlots,
  getOracleRarityMeta,
} from '../src/components/dreaming/dreamingOracleMeta.ts';

test('oracle phase describes an available nightly draw', () => {
  assert.deepEqual(getDreamingOraclePhase({ canDraw: true, hasTodayDraw: false, candidateCount: 0, isRevealed: false, isDeepRevealed: false }), {
    key: 'ready',
    title: '今晚可入梦',
    prompt: '三枚封印尚未点亮，深渊牌阵正在等待第一次触碰。',
    actionLabel: '开启梦境牌阵',
  });
});

test('oracle phase prioritizes candidate selection before reveal states', () => {
  assert.deepEqual(getDreamingOraclePhase({ canDraw: true, hasTodayDraw: false, candidateCount: 3, isRevealed: false, isDeepRevealed: false }), {
    key: 'selecting',
    title: '三牌悬停',
    prompt: '选择一张暗牌，让今日梦境坠入固定轨道。',
    actionLabel: '选择你的牌',
  });
});

test('oracle candidate slots fan three cards into a ritual spread', () => {
  assert.deepEqual(getOracleCandidateSlots([
    { key: 'a', rarity: 'common' },
    { key: 'b', rarity: 'epic' },
    { key: 'c', rarity: 'legendary' },
  ], 'b'), [
    { key: 'a', rarity: 'common', label: '左手封印', translateY: 18, rotate: -9, selected: false },
    { key: 'b', rarity: 'epic', label: '潮汐主位', translateY: -10, rotate: 0, selected: true },
    { key: 'c', rarity: 'legendary', label: '右手封印', translateY: 18, rotate: 9, selected: false },
  ]);
});

test('legendary cards receive solemn ceremony metadata', () => {
  assert.deepEqual(getOracleRarityMeta('legendary'), {
    label: '传说',
    seal: 'V',
    tone: 'legendary',
    accent: '辉金封缄',
  });
});
