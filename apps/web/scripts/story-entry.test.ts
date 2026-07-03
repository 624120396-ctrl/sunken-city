import assert from 'node:assert/strict';
import test from 'node:test';
import { getScenarioCardMeta } from '../src/components/story/storyEntryMeta.ts';

test('scenario card meta normalizes difficulty duration and visible tags', () => {
  assert.deepEqual(
    getScenarioCardMeta({
      difficulty: 'hard',
      estimatedDuration: 90,
      tags: '调查, 深海 , 仪式, 追逐, 第五项',
    }),
    {
      difficultyLabel: 'hard',
      durationLabel: '90 分钟',
      tags: ['调查', '深海', '仪式', '追逐'],
      tone: 'blood',
    }
  );
});
