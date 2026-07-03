import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRankLadderItems,
  getRankProgressSummary,
  getTitleCollectionSummary,
} from '../src/components/rank-title/rankTitleMeta.ts';

const ranks = [
  { id: 'r1', level: 1, expRequired: 0, name: '海岸漫步者', color: '#c9a227', icon: 'I' },
  { id: 'r2', level: 2, expRequired: 100, name: '潮声记录者', color: '#4db8b8', icon: 'II' },
  { id: 'r3', level: 3, expRequired: 260, name: '深海聆听者', color: '#8b2635', icon: 'III' },
];

test('rank progress summary keeps current next and remaining order', () => {
  assert.deepEqual(
    getRankProgressSummary({
      currentRank: ranks[1],
      nextRank: ranks[2],
      exp: 150,
      expToNext: 110,
    }).map((item) => [item.key, item.label, item.value, item.tone]),
    [
      ['current', '当前位阶', '潮声记录者', 'gold'],
      ['next', '下一位阶', '深海聆听者', 'ocean'],
      ['remaining', '还需灵魂碎片', 110, 'blood'],
    ],
  );
});

test('rank ladder items mark current unlocked and locked states', () => {
  assert.deepEqual(
    getRankLadderItems({
      ranks,
      currentLevel: 2,
      exp: 150,
      selectedLevel: 3,
    }).map((item) => [item.level, item.current, item.locked, item.selected]),
    [
      [1, false, false, false],
      [2, true, false, false],
      [3, false, true, true],
    ],
  );
});

test('title collection summary reports unlocked displayed and hidden counts', () => {
  assert.deepEqual(
    getTitleCollectionSummary({
      total: 8,
      unlocked: 3,
      displayed: true,
      hidden: 2,
    }),
    [
      { key: 'unlocked', label: '已解锁', value: 3, tone: 'gold' },
      { key: 'progress', label: '收集进度', value: '38%', tone: 'ocean' },
      { key: 'displayed', label: '展示印记', value: 1, tone: 'gold' },
      { key: 'hidden', label: '隐藏印记', value: 2, tone: 'blood' },
    ],
  );
});
