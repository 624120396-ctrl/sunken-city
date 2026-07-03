import assert from 'node:assert/strict';
import test from 'node:test';
import { getScenarioCardMeta, getSoloLaunchState } from '../src/components/story/storyEntryMeta.ts';

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

test('solo launch state explains the next required selection', () => {
  assert.deepEqual(getSoloLaunchState({ hasScenario: false, hasCharacter: false, starting: false }), {
    disabled: true,
    label: '选择剧本',
  });
  assert.deepEqual(getSoloLaunchState({ hasScenario: true, hasCharacter: false, starting: false }), {
    disabled: true,
    label: '选择调查员',
  });
  assert.deepEqual(getSoloLaunchState({ hasScenario: true, hasCharacter: true, starting: true }), {
    disabled: true,
    label: '启动中...',
  });
  assert.deepEqual(getSoloLaunchState({ hasScenario: true, hasCharacter: true, starting: false }), {
    disabled: false,
    label: '开始调查',
  });
});
